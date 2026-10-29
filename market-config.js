// ============================================================
// EB-MARKETIZA MARKET CONFIG
// Admin prices are ALWAYS stored in SEK.
// Customer prices are automatically converted by country.
// ============================================================

const DEFAULT_CURRENCY = "SEK";
const DEFAULT_COUNTRY = "SE";

// Exchange rates: 1 SEK = X currency.
// These are fallback rates. The app also tries to refresh
// rates automatically from the exchange-rate API.
let exchangeRates = {
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
  HUF: 34.0,
  RON: 0.43,
  BGN: 0.17,
  CAD: 0.14,
  AUD: 0.15,
  NZD: 0.17,
  JPY: 15.0,
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

  // Euro
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

  // Nordic
  NO: "NOK",
  DK: "DKK",
  IS: "ISK",

  // Europe
  GB: "GBP",
  CH: "CHF",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  BG: "BGN",
  TR: "TRY",

  // North America
  US: "USD",
  CA: "CAD",

  // Oceania
  AU: "AUD",
  NZ: "NZD",

  // Asia
  JP: "JPY",
  CN: "CNY",
  IN: "INR",

  // South America
  BR: "BRL",

  // Africa / Middle East
  ZA: "ZAR",
  AE: "AED",
  SA: "SAR"
};

// ============================================================
// COUNTRY LIST
// ============================================================

export const MARKET_COUNTRIES = [
  ["SE", "Sweden"],
  ["NO", "Norway"],
  ["DK", "Denmark"],
  ["FI", "Finland"],
  ["IS", "Iceland"],

  ["DE", "Germany"],
  ["FR", "France"],
  ["NL", "Netherlands"],
  ["BE", "Belgium"],
  ["ES", "Spain"],
  ["IT", "Italy"],
  ["PT", "Portugal"],
  ["IE", "Ireland"],
  ["AT", "Austria"],
  ["GR", "Greece"],
  ["FI", "Finland"],
  ["PL", "Poland"],
  ["CZ", "Czech Republic"],
  ["HU", "Hungary"],
  ["RO", "Romania"],
  ["BG", "Bulgaria"],
  ["CH", "Switzerland"],
  ["GB", "United Kingdom"],
  ["TR", "Turkey"],

  ["US", "United States"],
  ["CA", "Canada"],

  ["AU", "Australia"],
  ["NZ", "New Zealand"],

  ["JP", "Japan"],
  ["CN", "China"],
  ["IN", "India"],

  ["BR", "Brazil"],

  ["ZA", "South Africa"],
  ["AE", "United Arab Emirates"],
  ["SA", "Saudi Arabia"]
];

// ============================================================
// CURRENCY SYMBOLS
// ============================================================

const CURRENCY_SYMBOLS = {
  SEK: "kr",
  EUR: "€",
  USD: "$",
  GBP: "£",
  NOK: "kr",
  DKK: "kr",
  CHF: "CHF",
  PLN: "zł",
  CZK: "Kč",
  ISK: "kr",
  HUF: "Ft",
  RON: "lei",
  BGN: "лв",
  CAD: "CA$",
  AUD: "A$",
  NZD: "NZ$",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  BRL: "R$",
  ZAR: "R",
  AED: "د.إ",
  SAR: "﷼",
  TRY: "₺"
};

// ============================================================
// GET CURRENCY FROM COUNTRY
// ============================================================

export function getCurrency(countryCode = null) {
  let code = countryCode;

  if (!code) {
    const countrySelect = document.getElementById("country");

    if (countrySelect) {
      code =
        countrySelect.selectedOptions?.[0]?.dataset?.code ||
        countrySelect.value;
    }
  }

  if (!code) {
    code = localStorage.getItem("ebmarketiza_country");
  }

  if (!code) {
    code = DEFAULT_COUNTRY;
  }

  code = String(code).toUpperCase();

  return COUNTRY_CURRENCY[code] || DEFAULT_CURRENCY;
}

// ============================================================
// SET COUNTRY
// ============================================================

export function setMarketCountry(countryCode) {
  if (!countryCode) return;

  countryCode = String(countryCode).toUpperCase();

  localStorage.setItem("ebmarketiza_country", countryCode);

  const currency = COUNTRY_CURRENCY[countryCode] || DEFAULT_CURRENCY;

  localStorage.setItem("ebmarketiza_currency", currency);

  updateCurrencyDisplay();
}

// ============================================================
// GET SAVED CURRENCY
// ============================================================

export function getSavedCurrency() {
  return (
    localStorage.getItem("ebmarketiza_currency") ||
    DEFAULT_CURRENCY
  );
}

// ============================================================
// EXCHANGE RATE
// ============================================================

export function getExchangeRate(currency = DEFAULT_CURRENCY) {
  currency = String(currency).toUpperCase();

  return exchangeRates[currency] || 1;
}

// ============================================================
// CONVERT SEK → CUSTOMER CURRENCY
// ============================================================

export function convertSEK(amountSEK, currency = null) {
  const amount = Number(amountSEK);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  const targetCurrency =
    currency ||
    getSavedCurrency() ||
    DEFAULT_CURRENCY;

  const rate = getExchangeRate(targetCurrency);

  return amount * rate;
}

// ============================================================
// FORMAT MONEY
// ============================================================

export function formatMoney(amount, currency = DEFAULT_CURRENCY) {
  currency = String(currency).toUpperCase();

  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return `0 ${CURRENCY_SYMBOLS[currency] || currency}`;
  }

  let maximumFractionDigits = 2;

  // Currencies normally displayed without decimals
  if (["JPY", "ISK", "HUF"].includes(currency)) {
    maximumFractionDigits = 0;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits
    }).format(value);
  } catch {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;

    return `${value.toFixed(maximumFractionDigits)} ${symbol}`;
  }
}

// ============================================================
// FORMAT PRICE FROM ADMIN SEK PRICE
// ============================================================

export function formatMoneyFromSEK(amountSEK, currency = null) {
  const targetCurrency =
    currency ||
    getSavedCurrency() ||
    DEFAULT_CURRENCY;

  const converted = convertSEK(amountSEK, targetCurrency);

  return formatMoney(converted, targetCurrency);
}

// ============================================================
// LOAD LIVE EXCHANGE RATES
// ============================================================

export async function loadExchangeRates() {
  try {
    const response = await fetch(
      "https://open.er-api.com/v6/latest/SEK",
      {
        method: "GET",
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error("Exchange rate request failed");
    }

    const data = await response.json();

    if (
      data &&
      data.result === "success" &&
      data.rates
    ) {
      exchangeRates = {
        ...exchangeRates,
        ...data.rates,
        SEK: 1
      };

      localStorage.setItem(
        "ebmarketiza_exchange_rates",
        JSON.stringify({
          rates: exchangeRates,
          updatedAt: Date.now()
        })
      );

      updateCurrencyDisplay();

      return exchangeRates;
    }
  } catch (error) {
    console.warn(
      "EB-MARKETIZA: Could not load live exchange rates. Using saved/fallback rates.",
      error
    );
  }

  return exchangeRates;
}

// ============================================================
// LOAD SAVED EXCHANGE RATES
// ============================================================

function loadSavedExchangeRates() {
  try {
    const saved = localStorage.getItem(
      "ebmarketiza_exchange_rates"
    );

    if (!saved) return;

    const parsed = JSON.parse(saved);

    if (
      parsed &&
      parsed.rates &&
      typeof parsed.rates === "object"
    ) {
      exchangeRates = {
        ...exchangeRates,
        ...parsed.rates,
        SEK: 1
      };
    }
  } catch (error) {
    console.warn(
      "EB-MARKETIZA: Saved exchange rates could not be loaded.",
      error
    );
  }
}

// ============================================================
// UPDATE ALL PRICE ELEMENTS
//
// Any element with:
// data-price-sek="100"
// will automatically display the customer's currency.
// ============================================================

export function updateCurrencyDisplay() {
  const currency =
    getSavedCurrency() ||
    DEFAULT_CURRENCY;

  document
    .querySelectorAll("[data-price-sek]")
    .forEach((element) => {
      const sekPrice = Number(
        element.dataset.priceSek
      );

      if (!Number.isFinite(sekPrice)) return;

      element.textContent =
        formatMoneyFromSEK(sekPrice, currency);
    });

  const currencyLabel =
    document.getElementById("currencyLabel");

  if (currencyLabel) {
    currencyLabel.textContent = currency;
  }

  const marketCurrency =
    document.getElementById("marketCurrency");

  if (marketCurrency) {
    marketCurrency.value = currency;
  }
}

// ============================================================
// AUTOMATIC COUNTRY DETECTION
//
// We use browser language as a lightweight hint.
// The customer can still change country manually.
// ============================================================

function detectCountryFromBrowser() {
  const saved =
    localStorage.getItem("ebmarketiza_country");

  if (saved && COUNTRY_CURRENCY[saved]) {
    return saved;
  }

  const language =
    navigator.language ||
    navigator.userLanguage ||
    "sv-SE";

  const countryFromLanguage =
    language.split("-")[1]?.toUpperCase();

  if (
    countryFromLanguage &&
    COUNTRY_CURRENCY[countryFromLanguage]
  ) {
    return countryFromLanguage;
  }

  return DEFAULT_COUNTRY;
}

// ============================================================
// INITIALIZE MARKET SELECTOR
// ============================================================

export function initMarketSelector() {
  loadSavedExchangeRates();

  const countrySelect =
    document.getElementById("country");

  const currencySelect =
    document.getElementById("marketCurrency");

  // ----------------------------------------------------------
  // Country selector
  // ----------------------------------------------------------

  if (countrySelect) {
    const currentCountry =
      localStorage.getItem(
        "ebmarketiza_country"
      ) || detectCountryFromBrowser();

    const countryExists =
      Array.from(countrySelect.options).some(
        (option) =>
          option.dataset.code === currentCountry
      );

    if (countryExists) {
      countrySelect.value =
        Array.from(countrySelect.options).find(
          (option) =>
            option.dataset.code === currentCountry
        )?.value || countrySelect.value;
    }

    const selectedCode =
      countrySelect.selectedOptions?.[0]?.dataset?.code;

    if (selectedCode) {
      setMarketCountry(selectedCode);
    }

    countrySelect.addEventListener(
      "change",
      () => {
        const code =
          countrySelect.selectedOptions?.[0]?.dataset?.code;

        if (!code) return;

        setMarketCountry(code);

        // Automatically change visible currency.
        if (currencySelect) {
          currencySelect.value =
            COUNTRY_CURRENCY[code] ||
            DEFAULT_CURRENCY;
        }

        updateCurrencyDisplay();
      }
    );
  }

  // ----------------------------------------------------------
  // Currency selector
  //
  // This remains available as a manual override if the
  // customer needs it.
  // ----------------------------------------------------------

  if (currencySelect) {
    currencySelect.value =
      getSavedCurrency();

    currencySelect.addEventListener(
      "change",
      () => {
        const currency =
          String(
            currencySelect.value ||
              DEFAULT_CURRENCY
          ).toUpperCase();

        localStorage.setItem(
          "ebmarketiza_currency",
          currency
        );

        updateCurrencyDisplay();
      }
    );
  }

  updateCurrencyDisplay();

  // Load fresh exchange rates in background.
  loadExchangeRates();
}

// ============================================================
// HELPERS
// ============================================================

export function getCurrencySymbol(currency) {
  return (
    CURRENCY_SYMBOLS[
      String(currency).toUpperCase()
    ] || currency
  );
}

export function getCountryCurrency(countryCode) {
  return (
    COUNTRY_CURRENCY[
      String(countryCode).toUpperCase()
    ] || DEFAULT_CURRENCY
  );
}

// ============================================================
// GLOBAL HELPERS
// ============================================================

if (typeof window !== "undefined") {
  window.EBMarketizaMarket = {
    getCurrency,
    getSavedCurrency,
    getExchangeRate,
    convertSEK,
    formatMoney,
    formatMoneyFromSEK,
    setMarketCountry,
    getCountryCurrency,
    getCurrencySymbol,
    updateCurrencyDisplay,
    loadExchangeRates
  };
}
