FROM ubuntu:16.04

#install ubuntu packages
RUN apt-get update
RUN apt-get install -y sudo git python build-essential libssl-dev openssh-server curl redis-tools nfs-common rsyslog libkrb5-dev net-tools lsof nano htop apt-utils apache2-utils supervisor mc

RUN set -ex && \
    for key in \
        05CE15085FC09D18E99EFB22684A14CF2582E0C5 ; \
    do \
        gpg --keyserver ha.pool.sks-keyservers.net --recv-keys "$key" || \
        gpg --keyserver pgp.mit.edu --recv-keys "$key" || \
        gpg --keyserver keyserver.pgp.com --recv-keys "$key" ; \
    done

#install telegraf separately due to complexity of gpg registering keys
ENV TELEGRAF_VERSION 1.4.3
ENV ARCH 'amd64'
RUN wget -q https://dl.influxdata.com/telegraf/releases/telegraf_${TELEGRAF_VERSION}-1_${ARCH}.deb.asc
RUN wget -q https://dl.influxdata.com/telegraf/releases/telegraf_${TELEGRAF_VERSION}-1_${ARCH}.deb
RUN gpg --batch --verify telegraf_${TELEGRAF_VERSION}-1_${ARCH}.deb.asc telegraf_${TELEGRAF_VERSION}-1_${ARCH}.deb
RUN dpkg -i telegraf_${TELEGRAF_VERSION}-1_${ARCH}.deb
RUN rm -f telegraf_${TELEGRAF_VERSION}-1_${ARCH}.deb

#install node & npm packages
RUN curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
RUN apt-get install -y nodejs
RUN npm i -g shelljs
RUN npm i -g typescript@2.5.2

#install dumb-init
RUN wget -O /usr/local/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.0/dumb-init_1.2.0_amd64
RUN chmod +x /usr/local/bin/dumb-init

#add ssh-key for git
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

COPY . .
RUN npm i
RUN npm run tsc
RUN ln -s /home/waffle-server/logs /var/log/waffle-server

#exposing ports
EXPOSE ${PORT}
EXPOSE 3000
EXPOSE 80
EXPOSE 443
EXPOSE 8125/udp 8092/udp 8094

#setup environment variables
ARG PROJECT
ENV PROJECT ${PROJECT}

ARG MACHINE_TYPE
ENV MACHINE_TYPE ${MACHINE_TYPE}

ARG REGION
ENV REGION ${REGION}

ARG PORT
ENV PORT ${PORT}

ARG REDIS_HOST
ENV REDIS_HOST "${REDIS_HOST}"

ARG REDIS_PORT
ENV REDIS_PORT ${REDIS_PORT:-6379}

ARG PATH_TO_DDF_REPOSITORIES
ENV PATH_TO_DDF_REPOSITORIES "${PATH_TO_DDF_REPOSITORIES}"

ARG NEW_RELIC_LICENSE_KEY
ENV NEW_RELIC_LICENSE_KEY "${NEW_RELIC_LICENSE_KEY}"

ARG NODE_ENV
ENV NODE_ENV ${NODE_ENV:-"development"}

ARG ENVIRONMENT
ENV ENVIRONMENT ${ENVIRONMENT}

ARG GCP_DEFAULT_REGION
ENV GCP_DEFAULT_REGION "${GCP_DEFAULT_REGION}"

ARG STACK_NAME
ENV STACK_NAME "${STACK_NAME:-'wsdevstack-test'}"

ARG INFLUXDB_HOST
ENV INFLUXDB_HOST "${INFLUXDB_HOST}"

ARG INFLUXDB_PORT
ENV INFLUXDB_PORT "${INFLUXDB_PORT}"

ARG INFLUXDB_DATABASE_NAME
ENV INFLUXDB_DATABASE_NAME "${INFLUXDB_DATABASE_NAME}"

ARG INFLUXDB_USER
ENV INFLUXDB_USER "${INFLUXDB_USER}"

ARG INFLUXDB_PASSWORD
ENV INFLUXDB_PASSWORD "${INFLUXDB_PASSWORD}"

ARG RELEASE_DATE
ENV RELEASE_DATE "${RELEASE_DATE:-'2017-11-28T17:15:42'}"

ARG VERSION_TAG
ENV VERSION_TAG "${VERSION_TAG:-'2.12.1'}"

ARG VERSION
ENV VERSION "${VERSION:-'2-12-1'}"

ARG DEFAULT_DATASETS
ENV DEFAULT_DATASETS "${DEFAULT_DATASETS}"

ENV TERM "xterm-256color"

#setup telegraf
RUN > /etc/default/telegraf
RUN echo "export NODE_ENV=\"${NODE_ENV}\"\n" \
  "export RELEASE_DATE=\"${RELEASE_DATE}\"\n" \
  "export STACK_NAME=\"${STACK_NAME}\"\n" \
  "export INFLUXDB_HOST=\"${INFLUXDB_HOST}\"\n" \
  "export INFLUXDB_PORT=\"${INFLUXDB_PORT}\"\n" \
  "export INFLUXDB_DATABASE_NAME=\"${INFLUXDB_DATABASE_NAME}\"\n" \
  "export INFLUXDB_USER=\"${INFLUXDB_USER}\"\n" \
  "export INFLUXDB_PASSWORD=\"${INFLUXDB_PASSWORD}\"\n" \
  "export MACHINE_SUFFIX=\"${MACHINE_SUFFIX}\"\n" \
  "export PROJECT=\"${PROJECT}\"\n" \
  "export MACHINE_TYPE=\"${MACHINE_TYPE}\"\n" \
  "export REGION=\"${REGION}\"\n" \
  "export VERSION_TAG=\"${VERSION_TAG}\"\n" \
  "export VERSION=\"${VERSION}\"" >> /etc/default/telegraf
RUN chmod 666 /etc/default/telegraf
RUN touch /var/log/telegraf/telegraf.log
RUN chmod 666 /var/log/telegraf/telegraf.log

#setup services settings
RUN mkdir -p /var/log/supervisor
COPY ./deployment/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
RUN echo "[program:forever]" >> /etc/supervisor/conf.d/supervisord.conf
RUN echo "command=npm run start:${ENVIRONMENT}" >> /etc/supervisor/conf.d/supervisord.conf
RUN > /etc/telegraf/telegraf.conf
RUN cat ./deployment/telegraf/default-telegraf.conf >> /etc/telegraf/telegraf.conf
RUN cat ./deployment/telegraf/filestat.plugin.conf  >> /etc/telegraf/telegraf.conf
RUN cat ./deployment/telegraf/procstat.plugin.conf  >> /etc/telegraf/telegraf.conf
COPY ./deployment/supervisor/envs.sh /bin/envs.sh

ENTRYPOINT ["/usr/local/bin/dumb-init", "--"]

CMD ["/usr/bin/supervisord"]
