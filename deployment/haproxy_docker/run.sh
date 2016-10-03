#!/bin/bash

/usr/sbin/haproxy -D -f /etc/haproxy/haproxy.cfg -p /var/run/haproxy.pid

while true; do
  ./confd -node ${REDIS_HOST}:${REDIS_PORT} -onetime=true
  sleep 10
done
