FROM node:latest

EXPOSE 80

RUN apt update && \
    apt -y install default-jre

WORKDIR /usr/vac

COPY . .

RUN npm install

CMD ["npm", "start"]
# CMD ["tail", "-f", "/dev/null"]