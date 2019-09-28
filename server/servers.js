// https://github.com/elad/node-cluster-socket.io

const express = require("express"); //Update Connection에 이용할 HTTP를 사용하기위해
const cluster = require("cluster");
const net = require("net");
// The reason for using this net module is because no one's ever going to connect to
// our master via HTTP, but they're going to come in via TCP
const socketio = require("socket.io");
const helmet = require("helmet");
const socketMain = require("./socketMain");
// const expressMain = require('./expressMain');

const port = 8181;
const num_processes = require("os").cpus().length;

const io_redis = require("socket.io-redis");
const farmhash = require("farmhash");

if (cluster.isMaster) {
  // This stores our workers. We need to keep them to be able to reference
  // them based on source IP address. It's also useful for auto-restart,
  // for example.
  let workers = [];

  // Helper function for spawning worker at index 'i'.
  let spawn = function(i) {
    workers[i] = cluster.fork(); // spawn up another program

    // Optional: Restart worker on exit
    // When any of the workers die the cluster module will emit the 'exit' event
    // If a worker dies this code here is made to get it going again.
    workers[i].on("exit", function(code, signal) {
      // console.log('respawning worker', i);
      spawn(i);
    });
  };

  // Spawn workers.
  for (var i = 0; i < num_processes; i++) {
    spawn(i);
  }

  // Helper function for getting a worker index based on IP address.
  // This is a hot path so it should be really fast. The way it works
  // is by converting the IP address to a number by removing non numeric
  // characters, then compressing it to the number of slots we have.
  //
  // Compared against "real" hashing (from the sticky-session code) and
  // "real" IP number conversion, this function is on par in terms of
  // worker index distribution only much faster.
  const worker_index = function(ip, len) {
    //   always product the same result for the given input on any machine
    console.log("ip", ip);
    console.log("converted ip", farmhash.fingerprint32(ip));
    console.log("converted ip", farmhash.fingerprint32(ip) % len);
    return farmhash.fingerprint32(ip) % len; // Farmhash is the fastest and works with IPv6, too
  };

  // in this case, we are going to start up a tcp connection via the net
  // module INSTEAD OF the http module. Express will use http, but we need
  // an independent tcp port open for cluster to work. This is the port that
  // will face the internet
  const server = net.createServer({ pauseOnConnect: true }, connection => {
    // We received a connection and need to pass it to the appropriate
    // worker. Get the worker for this connection's source IP and pass
    // it the connection.

    let worker = workers[worker_index(connection.remoteAddress, num_processes)];
    // Whatever brought it here will get to the right worker and then of course we listen
    // to the port at the bottom.
    worker.send("sticky-session:connection", connection);
  });

  server.listen(port);
  console.log(`Master listening on port ${port}`);
} else {
  // Note we don't use a port here because the master listens on it for us.
  let app = express();
  app.use(express.static(__dirname + "/public"));
  app.use(helmet());

  // Don't expose our internal server to the outside world.
  // These internal workers will only talk to the master so the master is essentially a little proxy
  // between the outside world and each individual worker right here on line 83
  const server = app.listen(0, "localhost");
  // console.log("Worker listening...");
  const io = socketio(server);

  // Tell Socket.IO to use the redis adapter. By default, the redis
  // server is assumed to be on localhost:6379. You don't have to
  // specify them explicitly unless you want to change them.
  // redis-cli monitor

  // The adapter to use. Defaults to an instance of the Adapter that ships with
  // socket.io which is memory based. It will only allow things to share within their scope
  // with their own namespace. That's why we're going to need redis.
  // We need a solution that is external to our program so that we can share across everything
  // and that is going  to be a redis-adapter.
  io.adapter(io_redis({ host: "localhost", port: 6379 }));

  // Here you might use Socket.IO middleware for authorization etc.
  // on connection, send the socket over to our module with socket stuff
  // Anytime connection is made, we're inside of a worker. We're going to call
  io.on("connection", function(socket) {
    socketMain(io, socket);
    console.log(`connected to worker: ${cluster.worker.id}`);
  });

  // for testing purpose,

  // Listen to messages sent from the master. Ignore everything else.
  // process is internal to the worker. If the worker gets a message, check to see if that message
  // is sticky session connection meaming it came from the server.
  // If is's not retured, we're not going to do anything
  // because we're only listening to messages from the master.

  process.on("message", function(message, connection) {
    if (message !== "sticky-session:connection") {
      return;
    }
    // If it does come from the master then we're going to emualate a connection event on the server
    // Emulate a connection event on the server by emitting the
    // event with the connection the master sent us.

    // This will allow the worker to pretend to make the connection.
    server.emit("connection", connection);

    connection.resume();
  });
}
