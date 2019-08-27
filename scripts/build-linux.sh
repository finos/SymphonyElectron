#!/bin/bash

if ! [ -x "$(command -v git)" ]; then
  echo 'GIT does not exist! Please set it up before running this script!' >&2
  exit 1
fi

if ! [ -x "$(command -v node)" ]; then
  echo 'NODE does not exist! Please set it up before running this script!' >&2
  exit 1
fi

nvm use default
NODE_VERSION=$(node --version)
echo "Node Version: ${NODE_VERSION}"

if [ ! -d "$HOME/tronlibraries/library" ]; then
  echo 'Search libraries do not exist! Not building with swift search' >&2
else
  cp -r "$HOME/tronlibraries/library" .
fi

PKG_VERSION=$(node -e "console.log(require('./package.json').version);")

# Install app dependencies
npm install

# replace url in config
echo "Setting default pod url to https://corporate.symphony.com"
sed -i -e 's/\"url\"[[:space:]]*\:[[:space:]]*\".*\"/\"url\":\"https:\/\/corporate.symphony.com\"/g' config/Symphony.config
# setup the build version
echo "Setting build version to ${PARENT_BUILD_VERSION}"
sed -i -e "s/\"buildNumber\"[[:space:]]*\:[[:space:]]*\".*\"/\"buildNumber\":\"${PARENT_BUILD_VERSION}\"/g" package.json
# replace version number in pre-install script
echo "Setting package version in pre install script to ${PKG_VERSION}"
sed -i -e "s/CURRENT_VERSION=APP_VERSION/CURRENT_VERSION=${PKG_VERSION}/g" ./installer/mac/preinstall.sh

echo "Running tests, code coverage, linting and building..."
npm run packed-linux
