#! /bin/bash

while [ "$(ping -c 1  keyserver.ubuntu.com > /dev/null ; echo $?)" != 0 ]; do
    sleep 1
    echo "Key server is unaccessable"
done

sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.6.list
sudo apt-get update
sudo apt-get install -y mongodb-org

curl -sSO https://dl.google.com/cloudagents/install-monitoring-agent.sh
sudo bash install-monitoring-agent.sh

curl -sSO https://dl.google.com/cloudagents/install-logging-agent.sh
sudo bash install-logging-agent.sh

export LOG_PATH=/var/log/mongodb
mkdir -p $LOG_PATH
touch $LOG_PATH/mongo-runner-script.log
sudo chmod 666 $LOG_PATH/mongo-runner-script.log

export MONGODB_USER=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/mongodb-user" -H "Metadata-Flavor: Google")
export MONGODB_USER_ROLE=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/mongodb-user-role" -H "Metadata-Flavor: Google")
export MONGODB_PASSWORD=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/mongodb-password" -H "Metadata-Flavor: Google")
export MONGODB_NAME=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/mongodb-name" -H "Metadata-Flavor: Google")
export MONGODB_PORT=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/mongodb-port" -H "Metadata-Flavor: Google")
export MONGODB_PATH=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/mongodb-path" -H "Metadata-Flavor: Google")
export MONGODB_INTERNAL_IP=$(hostname --ip-address)

sudo mkdir -p ${MONGODB_PATH:-/data/db}

sudo mongod --bind_ip 0.0.0.0 --port ${MONGODB_PORT} --dbpath "${MONGODB_PATH:-/data/db}" &

while [ $(pgrep mongod) = "" ]; do
    sleep 1
    echo "Mongo daemon isn't started. Waiting.." >> $LOG_PATH/mongo-runner-script.log
done

COUNTER=0
grep -q 'waiting for connections on port' $LOG_PATH/mongod.log
while [[ $? -ne 0 && $COUNTER -lt 60 ]] ; do
    sleep 2
    let COUNTER+=2
    echo "Waiting for mongo to initialize... ($COUNTER seconds so far)"
    grep -q 'waiting for connections on port' $LOG_PATH/mongod.log
done

echo "Mongo service is active and ready to work." >> $LOG_PATH/mongo-runner-script.log

mongo ${MONGODB_NAME} --port ${MONGODB_PORT} --eval "db.dropAllUsers(); db.createUser({user: '${MONGODB_USER}', pwd: '${MONGODB_PASSWORD}', roles: [{role: '$MONGODB_USER_ROLE', db: '${MONGODB_NAME}'}]})"

exit
