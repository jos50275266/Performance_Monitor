const mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1/perfData", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Machine = require("./models/Machine");

function socketMain(io, socket) {
  //   console.log("A socket connected!", socket.id);
  let macA;
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

  // a machine has connected, check to see if it is new
  // if it is, add it!!
  socket.on("initPerfData", data => {
    // console.log(data);
    // Update our socket function scoped variable
    macA = data.macA;
    // Now go check Mongo.
    // macA will be the key
    checkAndAdd(macA);
  });

  socket.on("perfData", data => {
    console.log(data);
  });
}

module.exports = socketMain;
