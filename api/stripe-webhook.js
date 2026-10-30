
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Stripe needs the original request body to verify the signature.
export const config = {
  api: {
    bodyParser: false
  }
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    if (
      !process.env.STRIPE_SECRET_KEY ||
      !process.env.STRIPE_WEBHOOK_SECRET ||
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("A required environment variable is missing.");

      return res.status(500).json({
        error: "Server configuration is incomplete"
      });
    }

    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).json({
        error: "Missing Stripe signature"
      });
    }

    const rawBody = await getRawBody(req);

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const isCompleted = event.type === "checkout.session.completed";
    const isAsyncPaid =
      event.type === "checkout.session.async_payment_succeeded";

    if (!isCompleted && !isAsyncPaid) {
      return res.status(200).json({
        received: true,
        ignored: true
      });
    }

    const session = event.data.object;

    // Do not mark an unpaid Checkout Session as paid.
    if (isCompleted && session.payment_status !== "paid") {
      return res.status(200).json({
        received: true,
        paymentPending: true
      });
    }

    const orderId =
      session.metadata?.order_id ||
      session.client_reference_id;

    if (!orderId) {
      console.error("Stripe session has no order ID:", session.id);

      return res.status(400).json({
        error: "Order ID not found in Stripe session"
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const { data, error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        payment_reference: session.id,
        order_status: "new",
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Supabase order update failed:", error.message);

      return res.status(500).json({
        error: "Failed to update order"
      });
    }

    if (!data) {
      console.error("Order not found in Supabase:", orderId);

      // Return an error so Stripe can retry after the order is fixed.
      return res.status(500).json({
        error: "Order not found in Supabase",
        orderId
      });
    }

    console.log("Order marked as paid:", orderId);

    return res.status(200).json({
      received: true,
      orderId,
      paymentStatus: "paid"
    });
  } catch (error) {
    console.error("Stripe webhook error:", error.message);

    return res.status(400).json({
      error: "Webhook verification or processing failed"
    });
  }
}
