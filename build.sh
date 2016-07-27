#!/bin/bash

 
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} --no-cache --build-arg PATH_TO_DDF_REPOSITORIES=/home/waffle-server/ddf --build-arg DEFAULT_USER_PASSWORD=... --build-arg MONGODB_URL=... --build-arg NEO4J_URL=... --build-arg NEW_RELIC_LICENSE_KEY=... --build-arg REDIS_HOST=... .

