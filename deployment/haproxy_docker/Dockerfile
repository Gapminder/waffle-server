FROM ubuntu:14.04

RUN apt-get update
RUN apt-get install -y wget curl  libnl-utils
RUN apt-get install -y software-properties-common
RUN add-apt-repository ppa:vbernat/haproxy-1.7 
RUN apt-get update
RUN apt-get install -y haproxy

WORKDIR /home

RUN wget https://github.com/kelseyhightower/confd/releases/download/v0.11.0/confd-0.11.0-linux-amd64
RUN mv confd-0.11.0-linux-amd64 confd
RUN chmod +x confd

RUN mkdir /etc/confd
COPY ./haproxy_gracefull_reload.sh ./haproxy_gracefull_reload.sh
COPY ./confd /etc/confd
COPY ./run.sh run.sh

RUN chmod +x run.sh
RUN chmod +x haproxy_gracefull_reload.sh

ENV TERM xterm-256color

EXPOSE 80 433 8080

CMD ["/home/run.sh"]
