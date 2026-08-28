(function () {
    "use strict";

    async function api(path, options) {
        let res;

        try {
            res = await fetch(path, options);
        } catch (error) {
            throw new Error(
                "Payment server is unreachable."
            );
        }

        const text = await res.text();

        let json = {};

        try {
            json = text ? JSON.parse(text) : {};
        } catch (error) {}

        if (!res.ok) {
            throw new Error(
                json.error ||
                "PayMongo request failed"
            );
        }

        return json;
    }

    function qrSrc(imageUrl) {
        if (!imageUrl) return "";

        if (
            imageUrl.indexOf("data:") === 0 ||
            imageUrl.indexOf("http") === 0
        ) {
            return imageUrl;
        }

        return "data:image/png;base64," + imageUrl;
    }

    window.PaymongoGcash = {

        async startCheckout(order) {

            return api(
                "/api/gcash-checkout.php",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(order)
                }
            );
        },

        async getStatus(id) {

            return api(
                "/api/payment-status.php?id=" +
                encodeURIComponent(id),
                {
                    method: "GET"
                }
            );
        }
    };

})();