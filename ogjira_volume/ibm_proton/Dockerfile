FROM ubuntu:latest
MAINTAINER docker@ekito.fr

#copy the IBMProton folder in the container 
COPY ./IBMProton/ /home/IBMProton/

#create a new floder for log4j logging
RUN mkdir -p /home/IBMProton/logs/

#update package index
RUN apt-get update

#install java jre
RUN apt-get -y install default-jre