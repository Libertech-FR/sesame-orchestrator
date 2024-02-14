FROM ghcr.io/libertech-fr/sesame-orchestrator

RUN apt clean -y \
    && apt update -y \
    && apt upgrade -y \
    && apt install -y locales \
    && export LANGUAGE=${LANGUAGE} \
    && export LANG=${LANG} \
    && export LC_ALL=${LC_ALL} \
    && locale-gen ${LANG} \
    && dpkg-reconfigure --frontend ${DEBIAN_FRONTEND} locales \
    && apt install --no-install-recommends -yq  procps supervisor

COPY ./rootfs /

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]


