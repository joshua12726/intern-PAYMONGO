<?php

header('Content-Type: application/json');

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {

    http_response_code(405);

    echo json_encode([
        'error' => 'Method not allowed'
    ]);

    exit;
}

$id = $_GET['id'] ?? '';

if (!$id) {

    http_response_code(400);

    echo json_encode([
        'error' => 'Payment ID is required'
    ]);

    exit;
}

$result = paymongoRequest(
    'GET',
    'https://api.paymongo.com/v1/payment_intents/' .
    urlencode($id)
);

http_response_code($result['status']);

echo json_encode($result['data']);