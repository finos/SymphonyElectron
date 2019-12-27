#!/bin/bash

NODE_REQUIRED_VERSION=v12.13.1
SNYK_API_TOKEN=885953dc-9469-443c-984d-524352d54116

# Check basic dependencies
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
  npm install -g gulp
fi

if ! [ -x "$(command -v snyk)" ]; then
  echo 'Snyk does not exist! Installing and setting it up' >&2
  npm install -g snyk
  snyk config set api=$SNYK_API_TOKEN
fi

if ! [ -x "$(command -v /usr/local/bin/packagesbuild)" ]; then
  echo 'Packages build does not exist! Please set it up before running this script!' >&2
  exit 1
fi

# If we don't get parent build number from parent job, set it to 0
if [ -z "$PARENT_BUILD_VERSION" ]; then
  echo "PARENT_BUILD_VERSION is empty, setting default"
  PARENT_BUILD_VERSION="0"
fi

NODE_VERSION=$(node --version)
echo "Executing using Node Version: ${NODE_VERSION}"

# We need to include swift search libraries to build SDA
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
snyk test --file=package.json

# Replace url in config
echo "Setting default pod url to https://corporate.symphony.com"
sed -i -e 's/\"url\"[[:space:]]*\:[[:space:]]*\".*\"/\"url\":\"https:\/\/corporate.symphony.com\"/g' config/Symphony.config

# Setup the build version
echo "Setting build version to ${PARENT_BUILD_VERSION}"
sed -i -e "s/\"buildNumber\"[[:space:]]*\:[[:space:]]*\".*\"/\"buildNumber\":\" ${PARENT_BUILD_VERSION}\"/g" package.json

# Replace version number in pre-install script
echo "Setting package version in pre install script to ${PKG_VERSION}"
sed -i -e "s/CURRENT_VERSION=APP_VERSION/CURRENT_VERSION=${PKG_VERSION}/g" ./installer/mac/preinstall.sh

# Set expiry period for TTL builds
if [ -z "$EXPIRY_PERIOD" ]; then
  echo 'Expiry period not set, so, not creating expiry for the build'
else
  gulp setExpiry --period ${EXPIRY_PERIOD}
fi

# Build the app
echo "Running tests, code coverage, linting and building..."
npm run unpacked-mac

# Create .pkg installer
echo "Creating .pkg"
/usr/local/bin/packagesbuild -v installer/mac/symphony-mac-packager.pkgproj
