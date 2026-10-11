
import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const FRONTEND_URL = (
  process.env.FRONTEND_URL ||
  "https://ebmarketiza.vercel.app"
).replace(/\/+$/, "");

async function supabaseRequest(path) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${path}`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization:
          `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: "application/json"
      }
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase ${response.status}: ${text}`
    );
  }

  return text ? JSON.parse(text) : [];
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  if (
    !process.env.STRIPE_SECRET_KEY ||
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error(
      "Missing server environment variables"
    );

    return res.status(500).json({
      success: false,
      error: "Payment server configuration error"
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    const orderId = body?.orderId;

    if (
      typeof orderId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)
    ) {
      return res.status(400).json({
        success: false,
        error: "A valid orderId is required"
      });
    }

    // Find the existing order.
    const orders = await supabaseRequest(
      `orders?id=eq.${encodeURIComponent(orderId)}&select=id,payment_status,customer_email&limit=1`
    );

    const order = orders[0];

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    // Never start another checkout for an already-paid order.
    if (order.payment_status === "paid") {
      return res.status(409).json({
        success: false,
        error: "This order is already paid"
      });
    }

    if (order.payment_status !== "pending") {
      return res.status(409).json({
        success: false,
        error: "This order is not awaiting payment"
      });
    }

    // Read item names and prices from the database,
    // not from values submitted by the browser.
    const orderItems = await supabaseRequest(
      `order_items?order_id=eq.${encodeURIComponent(orderId)}&select=product_name,quantity,unit_price`
    );

    if (!orderItems.length) {
      return res.status(400).json({
        success: false,
        error: "No items were found for this order"
      });
    }

    const lineItems = orderItems.map((item) => {
      const quantity = Number(item.quantity);
      const price = Number(item.unit_price);

      if (
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        !Number.isFinite(price) ||
        price <= 0 ||
        !item.product_name
      ) {
        throw new Error(
          "An order item has invalid price or quantity"
        );
      }

      const unitAmount = Math.round(price * 100);

      if (
        !Number.isSafeInteger(unitAmount) ||
        unitAmount < 1
      ) {
        throw new Error(
          "An order item has an invalid SEK amount"
        );
      }

      return {
        quantity,
        price_data: {
          currency: "sek",
          unit_amount: unitAmount,
          product_data: {
            name: String(item.product_name).slice(0, 200)
          }
        }
      };
    });

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,

        client_reference_id: orderId,

        metadata: {
          order_id: orderId
        },

        payment_intent_data: {
          metadata: {
            order_id: orderId
          }
        },

        ...(order.customer_email
          ? { customer_email: order.customer_email }
          : {}),

        // Collect a Swedish shipping address in Stripe.
        shipping_address_collection: {
          allowed_countries: ["SE"]
        },

        // Disable Managed Payments to avoid its
        // product tax-code requirement, if supported
        // by your Stripe account/API configuration.
        managed_payments: {
          enabled: false
        },

        success_url:
          `${FRONTEND_URL}/payment.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${FRONTEND_URL}/payment.html?payment=cancelled&order_id=${encodeURIComponent(orderId)}`
      });

    if (!session.url) {
      throw new Error(
        "Stripe did not return a checkout URL"
      );
    }

    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
      orderId
    });
  } catch (error) {
    console.error(
      "Create checkout session failed:",
      error.message
    );

    return res.status(500).json({
      success: false,
      error: "Could not start payment. Check server logs."
    });
  }
}
