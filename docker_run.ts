#!/usr/bin/env node

import * as _ from 'lodash';
import * as shell from 'shelljs';

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const HA_REG_EXPIRE = process.env.HA_REG_EXPIRE || 60;
const NODE_PORT = process.env.NODE_PORT || 3000;
const SERVICE_NAME = process.env.SERVICE_NAME || "default";
const THRASHING_MACHINE = process.env.THRASHING_MACHINE;

if (!REDIS_HOST){
  console.log("-- ERROR: REDIS_HOST is not set. Exit.");
  process.exit(1);
}
console.log(`++ Redis address: ${REDIS_HOST}`);

shell.exec('service rsyslog restart');

if (THRASHING_MACHINE) {
  shell.exec('INNER_PORT=80 /usr/bin/node --max_old_space_size=10000 server.js');
} else {
  shell.exec('/usr/bin/forever start -c \"/usr/bin/node --stack_trace_limit=0\" -m 10 --minUptime 500 --spinSleepTime 600 server.js',  {silent:true});
  register_us();
}

function register_us(){
  while (1){
    let myip = shell.exec("/usr/bin/curl -m 2 http://169.254.169.254/latest/meta-data/local-ipv4 2>/dev/null");
    if (myip.code === 0){
      let ip = myip.stdout;
      shell.exec(`/usr/bin/redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} setex /upstreams/${SERVICE_NAME}/${process.env.HOSTNAME}  ${HA_REG_EXPIRE} \"${ip} ${ip}:${NODE_PORT}\"`,  {silent:true});
    }
    else {
      console.log("-- ERROR: Could not determine local ip address. Exit.");
      process.exit(1);
    }

    const isWaffleServerNotRunning = _.trim((shell.exec('/usr/bin/forever list | /bin/grep server.js | wc -l', {silent: true}) as shell.ExecOutputReturnValue).stdout) != '1';
    if (isWaffleServerNotRunning) {
        console.log("-- ERROR: ws is failed to start. Exit.");
        shell.exec('/usr/bin/forever stopall');
        process.exit(1);
    }

    shell.exec('sleep 2');
  }
}

