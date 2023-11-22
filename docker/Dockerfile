FROM node:18-bookworm-slim
LABEL description="Libertech Dev" \
      maintainer="Libertech <aide@libertech.fr>" \
      vendor=Libertech \
      name="sesame-orchestrator"

ENV TIMEZONE=Europe/Paris \
    LANGUAGE=fr_FR.UTF-8 \
    LANG=fr_FR.UTF-8 \
    DEBIAN_FRONTEND=noninteractive \
    SUPERVISOR_VERSION=4.0.1 \
    GOSU_VERSION=1.11 \
    TERM=xterm \
    BRANCHNAME=master

RUN apt clean -y \
    && apt update -y \
    && apt upgrade -y \
    && apt install -y locales \
    && export LANGUAGE=${LANGUAGE} \
    && export LANG=${LANG} \
    && export LC_ALL=${LC_ALL} \
    && locale-gen ${LANG} \
    && dpkg-reconfigure --frontend ${DEBIAN_FRONTEND} locales \
    && apt install --no-install-recommends -yq  supervisor 
  
WORKDIR /data
#RUN npm i -g @nestjs/cli
#RUN npm install --save @nestjs/swagger
COPY ./rootfs /
EXPOSE 4000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]


