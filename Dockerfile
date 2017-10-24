FROM ubuntu:16.04

RUN apt-get update
RUN apt-get install -y sudo git python build-essential libssl-dev openssh-server curl redis-tools nfs-common rsyslog libkrb5-dev

COPY ./deployment/rsys_conf/rsyslog.conf /etc/rsyslog.conf
COPY ./deployment/rsys_conf/ws.conf /etc/rsyslog.d/ws.conf

RUN curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
RUN apt-get install -y nodejs
RUN npm i -g pm2
RUN npm i -g pm2-logrotate
RUN pm2 install pm2-logrotate
RUN npm i -g shelljs

RUN wget -O /usr/local/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.0/dumb-init_1.2.0_amd64
RUN chmod +x /usr/local/bin/dumb-init

#Add ssh-key for Git
RUN mkdir -p /root/.ssh
COPY dev /root/.ssh/dev
COPY dev.pub /root/.ssh/dev.pub
RUN chmod 400 /root/.ssh/dev
RUN echo "    IdentityFile ~/.ssh/dev" >> /etc/ssh/ssh_config
RUN echo "Host github.com\n\tStrictHostKeyChecking no\n" >> /root/.ssh/config

#get & install WS
RUN mkdir /home/waffle-server
WORKDIR /home/waffle-server

RUN mkdir /home/waffle-server/ddf
VOLUME /home/waffle-server/ddf

COPY package.json .
RUN npm i

EXPOSE 3000
EXPOSE 80

ARG REDIS_HOST
ENV REDIS_HOST ${REDIS_HOST}

ARG MONGODB_URL
ENV MONGODB_URL ${MONGODB_URL}

ARG DEFAULT_USER_PASSWORD
ENV DEFAULT_USER_PASSWORD ${DEFAULT_USER_PASSWORD}

ARG PATH_TO_DDF_REPOSITORIES
ENV PATH_TO_DDF_REPOSITORIES ${PATH_TO_DDF_REPOSITORIES}

ARG NEW_RELIC_LICENSE_KEY
ENV NEW_RELIC_LICENSE_KEY ${NEW_RELIC_LICENSE_KEY}

ARG THRASHING_MACHINE
ENV THRASHING_MACHINE ${THRASHING_MACHINE}

ARG NODE_ENV
ENV NODE_ENV ${NODE_ENV}

ARG LOGS_SYNC_DISABLED
ENV LOGS_SYNC_DISABLED ${LOGS_SYNC_DISABLED}

ARG KEYMETRICS_LOGIN
ENV KEYMETRICS_LOGIN ${KEYMETRICS_LOGIN}

ARG KEYMETRICS_PASSWORD
ENV KEYMETRICS_PASSWORD ${KEYMETRICS_PASSWORD}

ENV TERM xterm-256color

COPY . .
RUN npm run tsc
RUN chmod +x docker_run.js

ENTRYPOINT ["/usr/local/bin/dumb-init", "--"]
CMD ["/home/waffle-server/docker_run.js"]
