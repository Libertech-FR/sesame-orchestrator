#!/bin/bash
echo "Checking installation..."
if [ ! -f ./config/identities-columns.yml ];then
  echo "Copying default identities-columns.yml to config folder"
  cp ./default/identities-columns.yml ./config
fi

echo "Checking menus configuration..."
if [ ! -f ./config/menus.yml ];then
  echo "Copying default menus.yml to config folder"
  cp ./default/menus.yml ./config
fi
