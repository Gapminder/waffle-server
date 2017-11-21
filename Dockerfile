FROM ubuntu:16.04

RUN apt-get update
RUN apt-get install -y sudo git python build-essential libssl-dev openssh-server curl redis-tools nfs-common rsyslog libkrb5-dev net-tools lsof nano htop apt-utils apache2-utils

RUN set -ex && \
    for key in \
        05CE15085FC09D18E99EFB22684A14CF2582E0C5 ; \
    do \
        gpg --keyserver ha.pool.sks-keyservers.net --recv-keys "$key" || \
        gpg --keyserver pgp.mit.edu --recv-keys "$key" || \
        gpg --keyserver keyserver.pgp.com --recv-keys "$key" ; \
    done

ENV TELEGRAF_VERSION 1.4.3
RUN ARCH= && dpkgArch="$(dpkg --print-architecture)" && \
    case "${dpkgArch##*-}" in \
      amd64) ARCH='amd64';; \
      arm64) ARCH='arm64';; \
      armhf) ARCH='armhf';; \
      armel) ARCH='armel';; \
      *)     echo "Unsupported architecture: ${dpkgArch}"; exit 1;; \
    esac && \
    wget -q https://dl.influxdata.com/telegraf/releases/telegraf_${TELEGRAF_VERSION}-1_${ARCH}.deb.asc && \
    wget -q https://dl.influxdata.com/telegraf/releases/telegraf_${TELEGRAF_VERSION}-1_${ARCH}.deb && \
    gpg --batch --verify telegraf_${TELEGRAF_VERSION}-1_${ARCH}.deb.asc telegraf_${TELEGRAF_VERSION}-1_${ARCH}.deb && \
    dpkg -i telegraf_${TELEGRAF_VERSION}-1_${ARCH}.deb && \
    rm -f telegraf_${TELEGRAF_VERSION}-1_${ARCH}.deb*

COPY ./deployment/rsys_conf/rsyslog.conf /etc/rsyslog.conf
COPY ./deployment/rsys_conf/ws.conf /etc/rsyslog.d/ws.conf
COPY ./deployment/tmp/telegraf.conf /etc/telegraf/telegraf.conf

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
EXPOSE 8125/udp 8092/udp 8094

ARG PORT
ENV PORT ${PORT}

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

ARG AWS_DEFAULT_REGION
ENV AWS_DEFAULT_REGION ${AWS_DEFAULT_REGION}

ARG AWS_ACCESS_KEY_ID
ENV AWS_ACCESS_KEY_ID ${AWS_ACCESS_KEY_ID}

ARG AWS_SECRET_ACCESS_KEY
ENV AWS_SECRET_ACCESS_KEY ${AWS_SECRET_ACCESS_KEY}

ARG AWS_SSH_KEY_NAME
ENV AWS_SSH_KEY_NAME ${AWS_SSH_KEY_NAME}

ARG STACK_NAME
ENV STACK_NAME ${STACK_NAME}

ARG INFLUXDB_HOST
ENV INFLUXDB_HOST ${INFLUXDB_HOST}

ARG INFLUXDB_DATABASE_NAME
ENV INFLUXDB_DATABASE_NAME ${INFLUXDB_DATABASE_NAME}

ARG INFLUXDB_USER
ENV INFLUXDB_USER ${INFLUXDB_USER}

ARG INFLUXDB_PASSWORD
ENV INFLUXDB_PASSWORD ${INFLUXDB_PASSWORD}

ARG TELEGRAF_DEBUG_MODE
ENV TELEGRAF_DEBUG_MODE ${TELEGRAF_DEBUG_MODE:-'false'}

ARG MACHINE_SUFFIX
ENV MACHINE_SUFFIX ${THRASHING_MACHINE:+'TM'}

ENV TERM xterm-256color

COPY . .
RUN npm run tsc
RUN chmod +x docker_run.js
RUN chmod 777 /etc/default/telegraf
RUN ln -s /home/waffle-server/logs /var/log/waffle-server

ENTRYPOINT ["/usr/local/bin/dumb-init", "--"]
CMD ["/home/waffle-server/docker_run.js"]
