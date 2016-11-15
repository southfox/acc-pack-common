#!/bin/bash
set -e

if [[ -d src ]]
then
	gulp dist
	gulp zip
  cd dist

else
	echo "Please run this script from 'JS'."
	exit 1
fi
