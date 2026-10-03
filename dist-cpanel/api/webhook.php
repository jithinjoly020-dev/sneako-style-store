<?php
require __DIR__ . '/lib.php';
$raw = file_get_contents('php://input');
$given = strtolower($_SERVER['HTTP_X_PAYINDIA_SIGNATURE'] ?? '');
if (!hash_equals(hash_hmac('sha256', $raw, $cfg['webhook_secret']), $given)) out(401, ['error' => 'Bad signature']);
$p = json_decode($raw, true) ?: [];
$id = $p['data']['order_id'] ?? ($p['order_id'] ?? '');
// Never trust the message alone: re-check with SMB UPI before marking paid.
if (($p['event'] ?? '') === 'payment.success' && valid_id($id)) verify_order($id);
out(200, ['ok' => true]);
