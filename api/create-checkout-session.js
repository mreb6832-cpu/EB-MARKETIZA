
import Stripe from "stripe";

export const config = {
  api: {
    bodyParser: false
  }
};

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk)
    );
  }

  return Buffer.concat(chunks);
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization:
          `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        ...options.headers
      }
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase error ${response.status}: ${text}`
    );
  }

  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send(
      "Method not allowed"
    );
  }

  if (
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_WEBHOOK_SECRET ||
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error(
      "Webhook environment variables are missing"
    );

    return res.status(500).send(
      "Server configuration error"
    );
  }

  let event;

  try {
    const rawBody = await readRawBody(req);
    const signature =
      req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error(
      "Stripe signature verification failed:",
      error.message
    );

    return res.status(400).send(
      "Invalid webhook signature"
    );
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return res.status(200).json({
      received: true,
      ignored: true
    });
  }

  try {
    const session = event.data.object;

    if (session.payment_status !== "paid") {
      return res.status(200).json({
        received: true,
        paymentNotCompleted: true
      });
    }

    const orderId =
      session.metadata?.order_id ||
      session.client_reference_id;

    if (!orderId) {
      throw new Error(
        "Checkout Session has no order ID"
      );
    }

    // Prevent processing the same paid session twice.
    const existingPayment = await supabaseRequest(
      `orders?payment_reference=eq.${encodeURIComponent(session.id)}&select=id`
    );

    if (
      Array.isArray(existingPayment) &&
      existingPayment.length > 0
    ) {
      return res.status(200).json({
        received: true,
        alreadyProcessed: true
      });
    }

    const lineItems =
      await stripe.checkout.sessions.listLineItems(
        session.id,
        {
          limit: 100,
          expand: ["data.price.product"]
        }
      );

    const items = lineItems.data.map((line) => {
      const product =
        line.price?.product;

      const productMetadata =
        product &&
        typeof product === "object" &&
        !product.deleted
          ? product.metadata
          : {};

      const quantity = line.quantity || 1;
      const unitPrice =
        (line.amount_subtotal || 0) /
        100 /
        quantity;

      const item = {
        order_id: orderId,
        product_name:
          line.description || "EB-MARKETIZA Product",
        quantity,
        unit_price: unitPrice,
        total_price:
          (line.amount_subtotal || 0) / 100
      };

      const productId =
        productMetadata?.product_id;

      // Only include a valid UUID when available.
      if (
        typeof productId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)
      ) {
        item.product_id = productId;
      }

      return item;
    });

    const shipping =
      session.shipping_details ||
      session.collected_information?.shipping_details;

    const address =
      shipping?.address ||
      session.customer_details?.address ||
      {};

    const customerName =
      shipping?.name ||
      session.customer_details?.name ||
      null;

    const email =
      session.customer_details?.email ||
      session.customer_email ||
      null;

    const phone =
      session.customer_details?.phone ||
      null;

    const subtotal = items.reduce(
      (sum, item) => sum + item.total_price,
      0
    );

    const total =
      (session.amount_total || 0) / 100;

    const orderPayload = {
      id: orderId,
      order_number:
        `EB-${session.id.slice(-12).toUpperCase()}`,
      customer_name: customerName,
      customer_email: email,
      customer_phone: phone,
      street: address.line1 || null,
      house_number: null,
      apartment: address.line2 || null,
      postal_code: address.postal_code || null,
      city: address.city || null,
      country: address.country || "SE",
      subtotal,
      delivery_fee: Math.max(0, total - subtotal),
      total,
      payment_status: "paid",
      order_status: "processing",
      payment_reference: session.id,
      notes: null
    };

    // Update an existing pending order, or create it.
    const existingOrder = await supabaseRequest(
      `orders?id=eq.${encodeURIComponent(orderId)}&select=id`
    );

    if (
      Array.isArray(existingOrder) &&
      existingOrder.length > 0
    ) {
      const updatePayload = {
        payment_status: "paid",
        payment_reference: session.id,
        order_status: "processing",
        subtotal,
        delivery_fee: Math.max(0, total - subtotal),
        total,
        updated_at: new Date().toISOString()
      };

      if (customerName) {
        updatePayload.customer_name = customerName;
      }
      if (email) {
        updatePayload.customer_email = email;
      }
      if (phone) {
        updatePayload.customer_phone = phone;
      }
      if (address.line1) {
        updatePayload.street = address.line1;
      }
      if (address.postal_code) {
        updatePayload.postal_code = address.postal_code;
      }
      if (address.city) {
        updatePayload.city = address.city;
      }
      if (address.country) {
        updatePayload.country = address.country;
      }
      if (address.line2) {
        updatePayload.apartment = address.line2;
      }

      await supabaseRequest(
        `orders?id=eq.${encodeURIComponent(orderId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(updatePayload)
        }
      );
    } else {
      await supabaseRequest("orders", {
        method: "POST",
        headers: {
          Prefer: "return=minimal"
        },
        body: JSON.stringify(orderPayload)
      });
    }

    // Insert purchased items after saving the order.
    if (items.length > 0) {
      await supabaseRequest("order_items", {
        method: "POST",
        headers: {
          Prefer: "return=minimal"
        },
        body: JSON.stringify(items)
      });
    }

    console.log(
      "Paid order saved:",
      orderId
    );

    return res.status(200).json({
      received: true,
      orderId
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing failed:",
      error.message
    );

    return res.status(500).json({
      error: "Order processing failed"
    });
  }
}
