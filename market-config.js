// EB-MARKETIZA international market configuration
// Product prices remain stored in SEK in Supabase. Customer-facing prices
// are converted for display/checkout. Rates can be updated here by the owner.
export const MARKET_CURRENCIES = {
  SEK: { symbol: "kr", locale: "sv-SE", rateFromSEK: 1 },
  EUR: { symbol: "€", locale: "en-IE", rateFromSEK: 0.089 },
  USD: { symbol: "$", locale: "en-US", rateFromSEK: 0.096 }
};

export const EUROPE_COUNTRIES = [
  ["AT","Austria"],["BE","Belgium"],["BG","Bulgaria"],["HR","Croatia"],
  ["CY","Cyprus"],["CZ","Czech Republic"],["DK","Denmark"],["EE","Estonia"],
  ["FI","Finland"],["FR","France"],["DE","Germany"],["GR","Greece"],
  ["HU","Hungary"],["IS","Iceland"],["IE","Ireland"],["IT","Italy"],
  ["LV","Latvia"],["LI","Liechtenstein"],["LT","Lithuania"],["LU","Luxembourg"],
  ["MT","Malta"],["NL","Netherlands"],["NO","Norway"],["PL","Poland"],
  ["PT","Portugal"],["RO","Romania"],["SK","Slovakia"],["SI","Slovenia"],
  ["ES","Spain"],["SE","Sweden"],["CH","Switzerland"],["GB","United Kingdom"],
  ["AL","Albania"],["AD","Andorra"],["BA","Bosnia and Herzegovina"],["ME","Montenegro"],
  ["MK","North Macedonia"],["RS","Serbia"],["SM","San Marino"],["UA","Ukraine"],
  ["VA","Vatican City"],["MD","Moldova"]
];

export const MARKET_COUNTRIES = [...EUROPE_COUNTRIES, ["US","United States"]];

export function getCurrency() {
  const saved = localStorage.getItem("ebmarketiza_currency");
  return MARKET_CURRENCIES[saved] ? saved : "EUR";
}

export function setCurrency(code) {
  if (MARKET_CURRENCIES[code]) localStorage.setItem("ebmarketiza_currency", code);
}

export function convertFromSEK(amount, code=getCurrency()) {
  const rate = MARKET_CURRENCIES[code]?.rateFromSEK || 1;
  return Number(amount || 0) * rate;
}

export function formatMoneyFromSEK(amount, code=getCurrency()) {
  const c = MARKET_CURRENCIES[code] || MARKET_CURRENCIES.EUR;
  return new Intl.NumberFormat(c.locale, { style: "currency", currency: code }).format(convertFromSEK(amount, code));
}

export function initMarketSelector(selectorId="marketCurrency") {
  const select = document.getElementById(selectorId);
  if (!select) return;
  select.value = getCurrency();
  select.addEventListener("change", () => {
    setCurrency(select.value);
    window.dispatchEvent(new CustomEvent("ebmarketiza-currency-change", { detail: select.value }));
    window.location.reload();
  });
}
