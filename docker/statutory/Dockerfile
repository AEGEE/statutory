FROM node:14.15.4

RUN mkdir -p /usr/app/src \
	&& mkdir -p /usr/app/media \
	&& mkdir -p /usr/app/scripts

COPY --chown=node:node package.json /usr/app/src

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH="/home/node/.npm-global/bin:${PATH}"

RUN npm install -g nodemon@2.0.6
RUN npm install -g bunyan@1.8.14
RUN npm cache clean --force
RUN npm install

COPY . /usr/app/src

RUN chown -R node:node /usr/app

USER node

COPY ./docker/statutory/bootstrap.sh /usr/app/scripts/bootstrap.sh

CMD ["sh", "/usr/app/scripts/bootstrap.sh && nodemon -e 'js,json' lib/run.js"]

EXPOSE 8084
