#!/bin/bash

/usr/sbin/nl-qdisc-add --dev=lo --parent=1:4 --id=40: --update plug --buffer &> /dev/null
sudo service haproxy restart
/usr/sbin/nl-qdisc-add --dev=lo --parent=1:4 --id=40: --update plug--release-indefinite &> /dev/null
