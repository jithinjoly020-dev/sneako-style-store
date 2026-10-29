<?php
// Import-from-URL helper for the static cPanel admin. Admin-only: checks the caller's sign-in with the database.
header('Content-Type: application/json');
header('Cache-Control: no-store');
$cfg = require __DIR__ . '/config.php';
function out($c, $d) { http_response_code($c); echo json_encode($d); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['error' => 'POST only']);

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
$token = trim(preg_replace('/^Bearer\s+/i', '', $auth));
if (!$token) out(401, ['error' => 'Sign in as admin first.']);

function req($url, $headers = [], $post = null) {
  $ch = curl_init($url);
  $o = [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 4,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS, CURLOPT_HTTPHEADER => $headers,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'];
  if ($post !== null) { $o[CURLOPT_POST] = true; $o[CURLOPT_POSTFIELDS] = json_encode($post); }
  curl_setopt_array($ch, $o);
  $raw = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $final = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
  curl_close($ch);
  return [$code, (string)$raw, $final];
}

$h = ['apikey: ' . $cfg['db_key'], 'Authorization: Bearer ' . $token, 'Content-Type: application/json'];
[$c, $raw] = req($cfg['db_url'] . '/auth/v1/user', $h);
$user = json_decode($raw, true);
if ($c !== 200 || empty($user['id'])) out(401, ['error' => 'Sign in as admin first.']);
[$c, $raw] = req($cfg['db_url'] . '/rest/v1/rpc/has_role', $h, ['_user_id' => $user['id'], '_role' => 'admin']);
if ($c !== 200 || trim($raw) !== 'true') out(403, ['error' => 'Admins only.']);

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$url = trim((string)($body['url'] ?? ''));
$p = parse_url($url);
$host = strtolower($p['host'] ?? '');
if (!in_array($p['scheme'] ?? '', ['http', 'https'], true) || !$host) out(400, ['error' => 'Paste a full product link starting with https://']);
$ip = gethostbyname($host);
if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) out(400, ['error' => 'That address is not allowed.']);

[$c, $html, $final] = req($url, ['Accept: text/html']);
if ($c < 200 || $c >= 300) out(502, ['error' => "That page could not be opened ($c)."]);
$html = substr($html, 0, 3000000);

function dec($s) { return html_entity_decode($s, ENT_QUOTES | ENT_HTML5, 'UTF-8'); }
function strip($s) { return trim(preg_replace("/\n{3,}/", "\n\n", dec(strip_tags(preg_replace('/<br\s*\/?>|<\/p>/i', "\n", $s))))); }
function meta($html, $k) {
  if (preg_match('/<meta[^>]+(?:property|name)=["\']' . preg_quote($k, '/') . '["\'][^>]*>/i', $html, $m)
      && preg_match('/content=["\']([^"\']*)["\']/i', $m[0], $n)) return dec($n[1]);
  return '';
}
function absu($u, $base) {
  if (!$u) return '';
  if (str_starts_with($u, '//')) return 'https:' . $u;
  if (preg_match('#^https?://#i', $u)) return $u;
  $b = parse_url($base);
  return $b['scheme'] . '://' . $b['host'] . (str_starts_with($u, '/') ? $u : '/' . $u);
}
function findp($n) {
  if (!is_array($n)) return null;
  $t = $n['@type'] ?? null;
  if ($t === 'Product' || (is_array($t) && in_array('Product', $t, true))) return $n;
  if (isset($n['@graph'])) return findp($n['@graph']);
  if (array_is_list($n)) foreach ($n as $x) { $f = findp($x); if ($f) return $f; }
  return null;
}

$out = ['name' => '', 'description' => '', 'price' => 0, 'currency' => 'INR', 'images' => [], 'sizes' => [], 'colors' => [], 'source' => $final];
preg_match_all('/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i', $html, $ms);
foreach ($ms[1] as $j) {
  $pr = findp(json_decode(trim($j), true));
  if (!$pr) continue;
  if (!$out['name']) $out['name'] = (string)($pr['name'] ?? '');
  if (!$out['description']) $out['description'] = strip((string)($pr['description'] ?? ''));
  foreach ((array)($pr['image'] ?? []) as $i) $out['images'][] = absu(is_array($i) ? ($i['url'] ?? '') : (string)$i, $final);
  $off = $pr['offers'] ?? [];
  if (array_is_list($off) && $off) $off = $off[0];
  $price = (float)($off['price'] ?? $off['lowPrice'] ?? 0);
  if ($price && !$out['price']) { $out['price'] = $price; $out['currency'] = (string)($off['priceCurrency'] ?? 'INR'); }
}
if (!$out['name']) $out['name'] = meta($html, 'og:title') ?: (preg_match('/<title[^>]*>([\s\S]*?)<\/title>/i', $html, $t) ? strip($t[1]) : '');
if (!$out['description']) $out['description'] = meta($html, 'og:description') ?: meta($html, 'description');
if (!$out['price']) { $out['price'] = (float)(meta($html, 'product:price:amount') ?: meta($html, 'og:price:amount')); $out['currency'] = meta($html, 'product:price:currency') ?: $out['currency']; }
$out['images'][] = absu(meta($html, 'og:image'), $final);

// Shopify stores expose sizes/colours/all photos at /products/<handle>.js
$fp = parse_url($final);
if (preg_match('#/products/[^/]+#', $fp['path'] ?? '')) {
  [$c2, $js] = req($fp['scheme'] . '://' . $fp['host'] . rtrim($fp['path'], '/') . '.js');
  $s = $c2 === 200 ? json_decode($js, true) : null;
  if (is_array($s)) {
    if (!empty($s['title'])) $out['name'] = $s['title'];
    if (!empty($s['description'])) $out['description'] = strip($s['description']);
    if (!empty($s['price'])) $out['price'] = $s['price'] / 100;
    if (!empty($s['images'])) $out['images'] = array_map(fn($i) => absu($i, $final), $s['images']);
    foreach ($s['options'] ?? [] as $o) {
      if (preg_match('/size/i', $o['name'])) $out['sizes'] = $o['values'];
      elseif (preg_match('/colou?r/i', $o['name'])) $out['colors'] = $o['values'];
    }
  }
}
$out['images'] = array_slice(array_values(array_unique(array_filter($out['images']))), 0, 12);
if (!$out['name']) out(422, ['error' => 'No product details found on that page.']);
out(200, ['product' => $out]);
