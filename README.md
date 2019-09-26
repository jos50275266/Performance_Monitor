# Performance_Monitor

Socket.io, React, Mongoose, Redis, Express, and Cluster를 이용한 Performance Monitor 구현

# Redis Download Link

- https://github.com/microsoftarchive/redis/releases/tag/win-3.2.100
- cmd 열기

```
redis-server

redis-cli ping
```

## Node.js Cluster Module

- https://nodejs.org/docs/latest-v11.x/api/cluster.html
- A single instance of Node.js runs in a single thread. To take advantage of multi-core systems, the user will sometimes want to launch a cluster of Node.js processes to handle the load.

- What that means is if however many cores your computer has you have to thread for every core. It's very common for a modern CPU to have four cores. In my computer there are four cores on it which means I have eight threads. So there's eight potential things the computer can be doing at any one time.

- Nodejs is made to only use a single thread. That's a very good thing. But there are going to be times where you're going to want to take advantage of all the other threads or the multicore processors because most modern processors have multiple cores. Sometimes you'll want to launch a cluster of Nodejs processes to handle the load and they give us some code.

- Inside of our socket.io server, we want to make a cluster so that if instead of having only three clients, what if we have dozens or have hundreds or have thousands or tens of thousands that needs to scale

- Two node clients over here is going to be with the cluster module

- We can get much more efficient if instead of only having one socket.io, server we spawn it out across all the threads

- Inside here we're going to have what's called a master node and this thing is not going to do any work. This thing is like the manager. So if you've used a load-balancer befor such as kubernatics or something. This thing is in charge of all the individual workers.

- I have four cores on my Mac. So I've got eight threads to work with. I'm going to draw eight boxes here. The master node right here in the middle is going to pass work on to each of these workers(little boxes or thread) who's ever free. Whoever can handle the work going to make this connection.

- When the A node client is going to go through the port and run in the master node. The master node is going to pick which worker it should be assigned and it's going to run on that thread. Node is still a single-threaded language. We're only using one thread 별표. It's not multi-threaded like Java where you can spawn out and you could use this to do something.

- We're still going to run our entire program on a single thread. It's just we're going to run out program a bunch of times on a bunch of diffrent threads. But we can make use of this worker A 별포 as well as this worker B별포. But they're going to be totally separate node program.

- Depending on whether you've used the cluster module or how much scaling you've done before you might see the immediate or instant problem. This client is going to have its own scope meaning any variables that are stored in there or any connection that's made it knows about those. But the connection made here 삼각형, it will have no idea those exist. These processes are independent of each other. Now processes can talk to each other and that's where we're headed. But out of the box if we just use the cluster module there is no way for these things to talk to each other which is not ok because if one thing emits they all need to know that emit happen and if an event listener comes in the same thing needs to happen.

- There's another thing going on here is that these node clients that we've got over here. It's very possible they're going to behind some kind of proxy or a load-balance or something like that. That's one of the reasons that you need to use socket.io instead of websocket. We can't use web-sockets because we can't connect through a proxy or a load-balancer. But we can make AJAX requests that's what the long pooling part is. Connection A and B are going to happen across long pooling. Well if they get disconnected or because we need to keep making new AJAX requests constantly, they won't be able to get back to the correct clients. The B one here all of the listeners associated with it are going to be on this worker 동그라미. None of these other ones even know that exists or that node is ever connected. We need to make sure that we can get back to that same node.

- sticky load balancing
  https://socket.io/docs/using-multiple-nodes/

```
If you plan to distribute the load of connections among different processes or machines, you have to make sure that requests associated with a particular session id connect to the process that originated them.
```

This means the B one here we need to make sure that it always gets back to the correct worker(thread). This is due to certain transport like XHR polling or JSON P pooling relying on firing several requests during the lifetime of the socket.

- We don't have a regular web-socket to work with. So we're going to just constantly pool. And that means we always need to get back to the same client. Well if you don't get back to the same client you're gonna get this threaded 400 Error. Depending on how long you've worked with web-sockets that is one of the most frustrating things.

- What it would mean is let's say the A client gets disconnected and then the blue client comes back, but this time it goes to this worker over here 세모. Everything that this client is over here 오각형 and this new work thinks that this is new socket join and a new socket didn't get. So sticky sessions have been added and you can kind of go over how that works if you have web-sockets you don't suffer from this problem because the TCP connection is kept open for forever. But the reason we use socket.io is because we need a fallback. We want to have long pooling available.

- Passing between multiple nodes accepting multiple connections.
- adapter!
- We need the adapter across multiple applications or multiple processes for them to be able to talk to each other. This thing was made to extend the redis socket.io adapter.

socket.io-redis

- By running socket.io with the socket.io-redis adapter you can run multiple socket.io instances in different processes or servers that can all broadcast and emit events to and from each other.

- Redis is if you use say redux before it works a little bit. If any thing happens on this worker 오각형 node, it's going to be able to communicate that events to the Redis as adaptor and the redis adapter will let every else know about it. It's a little like a redux where we have a single store that manages everything and that if this worker needs to know about somethig it will be able to talk to the redis server.

- The workers(threads) will be able to communicate through the adapter and it will really go through go through the master node. The redis adapter extends the stock adapter and allows our socketio server if a client disconnects and reconnects or is using AJAX pooling or something like that 점선부분. To use the Redis server to find the original worker that they belong at where all of the data that they need is stored and the listeners and so on.
  It will also allows clustered down here is doing its job by allowing us to scale.

- Again it's not like multi threading in say Java where you're able to divide up the same task across multiple threads. We have one task that's running on one thread we're just running the same task a whole bunch of times. So if we in this case got eight requests all at the exact same time they could all be distributed evenly across all the workers and they could all be done at the same time. We just need redis server up here along with the adapter to make sue that the client gets back to the correct worker.

- The next step we could use this exact same system if we let's say we're on azure or aws and we wanted to spin up a whole bunch of servers to run our socket program, we would be able to do something very similar with that.

- 1. We're going to have our node clients
- 2. We're going to have our socket.io server we're going to breack that up into a cluster so we'll have the main program(Master Node)
- 3. We'll have the redis server which will allow all of the sockets to maintain normal communication
