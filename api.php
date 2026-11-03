<?php
declare(strict_types=1);
require __DIR__.'/config.php';
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
$a=$_GET['a']??''; $in=json_decode(file_get_contents('php://input')?:'[]',true)?:[];
function out(array $d,int $c=200):never{ http_response_code($c); echo json_encode($d); exit; }
function q(string $s,array $p=[]):PDOStatement{ global $pdo; $st=$pdo->prepare($s); $st->execute($p); return $st; }
function need(?string $role=null):void{ global $me; if(!$me) out(['error'=>'Please sign in.'],401); if($role&&$me['role']!==$role) out(['error'=>'You do not have permission for that action.'],403); }
function str(string $k,int $max=60):string{ global $in; $v=trim((string)($in[$k]??'')); if($v===''||mb_strlen($v)>$max) out(['error'=>"Check the $k field."],422); return $v; }
function num(string $k,int $min,int $max):int{ global $in; $v=filter_var($in[$k]??null,FILTER_VALIDATE_INT); if($v===false||$v<$min||$v>$max) out(['error'=>"Check the $k field."],422); return $v; }
$me=null;
if(!empty($_SESSION['uid'])) $me=q('SELECT id,username,full_name name,role FROM users WHERE id=?',[$_SESSION['uid']])->fetch()?:null;

if($a==='state'){
  if(!$me) out(['me'=>null,'csrf'=>$_SESSION['csrf']]);
  $adm=$me['role']==='admin';
  $w=$adm?['1=1',[]]:($me['role']==='driver'?['r.driver_id=(SELECT id FROM drivers WHERE user_id=?)',[$me['id']]]:['r.id IN (SELECT route_id FROM students WHERE parent_id=?)',[$me['id']]]);
  $routes=q("SELECT r.id,r.name,TIME_FORMAT(r.depart_time,'%H:%i') time,r.vehicle_id vehicleId,r.driver_id driverId FROM routes r WHERE $w[0] ORDER BY r.id",$w[1])->fetchAll();
  $ids=[0]; foreach($routes as &$r){ $r['stops']=q('SELECT name FROM stops WHERE route_id=? ORDER BY seq',[$r['id']])->fetchAll(PDO::FETCH_COLUMN); $ids[]=$r['id']; } unset($r);
  $L=implode(',',array_map('intval',$ids));
  $sw=$me['role']==='parent'?' AND s.parent_id='.(int)$me['id']:'';
  $students=q("SELECT s.id,s.name,s.grade,u.username parent,s.route_id routeId,st.name stop FROM students s JOIN users u ON u.id=s.parent_id JOIN stops st ON st.id=s.stop_id WHERE s.route_id IN ($L)$sw ORDER BY s.id")->fetchAll();
  $vehicles=q('SELECT id,plate,capacity FROM vehicles'.($adm?'':" WHERE id IN (SELECT vehicle_id FROM routes WHERE id IN ($L))"))->fetchAll();
  $drivers=q($adm?'SELECT id,name,phone,license FROM drivers':"SELECT id,name,phone FROM drivers WHERE id IN (SELECT driver_id FROM routes WHERE id IN ($L))")->fetchAll();
  $vis=array_column($students,'id'); $att=[];
  foreach(q('SELECT student_id,status FROM attendance WHERE att_date=CURDATE()')->fetchAll() as $x) if(in_array($x['student_id'],$vis)) $att[$x['student_id']]=$x['status'];
  out(['me'=>$me,'csrf'=>$_SESSION['csrf'],'routes'=>$routes,'students'=>$students,'vehicles'=>$vehicles,'drivers'=>$drivers,'att'=>$att,
       'parents'=>$adm?q("SELECT username FROM users WHERE role='parent'")->fetchAll(PDO::FETCH_COLUMN):[]]);
}
if($_SERVER['REQUEST_METHOD']!=='POST') out(['error'=>'POST required.'],405);
if(!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF']??'')) out(['error'=>'Session expired. Reload the page.'],403);
try{
switch($a){
case 'login':
  $u=q('SELECT *,(locked_until>NOW()) locked FROM users WHERE username=?',[str('u',30)])->fetch();
  if($u&&$u['locked']) out(['error'=>'Too many attempts. Try again in a minute.'],429);
  if(!$u||!password_verify((string)($in['p']??''),$u['password_hash'])){
    if($u) q('UPDATE users SET failed_attempts=failed_attempts+1, locked_until=IF(failed_attempts>=3,DATE_ADD(NOW(),INTERVAL 60 SECOND),NULL) WHERE id=?',[$u['id']]);
    out(['error'=>'Wrong username or password.'],401);
  }
  q('UPDATE users SET failed_attempts=0,locked_until=NULL WHERE id=?',[$u['id']]);
  session_regenerate_id(true); $_SESSION['uid']=$u['id']; out(['ok'=>'Signed in']);
case 'register':
  $role=str('role',10);
  if(!in_array($role,['parent','driver'],true)) out(['error'=>'Please select a valid role (Parent or Driver).'],422);
  $u=str('u',30);
  $p=(string)($in['p']??'');
  if(strlen($p)<4) out(['error'=>'Password must be at least 4 characters.'],422);
  $name=str('name',60);
  if(q('SELECT 1 FROM users WHERE username=?',[$u])->fetch()) out(['error'=>'That username is already taken. Please choose another.'],409);
  $pdo->beginTransaction();
  q('INSERT INTO users(username,password_hash,full_name,role) VALUES(?,?,?,?)',[$u,password_hash($p,PASSWORD_DEFAULT),$name,$role]);
  $newUid=(int)$pdo->lastInsertId();
  if($role==='driver'){
    $phone=str('phone',10); $lic=strtoupper(str('license',8));
    if(!preg_match('/^0\d{9}$/',$phone)) out(['error'=>'Phone must be 10 digits starting with 0.'],422);
    if(!preg_match('/^[A-Z]\d{7}$/',$lic)) out(['error'=>'Licence must be a letter followed by 7 digits.'],422);
    q('INSERT INTO drivers(user_id,name,phone,license) VALUES(?,?,?,?)',[$newUid,$name,$phone,$lic]);
    $newDriverId=(int)$pdo->lastInsertId();
    $targetRouteId=!empty($in['routeId'])?num('routeId',1,PHP_INT_MAX):1;
    if($targetRouteId) q('UPDATE routes SET driver_id=? WHERE id=?',[$newDriverId,$targetRouteId]);
  }else if($role==='parent'){
    $childName=trim((string)($in['childName']??''));
    if($childName!==''){
      $grade=trim((string)($in['grade']??'Grade 1'));
      $rid=!empty($in['routeId'])?num('routeId',1,PHP_INT_MAX):1;
      $stopName=trim((string)($in['stop']??''));
      $stopId=0;
      if($stopName!=='') $stopId=(int)q('SELECT id FROM stops WHERE route_id=? AND name=?',[$rid,$stopName])->fetchColumn();
      if(!$stopId) $stopId=(int)q("SELECT id FROM stops WHERE route_id=? AND name!='School' ORDER BY seq LIMIT 1",[$rid])->fetchColumn();
      if($stopId) q('INSERT INTO students(name,grade,parent_id,route_id,stop_id) VALUES(?,?,?,?,?)',[$childName,$grade,$newUid,$rid,$stopId]);
    }
  }
  $pdo->commit();
  session_regenerate_id(true); $_SESSION['uid']=$newUid; out(['ok'=>'Account created successfully! Welcome to SafeRide.']);
case 'logout': session_destroy(); out(['ok'=>'Signed out']);
case 'mark':
  need('driver'); $st=$in['status']??''; if(!in_array($st,['boarded','absent'],true)) out(['error'=>'Invalid status.'],422);
  $sid=num('id',1,PHP_INT_MAX);
  if(!q('SELECT 1 FROM students s JOIN routes r ON r.id=s.route_id JOIN drivers d ON d.id=r.driver_id WHERE s.id=? AND d.user_id=?',[$sid,$me['id']])->fetch()) out(['error'=>'That student is not on your route.'],403);
  q('INSERT INTO attendance(student_id,att_date,status) VALUES(?,CURDATE(),?) ON DUPLICATE KEY UPDATE status=VALUES(status)',[$sid,$st]); out(['ok'=>"Marked $st"]);
case 'addVehicle':
  need('admin'); $p=strtoupper(str('plate',10)); if(!preg_match('/^[A-Z]{2,3}-\d{4}$/',$p)) out(['error'=>'Plate must look like NB-1234.'],422);
  q('INSERT INTO vehicles(plate,capacity) VALUES(?,?)',[$p,num('capacity',1,60)]); out(['ok'=>'Vehicle added']);
case 'addDriver':
  need('admin'); $ph=str('phone',10); $l=strtoupper(str('license',8));
  if(!preg_match('/^0\d{9}$/',$ph)) out(['error'=>'Phone must be 10 digits starting with 0.'],422);
  if(!preg_match('/^[A-Z]\d{7}$/',$l)) out(['error'=>'Licence must be a letter followed by 7 digits.'],422);
  q('INSERT INTO drivers(name,phone,license) VALUES(?,?,?)',[str('name'),$ph,$l]); out(['ok'=>'Driver added']);
case 'addRoute':
  need('admin'); $t=str('time',5); if(!preg_match('/^\d{2}:\d{2}$/',$t)) out(['error'=>'Check the time field.'],422);
  $rName = str('name', 60);
  if(q('SELECT 1 FROM routes WHERE LOWER(name) = LOWER(?)', [$rName])->fetch()) out(['error'=>'A route with the name "' . htmlspecialchars($rName) . '" already exists. Please choose a different name.'], 409);
  $st=array_values(array_filter(array_map('trim',explode(',',str('stops',500))),fn($x)=>$x!==''&&mb_strlen($x)<=60));
  if(!in_array('School',$st,true)) $st[]='School'; if(count($st)<3) out(['error'=>'Add at least two stops before the school.'],422);
  $pdo->beginTransaction();
  q('INSERT INTO routes(name,depart_time,vehicle_id,driver_id) VALUES(?,?,?,?)',[$rName,$t,num('vehicleId',1,PHP_INT_MAX),num('driverId',1,PHP_INT_MAX)]);
  $rid=(int)$pdo->lastInsertId(); foreach($st as $i=>$n) q('INSERT INTO stops(route_id,name,seq) VALUES(?,?,?)',[$rid,$n,$i+1]);
  $pdo->commit(); out(['ok'=>'Route added']);
case 'addStudent':
  need('admin'); $rid=num('routeId',1,PHP_INT_MAX);
  $par=q("SELECT id FROM users WHERE username=? AND role='parent'",[str('parent',30)])->fetchColumn(); if(!$par) out(['error'=>'Guardian account not found.'],422);
  $stop=q('SELECT id FROM stops WHERE route_id=? AND name=?',[$rid,str('stop')])->fetchColumn(); if(!$stop) out(['error'=>'Choose a pick-up stop on that route.'],422);
  $cap=(int)q('SELECT v.capacity FROM routes r JOIN vehicles v ON v.id=r.vehicle_id WHERE r.id=?',[$rid])->fetchColumn();
  if((int)q('SELECT COUNT(*) FROM students WHERE route_id=?',[$rid])->fetchColumn()>=$cap) out(['error'=>'Route is full. Choose another route or a larger vehicle.'],409);
  q('INSERT INTO students(name,grade,parent_id,route_id,stop_id) VALUES(?,?,?,?,?)',[str('name'),str('grade',10),$par,$rid,$stop]); out(['ok'=>'Student registered']);
case 'delete':
  need('admin'); $tbl=['route'=>'routes','vehicle'=>'vehicles','driver'=>'drivers','student'=>'students'][$in['kind']??'']??null;
  if(!$tbl) out(['error'=>'Unknown record.'],422); q("DELETE FROM $tbl WHERE id=?",[num('id',1,PHP_INT_MAX)]); out(['ok'=>'Removed']);
default: out(['error'=>'Unknown action.'],404);
}
}catch(PDOException $e){ if($pdo->inTransaction()) $pdo->rollBack(); out(['error'=>$e->getCode()==='23000'?'That record already exists or is still in use.':'Database error.'],409); }
