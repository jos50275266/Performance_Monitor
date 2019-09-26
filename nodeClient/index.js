//  The node program that captures local performance data and sends it up to the socket.io server
// Req:
// - farmhash
// - socket.io-client

const os = require("os");
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
