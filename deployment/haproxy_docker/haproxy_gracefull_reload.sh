#!/bin/bash

/usr/sbin/nl-qdisc-add --dev=lo --parent=1:4 --id=40: --update plug --buffer &> /dev/null
/usr/sbin/haproxy -f /etc/haproxy/haproxy.cfg -p /var/run/haproxy.pid -D -sf $(cat /var/run/haproxy.pid)
/usr/sbin/nl-qdisc-add --dev=lo --parent=1:4 --id=40: --update plug--release-indefinite &> /dev/null
