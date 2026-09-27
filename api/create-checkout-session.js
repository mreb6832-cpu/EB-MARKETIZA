import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed"
      });
    }

    const { items } = req.body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "No items provided"
      });
    }

    const lineItems = items.map((item) => ({
      price_data: {
        currency: "sek",
        product_data: {
          name: item.name
        },
        unit_amount: Math.round(Number(item.price) * 100)
      },
      quantity: Number(item.quantity) || 1
    }));

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "https://ebshop.vercel.app";

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        line_items: lineItems,

        success_url:
          `${frontendUrl}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${frontendUrl}/payment.html`,

        shipping_address_collection: {
          allowed_countries: ["SE"]
        },

        metadata: {
          store: "EB SHOP"
        }
      });

    return res.status(200).json({
      url: session.url
    });

  } catch (error) {

    console.error("Stripe error:", error);

    return res.status(500).json({
      error: error.message || "Stripe checkout failed"
    });
  }
}
