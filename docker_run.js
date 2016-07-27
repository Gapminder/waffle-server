#!/usr/bin/env node

'use strict';

const shell = require('shelljs');
const spawn = require('child_process').spawn;

const HAPROXY_REG_ADDRESS = process.env.HAPROXY_REG_ADDRESS;

if (HAPROXY_REG_ADDRESS == ''){
    console.log('!!!  ERROR: HAPROXY_REG_ADDRESS environment variable should be set');
    process.exit(1);
};

const HAPROXY_REG_PORT = process.env.HAPROXY_REG_PORT || 6379;
const IPBOT_ADDRESS = process.env.IPBOT_ADDRESS || HAPROXY_REG_ADDRESS;
const IPBOT_PORT = process.env.IPBOT_PORT || 8099;
const HA_REG_EXPIRE = process.env.HA_REG_EXPIRE || 60;
const NODE_PORT = process.env.NODE_PORT || 3000;


const forever = spawn('/usr/bin/forever', ['-m', 10, '--minUptime', 500, '--spinSleepTime', 600, 'server.js'],  {silent:true});

function register_us(){
  while (1){
    let myip = shell.exec(`/usr/bin/curl ${IPBOT_ADDRESS}:${IPBOT_PORT} 2>/dev/null`);
    if (myip.code == ''){
      let ip = myip.stdout;
    shell.exec(`/usr/bin/redis-cli -h ${HAPROXY_REG_ADDRESS} -p ${HAPROXY_REG_PORT} setex /upstreams/${process.env.HOSTNAME}  ${HA_REG_EXPIRE + 1} ${ip} ${ip}:${NODE_PORT}`,  {silent:true});
    };

    if (shell.exec('/usr/bin/forever list | /bin/grep STOPPED | wc -l',  {silent:true}).stdout != 0) {
        forever.kill();
        process.exit(1);
    };

    shell.exec('sleep 2');
  };
};

register_us();
