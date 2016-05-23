FROM ubuntu:14.04

RUN apt-get update
RUN apt-get install -y python build-essential libssl-dev openssh-server curl

#RUN curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
#RUN curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
RUN curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -

#Install Node.js v4.x
RUN apt-get install -y nodejs

#Update npm
#RUN npm i -g npm@3.8.1
RUN npm i -g forever

#get & install WS
RUN mkdir /home/waffle-server
WORKDIR /home/waffle-server
COPY ./ ./

RUN npm i
RUN npm run swagger
EXPOSE 3000

ARG REDIS_HOST
ENV REDIS_HOST ${REDIS_HOST}

ARG NEO4J_URL
ENV NEO4J_URL ${NEO4J_URL}

ARG MONGODB_URL
ENV MONGODB_URL ${MONGODB_URL}

ARG AWS_SECRET_ACCESS_KEY
ENV AWS_SECRET_ACCESS_KEY ${AWS_SECRET_ACCESS_KEY}

ARG AWS_ACCESS_KEY_ID
ENV AWS_ACCESS_KEY_ID ${AWS_ACCESS_KEY_ID}

ARG S3_BUCKET
ENV S3_BUCKET ${S3_BUCKET}

ARG SESSION_SECRET
ENV SESSION_SECRET ${SESSION_SECRET}

ARG GOOGLE_CLIENT_ID
ENV GOOGLE_CLIENT_ID ${GOOGLE_CLIENT_ID}

ARG GOOGLE_CLIENT_SECRET
ENV GOOGLE_CLIENT_SECRET ${GOOGLE_CLIENT_SECRET}

ENV NODE_ENV production

CMD ["/usr/bin/forever", "server.js"]
