FROM node:latest

RUN apt update && \
    apt -y install default-jre

WORKDIR /usr/vac

COPY . .

CMD ["tail", "-f", "/dev/null"]