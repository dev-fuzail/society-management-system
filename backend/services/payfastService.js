import crypto from "crypto";

const getConfig = () => {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const securedKey = process.env.PAYFAST_SECURED_KEY;
  const baseUrl = (process.env.PAYFAST_BASE_URL || "https://ipguat.apps.net.pk").replace(/\/+$/, "");
  const merchantName = process.env.PAYFAST_MERCHANT_NAME || "LivingSync";
  const callbackBaseUrl = (process.env.PAYFAST_CALLBACK_BASE_URL || "http://localhost:8001").replace(/\/+$/, "");

  if (!merchantId || !securedKey) {
    throw new Error("PayFast is not configured. Set PAYFAST_MERCHANT_ID and PAYFAST_SECURED_KEY.");
  }

  return { merchantId, securedKey, baseUrl, merchantName, callbackBaseUrl };
};

export const generateBasketId = (invoiceId) => `LS-${invoiceId}-${Date.now()}`;

const formatOrderDate = (date = new Date()) => date.toISOString().slice(0, 10);

const fetchWithTimeout = async (url, options, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`PayFast request timed out after ${timeoutMs / 1000}s (${url})`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

export const getAccessToken = async ({ basketId, txnAmt, currencyCode = "PKR" }) => {
  const { merchantId, securedKey, baseUrl } = getConfig();

  if (!merchantId || !securedKey) {
    throw new Error("PAYFAST_MERCHANT_ID and PAYFAST_SECURED_KEY must be set in .env");
  }

  const body = new URLSearchParams({
    MERCHANT_ID: merchantId,
    SECURED_KEY: securedKey,
    BASKET_ID: basketId,
    TXNAMT: String(txnAmt),
    CURRENCY_CODE: currencyCode,
  });

  console.log(`[PAYFAST] GetAccessToken → ${baseUrl}/Ecommerce/api/Transaction/GetAccessToken`);

  const response = await fetchWithTimeout(
    `${baseUrl}/Ecommerce/api/Transaction/GetAccessToken`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "LivingSync-Backend/1.0",
      },
      body,
    },
    15000
  );

  const text = await response.text();
  console.log(`[PAYFAST] GetAccessToken response (${response.status}):`, text.slice(0, 300));

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`PayFast returned non-JSON (HTTP ${response.status}). Body: ${text.slice(0, 200)}`);
  }

  if (!payload?.ACCESS_TOKEN) {
    throw new Error(payload?.message || payload?.RESPONSE_MESSAGE || "Failed to fetch PayFast access token.");
  }

  return payload.ACCESS_TOKEN;
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));

export const buildCheckoutFormHtml = ({
  token,
  basketId,
  txnAmt,
  currencyCode = "PKR",
  customerMobileNo,
  customerEmailAddress,
  txnDesc,
  orderDate = formatOrderDate(),
}) => {
  const { merchantId, baseUrl, merchantName, callbackBaseUrl } = getConfig();

  const fields = {
    MERCHANT_ID: merchantId,
    MERCHANT_NAME: merchantName,
    TOKEN: token,
    PROCCODE: "00",
    TXNAMT: String(txnAmt),
    CUSTOMER_MOBILE_NO: customerMobileNo || "03000000000",
    CUSTOMER_EMAIL_ADDRESS: customerEmailAddress || "no-reply@livingsync.com",
    SIGNATURE: crypto.randomBytes(8).toString("hex"),
    VERSION: "LIVINGSYNC-1.0",
    TXNDESC: txnDesc || "LivingSync maintenance payment",
    SUCCESS_URL: `${callbackBaseUrl}/api/payments/payfast/success`,
    FAILURE_URL: `${callbackBaseUrl}/api/payments/payfast/failure`,
    BASKET_ID: basketId,
    ORDER_DATE: orderDate,
    CHECKOUT_URL: `${callbackBaseUrl}/api/payments/payfast/ipn`,
    CURRENCY_CODE: currencyCode,
  };

  const inputs = Object.entries(fields)
    .map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}" />`)
    .join("\n");

  return `<!DOCTYPE html>
<html>
  <body onload="document.forms['payfast'].submit()">
    <p>Redirecting to PayFast secure checkout...</p>
    <form name="payfast" method="POST" action="${baseUrl}/Ecommerce/api/Transaction/PostTransaction">
      ${inputs}
    </form>
  </body>
</html>`;
};

export const computeValidationHash = ({ basketId, errCode }) => {
  const { merchantId, securedKey } = getConfig();
  const raw = `${basketId}|${securedKey}|${merchantId}|${errCode}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
};

export const verifyIpnHash = ({ basketId, errCode, validationHash }) => {
  if (!validationHash) return false;
  const expected = computeValidationHash({ basketId, errCode });
  return expected.toLowerCase() === String(validationHash).toLowerCase();
};

export const isSuccessErrorCode = (errCode) => errCode === "000" || errCode === "00";

// ─── Direct API Flow (for server-side / admin test payments) ─────────────────
// Uses PAYFAST_DIRECT_BASE_URL env var (defaults to PAYFAST_BASE_URL).
// ipguat.apps.net.pk has its own URL prefix — set PAYFAST_DIRECT_BASE_URL
// in .env if the direct API lives at a different host/path than the checkout.

const getDirectConfig = () => {
  const { merchantId, securedKey, baseUrl } = getConfig();
  const directBaseUrl = (
    process.env.PAYFAST_DIRECT_BASE_URL || baseUrl
  ).replace(/\/+$/, "");
  return { merchantId, securedKey, directBaseUrl };
};

const formatOrderDateTime = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
};

// Safely parse a fetch response — throws a clear error if HTML is returned
// instead of JSON (happens when the endpoint URL is wrong for this sandbox).
const parseJsonOrThrow = async (response, label) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    // First 300 chars of the response body helps diagnose wrong endpoints
    const preview = text.slice(0, 300).replace(/\s+/g, " ");
    throw new Error(
      `[PayFast ${label}] Expected JSON but got (HTTP ${response.status}): ${preview}. ` +
      "Check PAYFAST_DIRECT_BASE_URL in .env — this sandbox may use a different endpoint path."
    );
  }
};

export const getDirectAccessToken = async (customerIp = "111.111.111.111") => {
  const { merchantId, securedKey, directBaseUrl } = getDirectConfig();

  const body = new URLSearchParams({
    merchant_id: merchantId,
    secured_key: securedKey,
    grant_type: "client_credentials",
    customer_ip: customerIp,
  });

  const response = await fetchWithTimeout(`${directBaseUrl}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }, 15000);

  const payload = await parseJsonOrThrow(response, "GetToken");

  if (!payload?.token) {
    throw new Error(payload?.error_description || payload?.message || "Failed to get direct access token.");
  }

  return payload.token;
};

export const validateCustomer = async (token, { basketId, txnAmt, orderDate, accountNumber, cnicNumber, customerMobileNo, customerEmailAddress, accountTypeId, bankCode }) => {
  const { directBaseUrl } = getDirectConfig();

  const body = new URLSearchParams({
    basket_id: basketId,
    txnamt: String(txnAmt),
    customer_mobile_no: customerMobileNo,
    customer_email_address: customerEmailAddress,
    account_type_id: accountTypeId,
    bank_code: bankCode,
    cnic_number: cnicNumber,
    account_number: accountNumber,
    order_date: orderDate || formatOrderDateTime(),
    otp_required: "yes",
  });

  const response = await fetch(`${directBaseUrl}/customer/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Bearer ${token}`,
    },
    body,
  });

  const payload = await parseJsonOrThrow(response, "CustomerValidate");

  if (!payload?.transaction_id) {
    throw new Error(payload?.error_description || payload?.message || "Customer validation failed.");
  }

  return payload.transaction_id;
};

export const initiateTransaction = async (token, { basketId, txnAmt, otp, transactionId, accountNumber, cnicNumber, customerMobileNo, customerEmailAddress, accountTypeId, bankCode, orderDate }) => {
  const { directBaseUrl } = getDirectConfig();

  const body = new URLSearchParams({
    basket_id: basketId,
    txnamt: String(txnAmt),
    account_type_id: accountTypeId,
    bank_code: bankCode,
    account_number: accountNumber,
    cnic_number: cnicNumber,
    customer_mobile_no: customerMobileNo,
    customer_email_address: customerEmailAddress,
    order_date: orderDate || formatOrderDateTime(),
    otp,
    transaction_id: transactionId,
  });

  const response = await fetch(`${directBaseUrl}/transaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Bearer ${token}`,
    },
    body,
  });

  return parseJsonOrThrow(response, "InitiateTransaction");
};

// Query PayFast for the real-time status of a transaction by basket_id.
// Requires a direct-API access token (getDirectAccessToken).
export const getTransactionByBasketId = async (token, basketId, orderDate) => {
  const { directBaseUrl } = getDirectConfig();

  const qs = new URLSearchParams({ order_date: orderDate || formatOrderDateTime() });
  const response = await fetch(`${directBaseUrl}/transaction/basket_id/${encodeURIComponent(basketId)}?${qs}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Bearer ${token}`,
    },
  });

  return parseJsonOrThrow(response, "GetTransactionByBasketId");
};
