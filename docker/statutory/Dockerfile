FROM node:14.15.4

RUN mkdir -p /usr/app/src \
	&& mkdir -p /usr/app/media \
	&& mkdir -p /usr/app/scripts

RUN apt-get update \
 && apt-get install -y --no-install-recommends netcat=1.10-41 \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

COPY ./docker/statutory/bootstrap.sh /usr/app/scripts/bootstrap.sh
COPY ./docker/statutory/wait.sh /usr/app/scripts/wait.sh
COPY . /usr/app/src

RUN chown -R node:node /usr/app

WORKDIR /usr/app/src

USER node

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH="/home/node/.npm-global/bin:${PATH}"

RUN npm install

CMD ["sh /usr/app/scripts/bootstrap.sh && nodemon -e 'js,json' lib/run.js"]

EXPOSE 8084
