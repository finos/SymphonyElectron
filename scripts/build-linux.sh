#!/bin/bash

NODE_REQUIRED_VERSION=v18.16.0
SNYK_ORG=sda
SNYK_PROJECT_NAME="Symphony Desktop Application"

if ! [ -x "$(command -v git)" ]; then
  echo 'GIT does not exist! Please set it up before running this script!' >&2
  exit 1
fi

# Switch to the appropriate node version for the branch using NVM
if [ -x "$(command -v nvm)" ]; then
  echo 'NVM does not not exist! Install it to switch to the appropriate node version!' >&2
  exit 1
fi

# Source all the profile files to ensure nvm is in path
source $HOME/.nvm/nvm.sh

NODE_CURRENT_VERSION=$(nvm current)
if [ "$NODE_REQUIRED_VERSION" != "$NODE_CURRENT_VERSION" ]; then
  echo 'Node version does not match required version! Installing the required version' >&2
  nvm install $NODE_REQUIRED_VERSION
  nvm use $NODE_REQUIRED_VERSION
fi

if ! [ -x "$(command -v node)" ]; then
  echo 'NODE does not exist! Please set it up before running this script!' >&2
  exit 1
fi

if ! [ -x "$(command -v npm)" ]; then
  echo 'NPM does not exist! Please set it up before running this script!' >&2
  exit 1
fi

if ! [ -x "$(command -v gulp)" ]; then
  echo 'Gulp does not exist! Installing it!' >&2
  npm install -g gulp gulp-cli
fi

if ! [ -x "$(command -v snyk)" ]; then
  echo 'Snyk does not exist! Installing and setting it up' >&2
  npm install -g snyk
fi
echo "Setting snyk org to $SNYK_ORG and api token to $SNYK_API_TOKEN"
snyk config set org="$SNYK_ORG"
snyk config set api="$SNYK_API_TOKEN"

if [ -z "$PARENT_BUILD_VERSION" ]; then
  echo "PARENT_BUILD_VERSION is empty, setting default"
  PARENT_BUILD_VERSION="0"
fi

NODE_VERSION=$(node --version)
echo "Node Version: ${NODE_VERSION}"

if [ ! -d "$HOME/tronlibraries/library" ]; then
  echo 'Search libraries do not exist! Not building with swift search' >&2
else
  cp -r "$HOME/tronlibraries/library" .
fi

PKG_VERSION=$(node -e "console.log(require('./package.json').version);")

# Install app dependencies
echo "Installing dependencies"
npm install

# Run Snyk Security Tests
echo "Running snyk security tests"
snyk test --file=package-lock.json --org="$SNYK_ORG"
snyk monitor --file=package-lock.json --org="$SNYK_ORG" --project-name="$SNYK_PROJECT_NAME"

# replace url in config
echo "Setting default pod url to https://corporate.symphony.com"
sed -i -e 's/\"url\"[[:space:]]*\:[[:space:]]*\".*\"/\"url\":\"https:\/\/corporate.symphony.com\"/g' config/Symphony.config
# setup the build version
echo "Setting build version to ${PARENT_BUILD_VERSION}"
sed -i -e "s/\"buildNumber\"[[:space:]]*\:[[:space:]]*\".*\"/\"buildNumber\":\" ${PARENT_BUILD_VERSION}\"/g" package.json
# replace version number in pre-install script
echo "Setting package version in pre install script to ${PKG_VERSION}"
sed -i -e "s/CURRENT_VERSION=APP_VERSION/CURRENT_VERSION=${PKG_VERSION}/g" ./installer/mac/preinstall.sh

if [ "$EXPIRY_PERIOD" == "0" ] || [ "$EXPIRY_PERIOD" == 0 ]; then
  echo 'Expiry period not set, so, not creating expiry for the build'
else
  gulp setExpiry --period ${EXPIRY_PERIOD}
fi

echo "Running tests, code coverage, linting and building..."
npm run packed-linux
