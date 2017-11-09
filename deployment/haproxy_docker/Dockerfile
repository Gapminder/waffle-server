FROM ubuntu:16.04

RUN apt-get update
RUN apt-get install -y sudo wget curl libnl-utils rsyslog net-tools lsof nano htop apt-utils
RUN apt-get install -y software-properties-common
RUN add-apt-repository ppa:vbernat/haproxy-1.7
RUN apt-get update
RUN apt-get install -y haproxy apt-transport-https nodejs

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

WORKDIR /home

RUN wget https://github.com/kelseyhightower/confd/releases/download/v0.11.0/confd-0.11.0-linux-amd64
RUN mv confd-0.11.0-linux-amd64 confd
RUN chmod +x confd
RUN chmod 777 /etc/default/telegraf

RUN mkdir /var/log/haproxy
RUN mkdir /var/lib/haproxy/dev/log
RUN mkdir /etc/confd
COPY ./haproxy_gracefull_reload.sh ./haproxy_gracefull_reload.sh
COPY ./tmp/telegraf.conf /etc/telegraf/telegraf.conf
COPY ./tmp/package.json ./package.json
COPY ./confd /etc/confd
COPY ./run.sh run.sh

RUN chmod +x run.sh
RUN chmod +x haproxy_gracefull_reload.sh

ARG NODE_ENV
ENV NODE_ENV ${NODE_ENV}

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
ENV MACHINE_SUFFIX ${MACHINE_SUFFIX:-'HP'}

ENV TERM xterm-256color

EXPOSE 80 433 8080
EXPOSE 8125/udp 8092/udp 8094

CMD ["/home/run.sh"]
