//  The node program that captures local performance data and sends it up to the socket.io server
// Req:
// - farmhash
// - socket.io-client
const os = require("os");
const io = require("socket.io-client");
// This will make or at least request a connection to our socket io server.
const socket = io("http://127.0.0.1:8181");

socket.on("connect", () => {
  // console.log("I connected to the socekt server.. hooray!");
  // We need a way to identify this machine to whoever concerned
  // os.networkInterfaces의 경우 one big object를 return 하는데 이떄 internal은 true인 것은 모두
  // MAC address가 00:00:00:00:00:00 local 이기 때문에 걸러줘야한다 왜냐하면 unique 값이 아니기 때문이다.
  // internal: true 가 아닌 경우 오직 첫번째 요소만 신경쓰면된다. 나머지는 동일하기때문엗
  const nI = os.networkInterfaces();
  let macA;
  // loop through all the nI for this machine and find a non-internal one
  for (let key in nI) {
    if (!nI[key][0].internal) {
      macA = nI[key][0].mac;
      break;
    }
  }

  //   client auth with single key value
  socket.emit("clientAuth", "5afkopskfpefkpo3123");

  //   Start sending over data on interval
  let perfDataInterval = setInterval(() => {
    performanceData().then(allPerformanceData => {
      //   console.log(allPerformanceData);
      // This will get the clock ticking where everyone second we will send over to this place
      // which is where our socket.io server is listening
      socket.emit("perfData", allPerformanceData);
    });
  }, 1000);
});

function performanceData() {
  return new Promise(async (resolve, reject) => {
    const cpus = os.cpus();
    // What do we need to know from node about performace?
    // - CPU load (current)
    // - Memory Usage
    //  - free
    const freeMem = os.freemem();
    //  - total
    const totalMem = os.totalmem();
    //  - usedMem
    const usedMem = totalMem - freeMem;
    // memUsage
    const memUsage = Math.floor((usedMem / totalMem) * 100) / 100;
    // - OS type
    const osType = os.type(); // Windows_NT
    // - uptime
    // uptime 이란 서버가 가동된 시간
    // 재부팅이 없이 연속적으로 서버가 다운없이 지속된 시간을 말합니다.
    const upTime = os.uptime();

    // - CPU info
    // os.cpus() returns an array of objects containing information about each logical CPU core
    // core * 2
    //   - Type
    const cpuModel = cpus[0].model;
    //   - Number of Cores:
    const numCores = cpus.length;
    //   - Clock Speed:
    const cpuSpeed = cpus[0].speed;
    // Model as well as speed will be the same no matter what which core is

    const cpuLoad = await getCpuLoad();
    resolve({
      freeMem,
      totalMem,
      usedMem,
      osType,
      upTime,
      cpuModel,
      numCores,
      cpuSpeed,
      cpuLoad
    });
  });
}

// CPUs is all numCores, we need the average of all the cores which will give us the CPU average
function cpuAverage() {
  // Everytime cpuAverage is called, it will refresh this cpu data.
  const cpus = os.cpus();
  // Get Milliseconds each mode, But this number is since reboot
  // so get it now, and git it in 100ms and compare
  let idleMs = 0;
  let totalMs = 0;
  // Loop Through Each Core
  cpus.forEach(aCore => {
    // Loop Through Each Property of the current core
    for (type in aCore.times) {
      //   console.log(type);
      totalMs += aCore.times[type];
    }

    idleMs += aCore.times.idle;
  });

  return {
    idle: idleMs / cpus.length,
    total: totalMs / cpus.length
  };
}

// Because the times property is time since boot, We will get now times,
// and 100ms from now times Compare them, that will give us current load
// This is asynchronou function because there is a setTimeout. Let's return new Promise
// to make this function as an asynchronou function.
function getCpuLoad() {
  return new Promise((resolve, reject) => {
    const start = cpuAverage();
    setTimeout(() => {
      const end = cpuAverage();
      const idleDifference = end.idle - start.idle;
      const totalDifference = end.total - start.total;
      // console.log(idleDifference, totalDifference);
      // To calculate the % of used CPU
      const percentageCpu =
        100 - Math.floor((100 * idleDifference) / totalDifference);
      resolve(percentageCpu);
    }, 100);
  });
}
