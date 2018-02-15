#!/bin/bash -e
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.6.list
sudo apt-get update
sudo apt-get install -y mongodb-org

export LOG_PATH=/var/log/mongodb/
mkdir -p $LOG_PATH
touch $LOG_PATH/mongo-runner-script.log

mkdir -p /data/db

export MONGO_USER=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/mongo_user" -H "Metadata-Flavor: Google")
export MONGO_USER_ROLE=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/mongo_user_role" -H "Metadata-Flavor: Google")
export MONGO_PASSWORD=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/mongo_password" -H "Metadata-Flavor: Google")
export MONGO_DB=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/mongo_db" -H "Metadata-Flavor: Google")
export MONGO_PORT=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/mongo_db" -H "Metadata-Flavor: Google")

mongod --bind_ip 127.0.0.1 --port ${MONGO_PORT} &

while [ $(systemctl is-active mongod) = "inactive" ]; do
    sleep 1
    echo "Service inactive. Trying." >> $LOG_PATH/mongo-runner-script.log
done

mongo --host 127.0.0.1:${MONGO_PORT} ${MONGO_DB} --eval "db.dropAllUsers(); db.createUser({user: '${MONGO_USER}', pwd: '${MONGO_PASSWORD}', roles: [{role: '$MONGO_USER_ROLE', db: '${MONGO_DB}'}]})"
