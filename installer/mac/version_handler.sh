#!/usr/bin/env bash

# Read the actual version from package.json
VERSION=$(sed -n 's/\"version\"[[:space:]]*\:[[:space:]]*\"\([^}]*\)\",/\1/p' package.json)

# Trim trailing and leading spaces
VERSION=$(echo ${VERSION} | xargs)

# Replace the current version variable in the pre-install script
sed -i '' -e "s/CURRENT_VERSION=.*/CURRENT_VERSION=${VERSION}/g" ./installer/mac/preinstall.sh