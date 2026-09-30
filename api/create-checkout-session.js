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

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "No items provided"
      });
    }

    const line_items = items.map((item) => ({
      price_data: {
        currency: "sek",
        product_data: {
          name: item.name || "E&B SHOP Product"
        },
        unit_amount: Math.round(Number(item.price) * 100)
      },
      quantity: Math.max(1, Number(item.quantity) || 1)
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,

      success_url:
        `${process.env.FRONTEND_URL}/payment.html?success=true`,

      cancel_url:
        `${process.env.FRONTEND_URL}/payment.html?canceled=true`
    });

    return res.status(200).json({
      url: session.url,
      id: session.id
    });

  } catch (error) {
    console.error("Stripe error:", error);

    return res.status(500).json({
      error: error.message || "Stripe checkout failed"
    });
  }
}
