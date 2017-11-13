#!/bin/bash

set -x

sudo service haproxy restart

export RELEASE_DATE=`date -u +%FT%TZ`
export WAFFLE_SERVER_VERSION=$(nodejs -p "require('./package.json').version")
export DOCKER_HOST="${HOSTNAME}"
export HOST="${STACK_NAME}-${MACHINE_SUFFIX}-${WAFFLE_SERVER_VERSION}-${RELEASE_DATE}-${DOCKER_HOST}"

> /etc/default/telegraf
echo -ne "export NODE_ENV=\"${NODE_ENV}\"\n" >> /etc/default/telegraf
echo -ne "export RELEASE_DATE=\"${RELEASE_DATE}\"\n" >> /etc/default/telegraf
echo -ne "export STACK_NAME=\"${STACK_NAME}\"\n" >> /etc/default/telegraf
echo -ne "export DOCKER_HOST=\"${DOCKER_HOST}\"\n" >> /etc/default/telegraf
echo -ne "export TELEGRAF_DEBUG_MODE=\"${TELEGRAF_DEBUG_MODE}\"\n" >> /etc/default/telegraf
echo -ne "export INFLUXDB_HOST=\"${INFLUXDB_HOST}\"\n" >> /etc/default/telegraf
echo -ne "export INFLUXDB_DATABASE_NAME=\"${INFLUXDB_DATABASE_NAME}\"\n" >> /etc/default/telegraf
echo -ne "export INFLUXDB_USER=\"${INFLUXDB_USER}\"\n" >> /etc/default/telegraf
echo -ne "export INFLUXDB_PASSWORD=\"${INFLUXDB_PASSWORD}\"\n" >> /etc/default/telegraf
echo -ne "export MACHINE_SUFFIX=\"${MACHINE_SUFFIX}\"\n" >> /etc/default/telegraf
echo -ne "export WAFFLE_SERVER_VERSION=\"${WAFFLE_SERVER_VERSION}\"\n" >> /etc/default/telegraf
echo -ne "export HOST=\"${HOST}\"\n" >> /etc/default/telegraf

sleep 100

sudo service telegraf restart

while true; do
  ./confd -node ${REDIS_HOST}:${REDIS_PORT} -onetime=true
  sleep 10
done
