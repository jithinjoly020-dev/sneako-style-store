<?php
require __DIR__ . '/lib.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['error' => 'POST only']);
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$id = $in['order_id'] ?? '';
if (!valid_id($id)) out(400, ['error' => 'Bad order']);
$o = order_info($id);
if (!$o) out(404, ['error' => 'Order not found']);
if ($o['payment_status'] === 'paid') out(409, ['error' => 'This order is already paid.']);
$mobile = substr(preg_replace('/\D/', '', (string)$o['customer_phone']), -10);
$body = [
  'amount' => (float)$o['total'],
  'order_id' => $o['id'],
  'customer_name' => $o['customer_name'],
  'callback_url' => $cfg['site_url'] . '/checkout?smb=' . $o['id'],
  'description' => 'Comfort Hub order ' . $o['order_number'],
];
if (strlen($mobile) === 10) $body['customer_mobile'] = $mobile;
[$c, $j] = smb('/create-order', $body);
$url = (string)($j['data']['payment_url'] ?? '');
if (strpos($url, 'https://smbupi.com/') !== 0) out(502, ['error' => $j['message'] ?? $j['error'] ?? 'Payment gateway error']);
out(200, ['payment_url' => $url]);
