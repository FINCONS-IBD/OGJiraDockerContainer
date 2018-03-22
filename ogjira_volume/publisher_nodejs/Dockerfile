FROM node:7

WORKDIR /publisher

COPY ./publisher /publisher

RUN npm install
	
COPY ./publisher /publisher

CMD node PublisherDock.js ./config.properties

EXPOSE 4154