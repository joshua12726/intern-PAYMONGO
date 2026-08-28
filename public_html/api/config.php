<?php

// Replace this with your NEW rotated PayMongo secret key.
// Do NOT use the secret key you previously exposed.

define('PAYMONGO_SECRET_KEY', 'sk_live_REPLACE_WITH_NEW_KEY');

function paymongoRequest($method, $url, $data = null) {
    $ch = curl_init($url);

    $headers = [
        'Accept: application/json',
        'Content-Type: application/json',
        'Authorization: Basic ' . base64_encode(PAYMONGO_SECRET_KEY . ':')
    ];

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);

    curl_close($ch);

    if ($error) {
        return [
            'status' => 500,
            'data' => [
                'error' => $error
            ]
        ];
    }

    return [
        'status' => $httpCode,
        'data' => json_decode($response, true)
    ];
}