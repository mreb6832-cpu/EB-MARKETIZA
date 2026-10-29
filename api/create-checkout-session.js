const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://ebmarketiza.vercel.app"
  );
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is missing");
    }

    if (!process.env.SUPABASE_URL) {
      throw new Error("SUPABASE_URL is missing");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
    }

    const { orderId, currency = "SEK" } = req.body || {};

    if (!orderId) {
      return res.status(400).json({
        error: "orderId is required"
      });
    }

    const allowedCurrencies = ["SEK", "EUR", "USD"];
    const selectedCurrency = String(currency).toUpperCase();

    if (!allowedCurrencies.includes(selectedCurrency)) {
      return res.status(400).json({
        error: "Unsupported currency"
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total, payment_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        error: "Order not found"
      });
    }

    if (order.payment_status === "paid") {
      return res.status(400).json({
        error: "This order has already been paid."
      });
    }

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select(
        "product_name, quantity, unit_price, total_price"
      )
      .eq("order_id", orderId);

    if (itemsError) {
      throw itemsError;
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        error: "No items found for this order."
      });
    }

    const line_items = items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);

      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Invalid item quantity.");
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error("Invalid item price.");
      }

      return {
        quantity,
        price_data: {
          currency: selectedCurrency.toLowerCase(),
          product_data: {
            name: item.product_name
          },
          unit_amount: Math.round(unitPrice * 100)
        }
      };
    });

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "https://ebmarketiza.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,

      success_url:
        `${frontendUrl}/account.html?payment=success&order_id=${encodeURIComponent(orderId)}`,

      cancel_url:
        `${frontendUrl}/payment.html?payment=cancelled&order_id=${encodeURIComponent(orderId)}`,

      metadata: {
        order_id: String(orderId)
      },

      billing_address_collection: "auto"
    });

    return res.status(200).json({
      url: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Unable to create Stripe Checkout session."
    });
  }
};
