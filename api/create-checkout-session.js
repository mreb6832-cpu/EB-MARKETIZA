const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// FALLBACK EXCHANGE RATES
// 1 SEK = X target currency
// ============================================================

const FALLBACK_RATES = {
  SEK: 1,
  EUR: 0.087,
  USD: 0.10,
  GBP: 0.075,
  NOK: 0.95,
  DKK: 0.65,
  CHF: 0.086,
  PLN: 0.37,
  CZK: 2.20,
  ISK: 13.5,
  HUF: 34,
  RON: 0.43,
  BGN: 0.17,
  CAD: 0.14,
  AUD: 0.15,
  NZD: 0.17,
  JPY: 15,
  CNY: 0.72,
  INR: 8.5,
  BRL: 0.53,
  ZAR: 1.75,
  AED: 0.37,
  SAR: 0.38,
  TRY: 4.2
};

// ============================================================
// COUNTRY → CURRENCY
// ============================================================

const COUNTRY_CURRENCY = {
  SE: "SEK",

  AT: "EUR",
  BE: "EUR",
  CY: "EUR",
  EE: "EUR",
  FI: "EUR",
  FR: "EUR",
  DE: "EUR",
  GR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LV: "EUR",
  LT: "EUR",
  LU: "EUR",
  MT: "EUR",
  NL: "EUR",
  PT: "EUR",
  SK: "EUR",
  SI: "EUR",
  ES: "EUR",
  HR: "EUR",

  NO: "NOK",
  DK: "DKK",
  IS: "ISK",

  GB: "GBP",
  CH: "CHF",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  BG: "BGN",
  TR: "TRY",

  US: "USD",
  CA: "CAD",

  AU: "AUD",
  NZ: "NZD",

  JP: "JPY",
  CN: "CNY",
  IN: "INR",

  BR: "BRL",

  ZA: "ZAR",
  AE: "AED",
  SA: "SAR"
};

// ============================================================
// CURRENCIES SUPPORTED BY STRIPE
// ============================================================

const ALLOWED_CURRENCIES = [
  "SEK",
  "EUR",
  "USD",
  "GBP",
  "NOK",
  "DKK",
  "CHF",
  "PLN",
  "CZK",
  "ISK",
  "HUF",
  "RON",
  "BGN",
  "CAD",
  "AUD",
  "NZD",
  "JPY",
  "CNY",
  "INR",
  "BRL",
  "ZAR",
  "AED",
  "SAR",
  "TRY"
];

// ============================================================
// GET LIVE SEK EXCHANGE RATES
// ============================================================

async function getExchangeRates() {
  try {
    const response = await fetch(
      "https://open.er-api.com/v6/latest/SEK"
    );

    if (!response.ok) {
      throw new Error(
        `Exchange-rate server returned HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (
      data &&
      data.result === "success" &&
      data.rates
    ) {
      return {
        ...FALLBACK_RATES,
        ...data.rates,
        SEK: 1
      };
    }

    throw new Error("Invalid exchange-rate response.");
  } catch (error) {
    console.error(
      "Exchange-rate request failed. Using fallback rates.",
      error
    );

    return {
      ...FALLBACK_RATES
    };
  }
}

// ============================================================
// CONVERT SEK → TARGET CURRENCY
// ============================================================

function convertFromSEK(
  amountSEK,
  currency,
  rates
) {
  const amount = Number(amountSEK);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid SEK amount.");
  }

  const rate =
    Number(rates[currency]);

  if (
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    throw new Error(
      `Exchange rate for ${currency} is unavailable.`
    );
  }

  return amount * rate;
}

// ============================================================
// STRIPE MINOR UNIT
// ============================================================
//
// Most currencies use 2 decimal places.
// JPY, ISK and HUF are treated as zero-decimal currencies
// for Stripe.
// ============================================================

function toStripeMinorUnit(
  amount,
  currency
) {
  const zeroDecimalCurrencies = [
    "JPY",
    "ISK",
    "HUF"
  ];

  if (
    zeroDecimalCurrencies.includes(
      currency
    )
  ) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
}

// ============================================================
// COUNTRY CURRENCY
// ============================================================

function getCurrencyFromCountry(
  countryCode
) {
  const code =
    String(
      countryCode || ""
    ).toUpperCase();

  return (
    COUNTRY_CURRENCY[code] ||
    "SEK"
  );
}

// ============================================================
// MAIN VERCEL FUNCTION
// ============================================================

module.exports = async function handler(
  req,
  res
) {

  // ----------------------------------------------------------
  // CORS
  // ----------------------------------------------------------

  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://ebmarketiza.vercel.app"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );


  if (req.method === "OPTIONS") {
    return res
      .status(204)
      .end();
  }


  if (req.method !== "POST") {
    return res
      .status(405)
      .json({
        error:
          "Method not allowed"
      });
  }


  try {

    // --------------------------------------------------------
    // ENVIRONMENT VARIABLES
    // --------------------------------------------------------

    if (
      !process.env.STRIPE_SECRET_KEY
    ) {
      throw new Error(
        "STRIPE_SECRET_KEY is missing"
      );
    }


    if (
      !process.env.SUPABASE_URL
    ) {
      throw new Error(
        "SUPABASE_URL is missing"
      );
    }


    if (
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is missing"
      );
    }


    // --------------------------------------------------------
    // REQUEST BODY
    // --------------------------------------------------------

    const body =
      req.body || {};


    const orderId =
      body.orderId;


    const requestedCurrency =
      body.currency;


    const countryCode =
      body.countryCode;


    if (!orderId) {
      return res
        .status(400)
        .json({
          error:
            "orderId is required"
        });
    }


    // --------------------------------------------------------
    // DETERMINE CUSTOMER CURRENCY
    // --------------------------------------------------------

    let selectedCurrency =
      String(
        requestedCurrency || ""
      ).toUpperCase();


    // Country is authoritative when supplied.
    // This prevents a customer from accidentally getting
    // the wrong currency.
    if (countryCode) {

      const countryCurrency =
        getCurrencyFromCountry(
          countryCode
        );

      selectedCurrency =
        countryCurrency;
    }


    if (
      !ALLOWED_CURRENCIES.includes(
        selectedCurrency
      )
    ) {

      selectedCurrency =
        "SEK";
    }


    // --------------------------------------------------------
    // GET ORDER
    // --------------------------------------------------------

    const {
      data: order,
      error: orderError
    } =
      await supabase
        .from("orders")
        .select(
          "id, total, payment_status"
        )
        .eq(
          "id",
          orderId
        )
        .single();


    if (
      orderError ||
      !order
    ) {

      console.error(
        "Order lookup error:",
        orderError
      );

      return res
        .status(404)
        .json({
          error:
            "Order not found"
        });
    }


    // --------------------------------------------------------
    // PREVENT DOUBLE PAYMENT
    // --------------------------------------------------------

    if (
      order.payment_status ===
      "paid"
    ) {

      return res
        .status(400)
        .json({
          error:
            "This order has already been paid."
        });
    }


    // --------------------------------------------------------
    // GET ORDER ITEMS
    // --------------------------------------------------------
    //
    // IMPORTANT:
    // unit_price is ALWAYS the admin's SEK price.
    //
    // Example:
    // Admin price = 100 SEK
    //
    // We convert it below only for Stripe.
    // --------------------------------------------------------

    const {
      data: items,
      error: itemsError
    } =
      await supabase
        .from("order_items")
        .select(
          "product_name, quantity, unit_price, total_price"
        )
        .eq(
          "order_id",
          orderId
        );


    if (itemsError) {

      console.error(
        "Order items error:",
        itemsError
      );

      throw itemsError;
    }


    if (
      !items ||
      items.length === 0
    ) {

      return res
        .status(400)
        .json({
          error:
            "No items found for this order."
        });
    }


    // --------------------------------------------------------
    // GET EXCHANGE RATES
    // --------------------------------------------------------

    const rates =
      await getExchangeRates();


    // --------------------------------------------------------
    // CREATE STRIPE LINE ITEMS
    // --------------------------------------------------------

    const line_items =
      items.map(item => {

        const quantity =
          Number(
            item.quantity
          );


        const unitPriceSEK =
          Number(
            item.unit_price
          );


        if (
          !Number.isInteger(
            quantity
          ) ||
          quantity < 1
        ) {

          throw new Error(
            "Invalid item quantity."
          );
        }


        if (
          !Number.isFinite(
            unitPriceSEK
          ) ||
          unitPriceSEK < 0
        ) {

          throw new Error(
            "Invalid item price."
          );
        }


        // Admin price is SEK.
        const convertedUnitPrice =
          convertFromSEK(
            unitPriceSEK,
            selectedCurrency,
            rates
          );


        const stripeAmount =
          toStripeMinorUnit(
            convertedUnitPrice,
            selectedCurrency
          );


        if (
          !Number.isInteger(
            stripeAmount
          ) ||
          stripeAmount < 0
        ) {

          throw new Error(
            "Invalid Stripe amount."
          );
        }


        return {

          quantity,

          price_data: {

            currency:
              selectedCurrency.toLowerCase(),

            product_data: {

              name:
                item.product_name,

              metadata: {
                original_price_sek:
                  String(
                    unitPriceSEK
                  )
              }

            },

            unit_amount:
              stripeAmount

          }

        };

      });


    // --------------------------------------------------------
    // FRONTEND URL
    // --------------------------------------------------------

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "https://ebmarketiza.vercel.app";


    // --------------------------------------------------------
    // CREATE STRIPE CHECKOUT
    // --------------------------------------------------------

    const session =
      await stripe.checkout.sessions.create({

        mode:
          "payment",

        line_items,

        success_url:
          `${frontendUrl}/account.html?payment=success&order_id=${encodeURIComponent(orderId)}`,

        cancel_url:
          `${frontendUrl}/payment.html?payment=cancelled&order_id=${encodeURIComponent(orderId)}`,

        metadata: {

          order_id:
            String(orderId),

          currency:
            selectedCurrency,

          country_code:
            String(
              countryCode || ""
            ),

          source_currency:
            "SEK"

        },

        billing_address_collection:
          "auto"

      });


    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res
      .status(200)
      .json({

        url:
          session.url,

        sessionId:
          session.id,

        currency:
          selectedCurrency

      });


  } catch (error) {

    console.error(
      "Stripe checkout error:",
      error
    );


    return res
      .status(500)
      .json({

        error:
          error?.message ||
          "Unable to create Stripe Checkout session."

      });

  }

};
