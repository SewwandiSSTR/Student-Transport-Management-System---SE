<?php
declare(strict_types=1);
const DB_HOST='localhost', DB_NAME='saferide', DB_USER='root', DB_PASS='';
session_set_cookie_params(['httponly'=>true,'samesite'=>'Lax']);
session_start();
if(empty($_SESSION['csrf'])) $_SESSION['csrf']=bin2hex(random_bytes(16));
try{
  $pdo=new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4',DB_USER,DB_PASS,
    [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
}catch(PDOException $e){ http_response_code(500); header('Content-Type: application/json'); exit(json_encode(['error'=>'Database not ready. Start MySQL and run setup.php first.'])); }
