FROM node:latest

EXPOSE 80

RUN apt update && \
    apt -y install default-jre

WORKDIR /usr/vac

COPY . .

CMD ["tail", "-f", "/dev/null"]