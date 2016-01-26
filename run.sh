#!/bin/bash

forever stopall
redis-cli flushall
redis-cli flushdb

#NODE_ENV=development \
#LOG_LEVEL=debug \
#LOG_TRANSPORTS=console,file \
AWS_SECRET_ACCESS_KEY= \
AWS_ACCESS_KEY_ID= \
S3_BUCKET= \
SESSION_SECRET= \
GOOGLE_CLIENT_ID= \
GOOGLE_CLIENT_SECRET= \
MONGODB_URL= \
NEO4J_URL= \
forever start --logFile forever.log --outFile logs/out.log --errFile logs/err.log -a -p logs --minUptime 1000 --spinSleepTime 1000000 ./server.js
