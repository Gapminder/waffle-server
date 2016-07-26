FROM ubuntu:14.04

RUN apt-get update
RUN apt-get install -y git python build-essential libssl-dev openssh-server curl redis-tools

#RUN curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
#RUN curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
RUN curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -

#Install Node.js v6.x
RUN apt-get install -y nodejs

#Update npm
#RUN npm i -g npm@3.8.1
RUN npm i -g forever
RUN npm i -g shelljs

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

ARG DEFAULT_USER_PASSWORD
ENV DEFAULT_USER_PASSWORD ${DEFAULT_USER_PASSWORD}


ARG PATH_TO_DDF_REPOSITORIES
ENV PATH_TO_DDF_REPOSITORIES ${PATH_TO_DDF_REPOSITORIES}


ARG NEW_RELIC_LICENSE_KEY
ENV NEW_RELIC_LICENSE_KEY ${NEW_RELIC_LICENSE_KEY}

ENV NODE_ENV production
ENTRYPOINT ["/usr/bin/ssh-agent"]
CMD ["/home/waffle-server/docker_run.js"]
