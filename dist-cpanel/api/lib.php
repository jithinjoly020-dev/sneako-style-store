<?php
// Shared helpers for the SMB UPI payment helper. Secrets live in config.php (never served).
header('Content-Type: application/json');
header('Cache-Control: no-store');
$cfg = require __DIR__ . '/config.php';

function out($code, $data) { http_response_code($code); echo json_encode($data); exit; }

function valid_id($id) { return is_string($id) && preg_match('/^[0-9a-f-]{36}$/i', $id); }

function http_json($url, $headers, $body) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20,
    CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
    CURLOPT_POSTFIELDS => json_encode($body),
  ]);
  $raw = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return [$code, json_decode($raw ?: '{}', true) ?: []];
}

function db_rpc($fn, $args) {
  global $cfg;
  return http_json($cfg['db_url'] . '/rest/v1/rpc/' . $fn, ['apikey: ' . $cfg['db_key']],
    array_merge(['_token' => $cfg['gateway_token']], $args));
}

function smb($path, $body) {
  global $cfg;
  return http_json('https://smbupi.com/api' . $path,
    ['X-API-Key: ' . $cfg['smb_key'], 'X-API-Secret: ' . $cfg['smb_secret']], $body);
}

function order_info($id) {
  [$c, $rows] = db_rpc('gateway_order_info', ['_order_id' => $id]);
  return ($c === 200 && isset($rows[0])) ? $rows[0] : null;
}

// Asks SMB UPI for the real status; marks the order paid only when the amount matches.
function verify_order($id) {
  $o = order_info($id);
  if (!$o) return ['status' => 'failed', 'number' => ''];
  if ($o['payment_status'] === 'paid') return ['status' => 'success', 'number' => $o['order_number']];
  [, $j] = smb('/check-status', ['order_id' => $id]);
  $d = $j['data'] ?? [];
  $s = strtolower((string)($d['payment_status'] ?? $d['status'] ?? 'pending'));
  if (in_array($s, ['success', 'paid', 'completed'], true)) {
    [, $r] = db_rpc('gateway_mark_paid', ['_order_id' => $id, '_amount' => (float)($d['amount'] ?? 0), '_ref' => (string)($d['utr'] ?? '')]);
    return ['status' => $r === 'paid' ? 'success' : 'failed', 'number' => $o['order_number']];
  }
  return ['status' => $s === 'failed' ? 'failed' : 'pending', 'number' => $o['order_number']];
}
