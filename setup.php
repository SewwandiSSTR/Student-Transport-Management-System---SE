<?php
// Run once: http://localhost/saferide/setup.php  (then delete this file)
$pdo=new PDO('mysql:host=localhost;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$pdo->exec(file_get_contents(__DIR__.'/schema.sql'));
$pdo->exec('USE saferide');
if($pdo->query('SELECT COUNT(*) FROM users')->fetchColumn()) exit('Already installed. Delete setup.php.');
$ins=$pdo->prepare('INSERT INTO users(username,password_hash,full_name,role) VALUES(?,?,?,?)'); $id=[];
foreach([['admin','admin123','Transport Officer','admin'],['driver','driver123','Sunil Perera','driver'],['parent','parent123','Nimali Fernando','parent'],['guardian2','guardian123','Ruwan Jayasuriya','parent'],['guardian3','guardian123','Chamari Wijesinghe','parent']] as $u){
  $ins->execute([$u[0],password_hash($u[1],PASSWORD_DEFAULT),$u[2],$u[3]]); $id[$u[0]]=(int)$pdo->lastInsertId(); }
$pdo->exec("INSERT INTO vehicles(plate,capacity) VALUES('NB-4821',30),('NC-7305',4)");
$pdo->exec("INSERT INTO drivers(user_id,name,phone,license) VALUES({$id['driver']},'Sunil Perera','0771234567','B1234567'),(NULL,'Kamal Silva','0719876543','B7654321')");
$pdo->exec("INSERT INTO routes(name,depart_time,vehicle_id,driver_id) VALUES('Negombo – Seeduwa','06:45',1,1),('Ja-Ela – Wattala','07:00',2,2)");
$pdo->exec("INSERT INTO stops(route_id,name,seq) VALUES(1,'Negombo Town',1),(1,'Kochchikade',2),(1,'Katana',3),(1,'Seeduwa',4),(1,'School',5),(2,'Ja-Ela',1),(2,'Ekala',2),(2,'Kandana',3),(2,'School',4)");
$pdo->exec("INSERT INTO students(name,grade,parent_id,route_id,stop_id) VALUES('Dineth Fernando','Grade 5',{$id['parent']},1,2),('Sasha Fernando','Grade 2',{$id['parent']},1,2),('Ravindu Jayasuriya','Grade 8',{$id['guardian2']},1,3),('Ishara Wijesinghe','Grade 6',{$id['guardian3']},2,7)");
echo 'Database ready. <a href="index.php">Open SafeRide</a>. Delete setup.php now.';
