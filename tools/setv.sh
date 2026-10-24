#!/bin/sh
# новая версия кэша: tools/setv.sh 20261024a2
sed -i -E "s/20[0-9]{6}[a-z][0-9]+/$1/g" index.html js/core.js && echo "V=$1"
