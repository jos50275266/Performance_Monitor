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

  server.listen(port);
  console.log(`Master listening on port ${port}`);
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
