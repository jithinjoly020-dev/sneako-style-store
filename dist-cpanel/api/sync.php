<?php
// Copies new/changed orders, order items and products into your cPanel MySQL database.
// Runs from cron (every minute) and right after each checkout.
require __DIR__ . '/lib.php';
if (empty($cfg['mysql_db'])) out(200, ['skipped' => 'MySQL not configured']);
$pdo = new PDO('mysql:host=' . ($cfg['mysql_host'] ?? 'localhost') . ';dbname=' . $cfg['mysql_db'] . ';charset=utf8mb4',
  $cfg['mysql_user'], $cfg['mysql_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec(file_get_contents(__DIR__ . '/mysql-schema.sql'));
$since = $pdo->query("SELECT v FROM sync_state WHERE k='since'")->fetchColumn() ?: '1970-01-01T00:00:00Z';
[$c, $d] = db_rpc('gateway_export', ['_since' => $since]);
if ($c !== 200) out(502, ['error' => 'Export failed']);

function upsert($pdo, $table, $row, $cols) {
  $vals = array_map(fn($k) => is_array($row[$k] ?? null) ? json_encode($row[$k]) : ($row[$k] ?? null), $cols);
  $sql = "REPLACE INTO `$table` (`" . implode('`,`', $cols) . "`) VALUES (" . rtrim(str_repeat('?,', count($cols)), ',') . ")";
  $pdo->prepare($sql)->execute($vals);
}
$oc = ['id','order_number','customer_name','customer_email','customer_phone','address_line','city','postal_code','country','notes','subtotal','discount','shipping_method','shipping_fee','total','payment_method','payment_status','payment_ref','status','created_at','updated_at'];
$ic = ['id','order_id','product_id','product_name','size','quantity','unit_price','created_at'];
$pc = ['id','name','slug','price','compare_at_price','stock','category','is_active','featured','image_url','updated_at'];
$max = $since;
foreach ($d['orders'] ?? [] as $r) { upsert($pdo, 'orders', $r, $oc); if ($r['updated_at'] > $max) $max = $r['updated_at']; }
foreach ($d['items'] ?? [] as $r) upsert($pdo, 'order_items', $r, $ic);
foreach ($d['products'] ?? [] as $r) { $r['is_active'] = $r['is_active'] ? 1 : 0; $r['featured'] = $r['featured'] ? 1 : 0; upsert($pdo, 'products', $r, $pc); if ($r['updated_at'] > $max) $max = $r['updated_at']; }
$pdo->prepare("REPLACE INTO sync_state (k, v) VALUES ('since', ?)")->execute([$max]);
out(200, ['orders' => count($d['orders'] ?? []), 'products' => count($d['products'] ?? [])]);
