#!/bin/bash

git clone git@github.com:swagger-api/swagger-ui.git
cd swagger-ui

git checkout tags/v2.1.4

if [ "$WS_URL" ];then
    linkWS=$WS_URL
else
   linkWS='http://localhost:3000/api-docs.json'
fi

linkDefault="http://petstore.swagger.io/v2/swagger.json"

sed -i.bak "s#$linkDefault#$linkWS#g" ./dist/index.html

open ./dist/index.html
