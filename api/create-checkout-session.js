import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    // Check Stripe secret key
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: "STRIPE_SECRET_KEY is not configured"
      });
    }

    // Read request body
    const { items } = req.body || {};

    // Check products
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "No items provided"
      });
    }

    // Convert cart items to Stripe line items
    const line_items = items.map((item) => {
      const name = String(item.name || "EB-MARKETIZA Product");

      const price = Number(item.price);
      const quantity = Number(item.quantity);

      if (!Number.isFinite(price) || price < 0) {
        throw new Error(`Invalid price for product: ${name}`);
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error(`Invalid quantity for product: ${name}`);
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

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: line_items,

      success_url:
        "https://mreb6832-cpu.github.io/EB-MARKETIZA/payment.html?success=true",

      cancel_url:
        "https://mreb6832-cpu.github.io/EB-MARKETIZA/payment.html?canceled=true"
    });

    // Return JSON to frontend
    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error("Stripe Checkout Error:", error);

    return res.status(500).json({
      error: error.message || "Stripe checkout failed"
    });
  }
}
