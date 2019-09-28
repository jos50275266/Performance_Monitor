// Socket.io server that will service both node and react clients
// Req:
// - socket.io
// - socket.io-redis
// - farmhash

// Entry Point for our cluster which will make workers
// and the workers will do the Socket.io handling

const cluster = require("cluster");
const http = require("http"); // extension of net module
const numCPUs = require("os").cpus().length;

if (cluster.isMaster) {
  // The process id that my operating system assigned to it.
  // https://www.google.com/search?q=process.pid&sxsrf=ACYBGNTwlTw6flvAM2kAbawLjss0DDoe-w:1569645903514&tbm=isch&source=iu&ictx=1&fir=iCoOHu5kj3rmKM%253A%252ChrolgowdkdS_8M%252C_&vet=1&usg=AI4_-kSU9_7uYhUuUyo9W80xvdH_ijmFGg&sa=X&ved=2ahUKEwiL5oHU2vLkAhVmFqYKHXTmCisQ9QEwAHoECAQQAw#imgrc=iCoOHu5kj3rmKM:
  console.log(`Master ${process.pid} is running`);

  // Fork workers. How many cores does this computer have
  for (let i = 0; i < numCPUs; i++) {
    // This fork method is going to start running other programs. So it's going to grab
    // the same program and it's going to run it again and it will bring in cluster.
    // It will bring in HTTP, and numCPUs
    cluster.fork();
    // Each time it forks it skips the next(cluster.isMaster) 부분 because there's not the master
    // and it sets up independent HTTP Server that's able to listen on prot 8000
    // The brilliance is that you have a whole bunch of workers that are able to share the same port
    // because normally only one process is allowed per port. That's exactly what the cluster module is able to do here.
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  // Workers can share any TCP connection
  // In this case it is an HTTP server
  http
    .createServer((req, res) => {
      res.writeHead(200);
      res.end("hello world\n");
      console.log(`Worker ${process.pid} has been called`);
    })
    .listen(8000);

  console.log(`Worker ${process.pid} started`);
}

