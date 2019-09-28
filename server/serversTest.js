// https://github.com/elad/node-cluster-socket.io

const express = require("express"); //Update Connection에 이용할 HTTP를 사용하기위해
const cluster = require("cluster");
const net = require("net");
const socketio = require("socket.io");
const helmet = require("helmet");
const socketMain = require("./socketMain");

const port = 8181;
const num_processes = require("os").cpus().length;

const io_redis = require("socket.io-redis");
const farmhash = require("farmhash");

if (cluster.isMaster) {
  let workers = [];

  let spawn = function(i) {
    workers[i] = cluster.fork(); // spawn up another program

    workers[i].on("exit", function(code, signal) {
      spawn(i);
    });
  };

  // Spawn workers.
  for (var i = 0; i < num_processes; i++) {
    spawn(i);
  }

  const worker_index = function(ip, len) {
    //   always product the same result for the given input on any machine
    console.log("ip", ip);
    console.log("converted ip", farmhash.fingerprint32(ip));
    console.log("converted ip", farmhash.fingerprint32(ip) % len);
    return farmhash.fingerprint32(ip) % len; // Farmhash is the fastest and works with IPv6, too
  };

  const server = net.createServer({ pauseOnConnect: true }, connection => {
    let worker = workers[worker_index(connection.remoteAddress, num_processes)];
    worker.send("sticky-session:connection", connection);
  });

  server.listen(port, () => {
    console.log(`Master Listening on podsdrt ${port}`);
  });
} else {
  // Note we don't use a port here because the master listens on it for us.
  let app = express();
  app.use(express.static(__dirname + "/public"));
  app.use(helmet());

  const server = app.listen(0, "localhost");
  // console.log("Worker listening...");
  const io = socketio(server);

  io.adapter(io_redis({ host: "localhost", port: 6379 }));

  io.on("connection", function(socket) {
    socketMain(io, socket);
    console.log(`connected to worker: ${cluster.worker.id}`);
  });

  socketMain(io, null);

  process.on("message", function(message, connection) {
    if (message !== "sticky-session:connection") {
      return;
    }
    server.emit("connection", connection);

    connection.resume();
  });
}

/* 정리
1. Cluster Module은 master를 가지고있고, 역할은 어떤 worker가 어디로 가야하는지 알려준다.
2. Worker는 모든 밸런스와 연결(Conection)을 확실히 하기위해 Adapter를 이용해 Redis를 사용한다. 
3. else 이후로, io.on('connection') 을 하고, nodeClient의 index 파일에서 또한 io.on('connect)를 한다.
4. index 파일의 socket은 우리의 socket.io server에 connection을 요청한다.
5. Redis Server를 키고
6. node index.js 를 하고
7. node servers.js 를 하면
8. index에서  servers.js의 socket.io server에 대해 socket.on("connect") event 가 실행된다.
9. servers 에서 io.on("connection") 이벤트를 들음으로써 socketMain 함수가 실행된다.
10. else 의 경우 io.on("connection") 에서 cluster의 worker.id를 출력
11. Worker rnumber is dependent on your IP Address    
12. farmhash는 always returns an exact same result
https://victorydntmd.tistory.com/249
https://github.com/sayar/RedisMVA/blob/master/module6_redis_pubsub/README.md
https://github.com/rajaraodv/redispubsub
*/
