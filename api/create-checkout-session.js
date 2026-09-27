import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Only POST is allowed
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { items } = req.body || {};

    // Check cart items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "No items provided"
      });
    }

    // Create Stripe line items
    const lineItems = items.map((item) => {
      const price = Number(item.price);
      const quantity = Number(item.quantity);

      if (
        !item.name ||
        !Number.isFinite(price) ||
        price <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw new Error("Invalid product information");
      }

      return {
        price_data: {
          currency: "sek",

          product_data: {
            name: String(item.name)
          },

          unit_amount: Math.round(price * 100)
        },

        quantity
      };
    });

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "https://ebshop.vercel.app";

    // Create Stripe Checkout Session
    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        line_items: lineItems,

        success_url:
          `${frontendUrl}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${frontendUrl}/payment.html`
      });

    return res.status(200).json({
      url: session.url
    });

  } catch (error) {

    console.error("Stripe checkout error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Unable to create Stripe checkout session"
    });
  }
}
