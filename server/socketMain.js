function socketMain(io, socket) {
  //   console.log("A socket connected!", socket.id);

  // What type of client is joining with this room. We can now communicate with just the node clients
  socket.on("clientAuth", key => {
    if (key === "5afkopskfpefkpo3123") {
      // valid nodeClient
      socket.join("clients");
    } else if ((key = "4mpamklamfklsam0")) {
      // valid ui client has joined
      socket.join("ui");
    } else {
      // an invalid client has joined. GoodBye
      socket.disconnect(true);
    }
  });

  socket.on("perfData", data => {
    console.log(data);
  });
}

module.exports = socketMain;
