#!/bin/bash

/data/scripts/checkinstall.sh
if [ "$DEV" = "1" ];then
  yarn dev
else
  yarn run start:prod
fi

