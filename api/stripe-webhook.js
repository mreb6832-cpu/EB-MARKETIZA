// api/stripe-webhook.js

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).json({
        error: "Missing Stripe signature"
      });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(500).json({
        error: "STRIPE_WEBHOOK_SECRET is not configured"
      });
    }

    const rawBody = await getRawBody(req);

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const orderId =
        session.metadata?.order_id ||
        session.client_reference_id;

      if (!orderId) {
        return res.status(400).json({
          error: "Order ID not found in Stripe session"
        });
      }

      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          payment_reference: session.id,
          order_status: "new"
        })
        .eq("id", orderId);

      if (error) {
        console.error(
          "Supabase order update error:",
          error
        );

        return res.status(500).json({
          error: "Failed to update order"
        });
      }

      console.log(
        `Order ${orderId} marked as paid`
      );
    }

    return res.status(200).json({
      received: true
    });

  } catch (error) {
    console.error(
      "Stripe Webhook Error:",
      error
    );

    return res.status(400).json({
      error:
        error.message ||
        "Webhook verification failed"
    });
  }
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";

    req.setEncoding("utf8");

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      resolve(data);
    });

    req.on("error", reject);
  });
}
