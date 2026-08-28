const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const paymongoSecretKey = defineSecret("PAYMONGO_SECRET_KEY");

function paymongoHeaders() {
  const token = Buffer.from(`${paymongoSecretKey.value()}:`).toString("base64");
  return {
    Accept: "application/json",
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  };
}

async function paymongoRequest(path, method, body, stage) {
  const response = await fetch(`https://api.paymongo.com/v1${path}`, {
    method,
    headers: paymongoHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = json.errors?.map((error) => error.detail).join("; ") || "request failed";
    throw new Error(`PayMongo ${stage} failed: ${detail}`);
  }
  return json.data;
}

exports.paymongoApi = onRequest(
  { secrets: [paymongoSecretKey] },
  async (request, response) => {
    response.set("Cache-Control", "no-store");
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    try {
      if (request.path === "/api/health" && request.method === "GET") {
        response.json({ ok: true });
        return;
      }

      if (request.path === "/api/payment-status" && request.method === "GET") {
        const id = request.query.id;
        if (!id) throw new Error("Missing payment intent id");
        const intent = await paymongoRequest(
          `/payment_intents/${encodeURIComponent(id)}`,
          "GET",
          null,
          "checking payment status"
        );
        response.json({ id: intent.id, status: intent.attributes.status });
        return;
      }

      if (request.path !== "/api/gcash-checkout" || request.method !== "POST") {
        response.status(404).json({ error: "Payment endpoint not found" });
        return;
      }

      const payload = request.body || {};
      const name = String(payload.name || "").trim();
      const email = String(payload.email || "").trim();
      const phone = String(payload.phone || "").replace(/[\s-]/g, "");
      const amount = Number(payload.amount);
      const centavos = Math.round(amount * 100);

      if (name.length < 2) throw new Error("Name is required");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Valid email is required");
      if (centavos < 100) throw new Error("Amount must be at least PHP 1.00");
      if (centavos > 10000000) throw new Error("Amount exceeds GCash limit");

      const e164 = /^09\d{9}$/.test(phone) ? `+63${phone.slice(1)}` : phone;
      const intent = await paymongoRequest("/payment_intents", "POST", {
        data: { attributes: {
          amount: centavos,
          currency: "PHP",
          payment_method_allowed: ["qrph"],
          capture_type: "automatic",
          description: "Joshua Gonzales order",
          statement_descriptor: "JOSHUA",
          metadata: { customer_name: name, customer_email: email },
        } },
      }, "creating payment intent");

      const paymentMethod = await paymongoRequest("/payment_methods", "POST", {
        data: { attributes: {
          type: "qrph",
          billing: { name, email, phone: e164 },
        } },
      }, "creating payment method");

      const attached = await paymongoRequest(`/payment_intents/${intent.id}/attach`, "POST", {
        data: { attributes: {
          payment_method: paymentMethod.id,
          client_key: intent.attributes.client_key,
        } },
      }, "attaching payment method");

      const qrImageUrl = attached.attributes.next_action?.code?.image_url;
      if (!qrImageUrl) throw new Error("PayMongo did not return a QR Ph image");
      response.json({ qrImageUrl, paymentIntentId: attached.id, status: attached.attributes.status });
    } catch (error) {
      response.status(400).json({ error: error.message || "Payment request failed" });
    }
  }
);