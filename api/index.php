<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function envValue(string $name): string {
    $file = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
    if (!is_file($file)) return '';
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
        [$key, $value] = explode('=', $line, 2);
        if (trim($key) === $name) return trim($value, " \t\"'");
    }
    return '';
}

function respond(int $status, array $data): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function paymongo(string $path, string $method, ?array $body, string $stage): array {
    $secret = envValue('PAYMONGO_SECRET_KEY');
    if ($secret === '' || $secret === 'sk_live_your_secret_key') {
        respond(500, ['error' => 'PAYMONGO_SECRET_KEY is not configured on the server.']);
    }

    $curl = curl_init('https://api.paymongo.com/v1' . $path);
    $headers = [
        'Accept: application/json',
        'Content-Type: application/json',
        'Authorization: Basic ' . base64_encode($secret . ':'),
    ];
    curl_setopt_array($curl, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);
    if ($body !== null) curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($body));
    $raw = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);
    $json = is_string($raw) ? json_decode($raw, true) : null;
    if ($curlError !== '') respond(502, ['error' => "PayMongo {$stage} failed: {$curlError}"]);
    if ($status < 200 || $status >= 300) {
        $details = '';
        foreach (($json['errors'] ?? []) as $error) $details .= ($details === '' ? '' : '; ') . ($error['detail'] ?? '');
        respond(400, ['error' => "PayMongo {$stage} failed: " . ($details ?: 'request failed')]);
    }
    return $json['data'] ?? [];
}

$route = $_GET['route'] ?? trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$route = preg_replace('#^.*?/api/#', '', $route);

if ($route === 'health' && $_SERVER['REQUEST_METHOD'] === 'GET') respond(200, ['ok' => true]);

if ($route === 'payment-status' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $id = $_GET['id'] ?? '';
    if ($id === '') respond(400, ['error' => 'Missing payment intent id']);
    $intent = paymongo('/payment_intents/' . rawurlencode($id), 'GET', null, 'checking payment status');
    respond(200, ['id' => $intent['id'], 'status' => $intent['attributes']['status'] ?? '']);
}

if ($route !== 'gcash-checkout' || $_SERVER['REQUEST_METHOD'] !== 'POST') respond(404, ['error' => 'Payment endpoint not found']);

$payload = json_decode(file_get_contents('php://input'), true) ?: [];
$name = trim((string)($payload['name'] ?? ''));
$email = trim((string)($payload['email'] ?? ''));
$phone = preg_replace('/[\s-]/', '', (string)($payload['phone'] ?? ''));
$centavos = (int) round((float)($payload['amount'] ?? 0) * 100);
if (strlen($name) < 2) respond(400, ['error' => 'Name is required']);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(400, ['error' => 'Valid email is required']);
if ($centavos < 100) respond(400, ['error' => 'Amount must be at least PHP 1.00']);
if ($centavos > 10000000) respond(400, ['error' => 'Amount exceeds GCash limit']);
$phone = preg_match('/^09\d{9}$/', $phone) ? '+63' . substr($phone, 1) : $phone;

$intent = paymongo('/payment_intents', 'POST', ['data' => ['attributes' => [
    'amount' => $centavos,
    'currency' => 'PHP',
    'payment_method_allowed' => ['qrph'],
    'capture_type' => 'automatic',
    'description' => 'Joshua Gonzales order',
    'statement_descriptor' => 'JOSHUA',
    'metadata' => ['customer_name' => $name, 'customer_email' => $email],
]]], 'creating payment intent');
$method = paymongo('/payment_methods', 'POST', ['data' => ['attributes' => [
    'type' => 'qrph',
    'billing' => ['name' => $name, 'email' => $email, 'phone' => $phone],
]]], 'creating payment method');
$attached = paymongo('/payment_intents/' . rawurlencode($intent['id']) . '/attach', 'POST', ['data' => ['attributes' => [
    'payment_method' => $method['id'],
    'client_key' => $intent['attributes']['client_key'] ?? '',
]]], 'attaching payment method');
$qr = $attached['attributes']['next_action']['code']['image_url'] ?? '';
if ($qr === '') respond(400, ['error' => 'PayMongo did not return a QR Ph image']);
respond(200, ['qrImageUrl' => strpos($qr, 'data:') === 0 ? $qr : 'data:image/png;base64,' . $qr, 'paymentIntentId' => $attached['id'], 'status' => $attached['attributes']['status'] ?? '']);
