#!/bin/bash
if [ ! -f /data/config/identities-columns.yml ];then
  cp /data/default/identities-columns.yml /data/config
fi
if [ ! -f /data/config/menus.yml ];then
  cp /data/default/menus.yml /data/config
fi
