# Serves the shop and proxies PayMongo (secret key stays on this machine).
# Run: powershell -ExecutionPolicy Bypass -File serve.ps1

param(
  [int]$Port
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or $line -notmatch "=") { return }
    $idx = $line.IndexOf("=")
    $name = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    Set-Item -Path "Env:$name" -Value $value
  }
}

$secret = $env:PAYMONGO_SECRET_KEY
if (-not $secret -or $secret -eq "sk_live_your_secret_key") {
  throw "PAYMONGO_SECRET_KEY is missing. Copy .env.example to .env and add your secret key."
}

$port = if ($Port) { $Port } elseif ($env:PORT) { [int]$env:PORT } else { 8080 }
$prefix = "http://127.0.0.1:$port/"

function Get-PayMongoAuthHeader {
  $pair = "${secret}:"
  $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
  return @{
    Authorization = "Basic $b64"
    Accept        = "application/json"
  }
}

function Invoke-PayMongo {
  param(
    [string]$Method,
    [string]$Url,
    [object]$BodyObject,
    [string]$Stage = "request"
  )
  $headers = Get-PayMongoAuthHeader
  $params = @{
    Method      = $Method
    Uri         = $Url
    Headers     = $headers
    ContentType = "application/json"
  }
  if ($null -ne $BodyObject) {
    $params.Body = ($BodyObject | ConvertTo-Json -Depth 12 -Compress)
  }
  try {
    return Invoke-RestMethod @params
  } catch {
    $resp = $_.Exception.Response
    $detail = $_.Exception.Message
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      $detail = $_.ErrorDetails.Message
    }
    if ($resp) {
      try {
        $stream = $resp.GetResponseStream()
        $reader = New-Object IO.StreamReader($stream)
        $raw = $reader.ReadToEnd()
        $reader.Close()
        $parsed = $raw | ConvertFrom-Json
        if ($parsed.errors) {
          $detail = ($parsed.errors | ForEach-Object { $_.detail }) -join "; "
        } elseif ($raw) {
          $detail = $raw
        }
      } catch { }
    }
    throw "PayMongo $Stage failed: $detail"
  }
}

function Send-Json {
  param($Context, $Status, $Object)
  $json = $Object | ConvertTo-Json -Depth 12 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $Context.Response.StatusCode = $Status
  $Context.Response.ContentType = "application/json; charset=utf-8"
  $Context.Response.Headers.Add("Cache-Control", "no-store")
  $Context.Response.ContentLength64 = $bytes.Length
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Context.Response.Close()
}

function Read-JsonBody($Context) {
  $reader = New-Object IO.StreamReader($Context.Request.InputStream, $Context.Request.ContentEncoding)
  $text = $reader.ReadToEnd()
  $reader.Close()
  if (-not $text) { return $null }
  return $text | ConvertFrom-Json
}

function Get-ContentType($ext) {
  switch ($ext) {
    ".html" { "text/html; charset=utf-8" }
    ".css"  { "text/css; charset=utf-8" }
    ".js"   { "application/javascript; charset=utf-8" }
    ".json" { "application/json" }
    ".svg"  { "image/svg+xml" }
    ".jpg"  { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".png"  { "image/png" }
    ".gif"  { "image/gif" }
    ".webp" { "image/webp" }
    ".woff" { "font/woff" }
    ".woff2"{ "font/woff2" }
    ".ttf"  { "font/ttf" }
    ".ico"  { "image/x-icon" }
    default { "application/octet-stream" }
  }
}

function Handle-GcashCheckout($Context) {
  $payload = Read-JsonBody $Context
  if (-not $payload) { throw "Missing request body" }

  $name = [string]$payload.name
  $email = [string]$payload.email
  $phone = ([string]$payload.phone) -replace "\s|-", ""
  $amountPesos = [double]$payload.amount
  $centavos = [int][Math]::Round($amountPesos * 100)

  if ($name.Length -lt 2) { throw "Name is required" }
  if ($email -notmatch "^[^\s@]+@[^\s@]+\.[^\s@]+$") { throw "Valid email is required" }
  if ($centavos -lt 100) { throw "Amount must be at least PHP 1.00" }
  if ($centavos -gt 10000000) { throw "Amount exceeds GCash limit" }

  $e164 = $phone
  if ($phone -match "^09\d{9}$") {
    $e164 = "+63" + $phone.Substring(1)
  }

  $intent = Invoke-PayMongo -Method POST -Url "https://api.paymongo.com/v1/payment_intents" -Stage "creating payment intent" -BodyObject @{
    data = @{
      attributes = @{
        amount                  = $centavos
        currency                = "PHP"
        payment_method_allowed  = @("qrph")
        capture_type            = "automatic"
        description             = "Nike Basketball order"
        statement_descriptor    = "NIKEBB"
        metadata                = @{
          customer_name  = $name
          customer_email = $email
        }
      }
    }
  }

  $method = Invoke-PayMongo -Method POST -Url "https://api.paymongo.com/v1/payment_methods" -Stage "creating payment method" -BodyObject @{
    data = @{
      attributes = @{
        type    = "qrph"
        billing = @{
          name  = $name
          email = $email
          phone = $e164
        }
      }
    }
  }

  $returnUrl = [string]$payload.returnUrl
  if (-not $returnUrl) {
    $returnUrl = $prefix + "checkout.html"
  }

  $attached = Invoke-PayMongo -Method POST -Url ("https://api.paymongo.com/v1/payment_intents/" + $intent.data.id + "/attach") -Stage "attaching payment method" -BodyObject @{
    data = @{
      attributes = @{
        payment_method = $method.data.id
        client_key     = $intent.data.attributes.client_key
      }
    }
  }

  $qrImageUrl = $attached.data.attributes.next_action.code.image_url
  if (-not $qrImageUrl) { throw "PayMongo did not return a QR Ph image" }

  Send-Json $Context 200 @{
    qrImageUrl       = $qrImageUrl
    paymentIntentId  = $attached.data.id
    status           = $attached.data.attributes.status
  }
}

function Handle-PaymentStatus($Context) {
  $id = $Context.Request.QueryString["id"]
  if (-not $id) { throw "Missing payment intent id" }
  $intent = Invoke-PayMongo -Method GET -Url ("https://api.paymongo.com/v1/payment_intents/" + [uri]::EscapeDataString($id)) -BodyObject $null
  Send-Json $Context 200 @{
    id     = $intent.data.id
    status = $intent.data.attributes.status
  }
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  throw "Could not bind $prefix. Stop the other process using this port, then try again."
}

Write-Output "Shop + PayMongo running at $prefix"
Write-Output "Open checkout: $($prefix)check-out.html"
Write-Output "Press Ctrl+C to stop."

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath)
    $method = $ctx.Request.HttpMethod

    if ($path -eq "/api/health") {
      Send-Json $ctx 200 @{ ok = $true }
      continue
    }

    if ($path -eq "/api/gcash-checkout" -and $method -eq "POST") {
      Handle-GcashCheckout $ctx
      continue
    }

    if ($path -eq "/api/payment-status" -and $method -eq "GET") {
      Handle-PaymentStatus $ctx
      continue
    }

    if ($path -eq "/") { $path = "/index.html" }
    $relative = $path.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar)
    $file = Join-Path $root $relative
    $fullRoot = (Resolve-Path $root).Path
    $fullFile = [IO.Path]::GetFullPath($file)
    if (-not $fullFile.StartsWith($fullRoot)) {
      $ctx.Response.StatusCode = 403
      $ctx.Response.Close()
      continue
    }

    if (Test-Path $fullFile -PathType Leaf) {
      $bytes = [IO.File]::ReadAllBytes($fullFile)
      $ext = [IO.Path]::GetExtension($fullFile).ToLower()
      $ctx.Response.StatusCode = 200
      $ctx.Response.ContentType = Get-ContentType $ext
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      $ctx.Response.Close()
    } else {
      $ctx.Response.StatusCode = 404
      $ctx.Response.Close()
    }
  } catch {
    try {
      Send-Json $ctx 400 @{ error = $_.Exception.Message }
    } catch {
      try { $ctx.Response.Abort() } catch { }
    }
  }
}
