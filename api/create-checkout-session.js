import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: "STRIPE_SECRET_KEY is not configured"
      });
    }

    const { items, orderId } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "No items provided"
      });
    }

    if (!orderId) {
      return res.status(400).json({
        error: "Order ID is required"
      });
    }

    const line_items = items.map((item) => {
      const name = String(
        item.name || "EB-MARKETIZA Product"
      );

      const price = Number(item.price);
      const quantity = Number(item.quantity);

      if (!Number.isFinite(price) || price < 0) {
        throw new Error(
          `Invalid price for product: ${name}`
        );
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error(
          `Invalid quantity for product: ${name}`
        );
      }

      return {
        price_data: {
          currency: "sek",

          product_data: {
            name: name
          },

          unit_amount: Math.round(price * 100)
        },

        quantity: quantity
      };
    });

    /*
      IMPORTANT:
      Use the real EB-MARKETIZA Vercel URL directly.
      This prevents a wrong FRONTEND_URL environment
      variable such as ".vercel.ap" from breaking redirect.
    */

    const frontendUrl =
      "https://ebmarketiza.vercel.app";

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        managed_payments: {
          enabled: false
        },

        line_items: line_items,

        client_reference_id: orderId,

        metadata: {
          order_id: orderId
        },

        success_url:
          `${frontendUrl}/payment.html?success=true&order_id=${encodeURIComponent(orderId)}`,

        cancel_url:
          `${frontendUrl}/payment.html?canceled=true&order_id=${encodeURIComponent(orderId)}`
      });

    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
      orderId: orderId
    });

  } catch (error) {
    console.error(
      "Stripe Checkout Error:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Stripe checkout failed"
    });
  }
}
