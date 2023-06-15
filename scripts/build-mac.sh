#!/bin/bash

# Unlock the keychain
echo "Unlocking keychain"
security -v unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"

NODE_REQUIRED_VERSION=v18.16.0
SNYK_ORG=sda
SNYK_PROJECT_NAME="Symphony Desktop Application"

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
  npm install -g gulp gulp-cli
fi

if ! [ -x "$(command -v snyk)" ]; then
  echo 'Snyk does not exist! Installing and setting it up' >&2
  npm install -g snyk
fi
echo "Setting snyk org to $SNYK_ORG and api token to $SNYK_API_TOKEN"
snyk config set org="$SNYK_ORG"
snyk config set api="$SNYK_API_TOKEN"

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
  echo 'Copied search libraries'
  ls -lrth $HOME/tronlibraries/library
fi

codesign --force --options runtime -s "Developer ID Application: Symphony Communication Services LLC" library/lz4.exec
codesign --force --options runtime -s "Developer ID Application: Symphony Communication Services LLC" library/indexvalidator.exec

PKG_VERSION=$(node -e "console.log(require('./package.json').version);")

# Install app dependencies
echo "Installing dependencies"
npm install

echo "Signing screen share indicator"
codesign --force --options runtime -s "Developer ID Application: Symphony Communication Services LLC" node_modules/screen-share-indicator-frame/SymphonyScreenShareIndicator

# Run Snyk Security Tests
echo "Running snyk security tests"
snyk test --file=package-lock.json --org="$SNYK_ORG"
snyk monitor --file=package-lock.json --org="$SNYK_ORG" --project-name="$SNYK_PROJECT_NAME"

# Replace url in config
echo "Setting default pod url to https://my.symphony.com"
sed -i -e 's/\"url\"[[:space:]]*\:[[:space:]]*\".*\"/\"url\":\"https:\/\/my.symphony.com\"/g' config/Symphony.config

# Setup the build version
echo "Setting build version to ${PARENT_BUILD_VERSION}"
sed -i -e "s/\"buildNumber\"[[:space:]]*\:[[:space:]]*\".*\"/\"buildNumber\": \"${PARENT_BUILD_VERSION}\"/g" package.json
sed -i -e "s/\"version\"[[:space:]]*\:[[:space:]]\"\(.*\)\"/\"version\": \"\1-${PARENT_BUILD_VERSION}\"/g" package.json

# Replace version number in pre-install script
echo "Setting package version in pre install script to ${PKG_VERSION}"
sed -i -e "s/CURRENT_VERSION=APP_VERSION/CURRENT_VERSION=${PKG_VERSION}/g" ./installer/mac/preinstall.sh

# Set expiry period for TTL builds
if [ "$EXPIRY_PERIOD" == "0" ] || [ "$EXPIRY_PERIOD" == 0 ]; then
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

PACKAGE=installer/mac/build/Symphony.pkg
if [ ! -e ${PACKAGE} ]; then
  echo "BUILD PACKAGE FAILED: package not created: ${PACKAGE}"
  exit 1
fi
echo "Package created: ${PACKAGE}"

# Sign the app
PKG_VERSION=$(node -e "console.log(require('./package.json').version);")
echo "Signing Package: ${PACKAGE}"
SIGNED_PACKAGE=installer/mac/build/Symphony_Signed_${PKG_VERSION}.pkg
productsign --sign "Developer ID Installer: Symphony Communication Services LLC" $PACKAGE $SIGNED_PACKAGE
echo "Signing Package complete: ${PACKAGE}"

# Notarize the app
xcrun altool --notarize-app --primary-bundle-id "$BUNDLE_ID" --username "$APPLE_ID" --password "$APPLE_ID_PASSWORD" --file $SIGNED_PACKAGE > /tmp/notarize.txt
cat /tmp/notarize.txt
REQUEST_ID=$(sed -n '2p' /tmp/notarize.txt)
REQUEST_ID=$(echo $REQUEST_ID | cut -d "=" -f 2)
echo "$REQUEST_ID"
#xcrun altool --notarization-info $REQUEST_ID --username "$APPLE_ID" --password "$APPLE_ID_PASSWORD"
#xcrun stapler staple $SIGNED_PACKAGE
#stapler validate --verbose $SIGNED_PACKAGE

# Generate Installation Instructions PDF
if ! [ -x "$(command -v markdown-pdf)" ]; then
  echo 'Markdown PDF does not exist! Installing it' >&2
  npm install -g markdown-pdf
fi

echo "Updating auto-update yml file"
node scripts/macos_update_yml.js  "dist/latest-mac.yml"

echo "Generating PDF for installation instructions"
markdown-pdf installer/mac/install_instructions_mac.md

echo "Generate release notes"
markdown-pdf RELEASE_NOTES.md

# Create targets directory
mkdir -p targets

# Attach artifacts to build
if [ "${EXPIRY_PERIOD}" != "0" ]; then
  cp $SIGNED_PACKAGE "targets/Symphony-macOS-${PKG_VERSION}-TTL-${EXPIRY_PERIOD}.pkg"
  cp installer/mac/install_instructions_mac.pdf "targets/Install-Instructions-macOS-${PKG_VERSION}-TTL-${EXPIRY_PERIOD}.pdf"
  cp RELEASE_NOTES.pdf "targets/Release-Notes-macOS-${PKG_VERSION}-TTL-${EXPIRY_PERIOD}.pdf"
else
  cp $SIGNED_PACKAGE "targets/Symphony-macOS-${PKG_VERSION}.pkg"
  cp installer/mac/install_instructions_mac.pdf "targets/Install-Instructions-macOS-${PKG_VERSION}.pdf"
  cp RELEASE_NOTES.pdf "targets/Release-Notes-macOS-${PKG_VERSION}-.pdf"
fi

echo "All done, job successfull :)"
