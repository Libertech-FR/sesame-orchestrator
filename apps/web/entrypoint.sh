#!/bin/bash

./scripts/checkinstall.sh
if [ "$DEV" = "1" ];then
  exec yarn dev
else
  exec yarn run start:prod
fi

