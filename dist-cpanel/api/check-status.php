<?php
require __DIR__ . '/lib.php';
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$id = $in['order_id'] ?? ($_GET['order_id'] ?? '');
if (!valid_id($id)) out(400, ['error' => 'Bad order']);
out(200, verify_order($id));
