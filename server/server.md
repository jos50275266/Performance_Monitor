# Cluster

- A single instance of Node.js runs in a single thread. To take advantage of multi-core systems, the user will sometimes want to launch a cluster of Node.js processes to handle the load. The cluster module allows easy creating of <b>child processes</b> that all share server ports.

- Node.js process is still a single thread program even with the cluster module. What the cluster module allows us to do is run a whole bunch of individual node programs on a bunch of individual threads. So they're not gonna have anything to do with each other. They're not going to know about each other except for any code that we write to bridge them togetehr. But this is a way to get performance out of nodejs that otherwise you would miss. If you have an application on an eight core machine and the only thing a machine is doing is running a node program. You're only ever going to use one thread which is no good. You're going to want to listen for connection on all your threads and get everythin out of CPU that you can.

- To be honest, the starter is almost perfect for most applications meaning the only thing that you'd ever need to change is down here which is what happens inside of the workers section

## Sticky Load Balancing

// https://socket.io/docs/using-multiple-nodes/

- If you plan to distribute the load of connections among different processes or machines, you have to make sure that requests associated with a particular session id connect to the process that originated them.

- This is due to certain transports like XHR Polling or JSONP Polling relying on firing several requests during the lifetime of the “socket”. Failing to enable sticky balancing will result in the dreaded:

- proxy 등의 문제는 web-socket 사용시 문제가되지만, socket.io는 이런 것을 다 처리해준다.

## Using Node.JS Cluster

- Just like NginX, Node.JS comes with built-in clustering support through the cluster module.

- Fedor Indutny has created a module called sticky session that ensures file descriptors (ie: connections) are routed based on the originating remoteAddress (ie: IP). Please note that this might lead to unbalanced routing, depending on the hashing method.

- You could also assign a different port to each worker of the cluster, based on the cluster worker ID, and balance the load with the configuration that you can find above.

Socket.io is doing multiple requests to perform handshake and establish connection with a client. With a cluster those requests may arrive to different workers, which will break handshake protocol.

- Sticky-sessions module is balancing requests using their IP address. Thus client will <b>always connect to same worker server</b>, and socket.io will work as expected, but on multiple processes!

// https://github.com/elad/node-cluster-socket.io