<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">

</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Orchestrator du projet Sesame


## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn start:dev
``` 

## Variables d'environnements
```
#Host Redis
REDIS_HOST=redis
#Port Redis
REDIS_PORT=6379
# redis credentials (si ces variables n existe pas, pas d'authentification par defaut
REDIS_USER=monUser
REDIS_PASSWORD=xx
#Log level  ( fatal,error,warn,info,debug)
LOG_LEVEL=info
#Nom de la queue (bullMQ) Redis
NAME_QUEUE=backend
```
