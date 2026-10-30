import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Stripe needs the original request body
// to verify the webhook signature.
export const config = {
  api: {
    bodyParser: false
  }
};

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(
        Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk)
      );
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", reject);
  });
}

export default async function handler(req, res) {

  // ----------------------------------------------------------
  // METHOD
  // ----------------------------------------------------------

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    // --------------------------------------------------------
    // ENVIRONMENT VARIABLES
    // --------------------------------------------------------

    if (
      !process.env.STRIPE_SECRET_KEY ||
      !process.env.STRIPE_WEBHOOK_SECRET ||
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error(
        "A required environment variable is missing."
      );

      return res.status(500).json({
        error: "Server configuration is incomplete"
      });
    }

    // --------------------------------------------------------
    // STRIPE SIGNATURE
    // --------------------------------------------------------

    const signature =
      req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).json({
        error: "Missing Stripe signature"
      });
    }

    // --------------------------------------------------------
    // RAW BODY
    // --------------------------------------------------------

    const rawBody =
      await getRawBody(req);

    // --------------------------------------------------------
    // VERIFY STRIPE EVENT
    // --------------------------------------------------------

    const event =
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

    // --------------------------------------------------------
    // ONLY PROCESS SUCCESSFUL PAYMENTS
    // --------------------------------------------------------

    const isCompleted =
      event.type ===
      "checkout.session.completed";

    const isAsyncPaid =
      event.type ===
      "checkout.session.async_payment_succeeded";

    if (!isCompleted && !isAsyncPaid) {
      return res.status(200).json({
        received: true,
        ignored: true
      });
    }

    const session =
      event.data.object;

    // For normal Checkout payments,
    // make sure Stripe says the payment is actually paid.
    if (
      isCompleted &&
      session.payment_status !== "paid"
    ) {
      return res.status(200).json({
        received: true,
        paymentPending: true
      });
    }

    // --------------------------------------------------------
    // ORDER ID
    // --------------------------------------------------------

    const orderId =
      session.metadata?.order_id ||
      session.client_reference_id;

    if (!orderId) {
      console.error(
        "Stripe session has no order ID:",
        session.id
      );

      return res.status(400).json({
        error:
          "Order ID not found in Stripe session"
      });
    }

    // --------------------------------------------------------
    // SUPABASE SERVER CLIENT
    // --------------------------------------------------------

    const supabase =
      createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        }
      );

    // --------------------------------------------------------
    // COMPLETE ORDER + REDUCE STOCK
    // --------------------------------------------------------
    //
    // This RPC performs everything inside
    // one database transaction:
    //
    // 1. Checks whether order was already paid
    // 2. Locks products
    // 3. Checks stock
    // 4. Reduces stock
    // 5. Marks order as paid
    // 6. Removes purchased items from cart
    //
    // This prevents duplicate webhook deliveries
    // from reducing stock twice.
    // --------------------------------------------------------

    const {
      data,
      error
    } =
      await supabase.rpc(
        "complete_paid_order",
        {
          p_order_id: orderId
        }
      );

    if (error) {
      console.error(
        "Order completion failed:",
        error.message
      );

      return res.status(500).json({
        error:
          "Failed to complete paid order"
      });
    }

    console.log(
      "Paid order processed:",
      orderId,
      data
    );

    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    return res.status(200).json({
      received: true,
      orderId,
      paymentStatus: "paid",
      result: data
    });

  } catch (error) {

    console.error(
      "Stripe webhook error:",
      error.message
    );

    return res.status(400).json({
      error:
        "Webhook verification or processing failed"
    });
  }
}
