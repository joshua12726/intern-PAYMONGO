<?php

header('Content-Type: application/json');

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);

    echo json_encode([
        'error' => 'Method not allowed'
    ]);

    exit;
}

$input = json_decode(
    file_get_contents('php://input'),
    true
);

if (!$input) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Invalid request'
    ]);

    exit;
}

/*
|--------------------------------------------------------------------------
| GET TOTAL
|--------------------------------------------------------------------------
*/

$total = 0;

if (isset($input['total'])) {
    $total = floatval($input['total']);
}

if ($total <= 0 && isset($input['amount'])) {
    $total = floatval($input['amount']);
}

if ($total <= 0) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Invalid order amount'
    ]);

    exit;
}

/*
|--------------------------------------------------------------------------
| CONVERT PESO TO CENTAVOS
|--------------------------------------------------------------------------
*/

$amount = intval(round($total * 100));

/*
|--------------------------------------------------------------------------
| CREATE PAYMENT INTENT
|--------------------------------------------------------------------------
*/

$paymentIntentData = [
    'data' => [
        'attributes' => [
            'amount' => $amount,
            'currency' => 'PHP',
            'description' => 'Order from Electro Store',
            'payment_method_allowed' => [
                'gcash'
            ]
        ]
    ]
];

$result = paymongoRequest(
    'POST',
    'https://api.paymongo.com/v1/payment_intents',
    $paymentIntentData
);

if ($result['status'] < 200 || $result['status'] >= 300) {

    http_response_code($result['status']);

    echo json_encode([
        'error' => 'Unable to create PayMongo payment intent',
        'details' => $result['data']
    ]);

    exit;
}

$paymentIntent = $result['data'];

$paymentIntentId = $paymentIntent['data']['id'];

/*
|--------------------------------------------------------------------------
| CREATE GCASH PAYMENT METHOD
|--------------------------------------------------------------------------
*/

$paymentMethodData = [
    'data' => [
        'attributes' => [
            'type' => 'gcash',
            'billing' => [
                'name' =>
                    ($input['firstName'] ?? '') . ' ' .
                    ($input['lastName'] ?? ''),

                'email' =>
                    $input['email'] ?? ''
            ]
        ]
    ]
];

$methodResult = paymongoRequest(
    'POST',
    'https://api.paymongo.com/v1/payment_methods',
    $paymentMethodData
);

if (
    $methodResult['status'] < 200 ||
    $methodResult['status'] >= 300
) {

    http_response_code($methodResult['status']);

    echo json_encode([
        'error' => 'Unable to create GCash payment method',
        'details' => $methodResult['data']
    ]);

    exit;
}

$paymentMethodId =
    $methodResult['data']['data']['id'];

/*
|--------------------------------------------------------------------------
| ATTACH GCASH TO PAYMENT INTENT
|--------------------------------------------------------------------------
*/

$attachData = [
    'data' => [
        'attributes' => [
            'payment_method' => $paymentMethodId,

            'return_url' =>
                'https://intern7zsa.net/payment-success.html'
        ]
    ]
];

$attachResult = paymongoRequest(
    'POST',
    'https://api.paymongo.com/v1/payment_intents/' .
    $paymentIntentId .
    '/attach',
    $attachData
);

if (
    $attachResult['status'] < 200 ||
    $attachResult['status'] >= 300
) {

    http_response_code($attachResult['status']);

    echo json_encode([
        'error' => 'Unable to attach GCash payment',
        'details' => $attachResult['data']
    ]);

    exit;
}

/*
|--------------------------------------------------------------------------
| RETURN TO JAVASCRIPT
|--------------------------------------------------------------------------
*/

echo json_encode([
    'success' => true,
    'payment_intent_id' => $paymentIntentId,
    'data' => $attachResult['data']['data']
]);