/**
 * PayMongo checkout client. Secret-key operations belong in serve.ps1.
 */
(function () {
  "use strict";

  async function api(path, options) {
    const localLiveServer = (location.hostname === "127.0.0.1" || location.hostname === "localhost") && location.port === "5501";
    const apiBase = localLiveServer ? "http://127.0.0.1:8082" : "";
    let res;
    try {
      res = await fetch(apiBase + path, options);
    } catch (error) {
      throw new Error("Payment server is unreachable. Deploy serve.ps1 as a backend and configure this domain to use it.");
    }
    const text = await res.text();
    let json = {};
    try { json = text ? JSON.parse(text) : {}; } catch (error) { }
    if (!res.ok) {
      if (res.status === 404 || !text) {
        throw new Error("Payment backend is not deployed on this domain. The site must proxy /api/gcash-checkout to PayMongo.");
      }
      throw new Error(json.error || "PayMongo request failed");
    }
    return json;
  }

  function qrSrc(imageUrl) {
    if (!imageUrl) return "";
    if (imageUrl.indexOf("data:") === 0 || imageUrl.indexOf("http") === 0) return imageUrl;
    return "data:image/png;base64," + imageUrl;
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      if (src.indexOf("data:") !== 0) img.crossOrigin = "anonymous";
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  /* Upscale + white quiet zone so GCash can lock onto the finder patterns. */
  async function toScanFriendlyQr(imageUrl) {
    if (!imageUrl) return "";
    try {
      var img = await loadImage(imageUrl);
      var srcW = img.naturalWidth || img.width || 256;
      var srcH = img.naturalHeight || img.height || 256;
      var inner = Math.max(srcW, srcH, 420);
      var pad = Math.round(inner * 0.12);
      var canvas = document.createElement("canvas");
      canvas.width = inner + pad * 2;
      canvas.height = inner + pad * 2;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, pad, pad, inner, inner);
      return canvas.toDataURL("image/png");
    } catch (e) {
      return imageUrl;
    }
  }

  function extractQrImage(attached) {
    var attrs = (attached && attached.attributes) || {};
    var next = attrs.next_action || attrs.nextAction || {};
    var code = next.code || next.qr_code || next.qrph || {};
    return qrSrc(
      code.image_url ||
      code.imageUrl ||
      next.image_url ||
      next.imageUrl ||
      ""
    );
  }

  window.PaymongoGcash = {
    async startCheckout(order) {
      return api("/api/gcash-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
    },

    async getStatus(id, clientKey) {
      return api("/api/payment-status?id=" + encodeURIComponent(id), { method: "GET" });
    },
  };
})();
