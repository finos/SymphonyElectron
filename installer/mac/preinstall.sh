#!/bin/bash

# Kill the existing running instance
sudo killall Symphony

delete_app()
{
    # Delete the installed version only if it is older than the installing version
    sudo rm -rf /Applications/Symphony.app
}

compare_versions()
{
    # Get the installer version:
    CURRENT_VERSION=APP_VERSION

    # Get the currently installed version:
    INSTALLED_VERSION=$(plutil -p /Applications/Symphony.app/Contents/Info.plist | awk '/CFBundleShortVersionString/ {print substr($3, 2, length($3)-2)}')

    # If there are no versions installed, just exit the script
    if [ -z "$INSTALLED_VERSION" -a "$INSTALLED_VERSION" != " " ]; then
        echo "No version installed, so, exiting without version checks"
        exit 0
    fi

    echo "This version is ${CURRENT_VERSION}"
    echo "Installed version is ${INSTALLED_VERSION}"

    # First, we replace the dots by blank spaces, like this:
    VERSION=${CURRENT_VERSION//./ }
    INSTALLED_VERSION=${INSTALLED_VERSION//./ }

    # If you have a "v" in front of your versions, you can get rid of it like this:
    VERSION=${VERSION//v/}
    INSTALLED_VERSION=${INSTALLED_VERSION//v/}

    # So, we just need to extract each number:
    patch1=$(echo ${VERSION} | awk '{print $3}')
    minor1=$(echo ${VERSION} | awk '{print $2}')
    major1=$(echo ${VERSION} | awk '{print $1}')

    patch2=$(echo ${INSTALLED_VERSION} | awk '{print $3}')
    minor2=$(echo ${INSTALLED_VERSION} | awk '{print $2}')
    major2=$(echo ${INSTALLED_VERSION} | awk '{print $1}')

    # And now, we can simply compare the variables:
    if [ ${major1} -lt ${major2} ]; then
        echo "Installed version is newer than this version, exiting installation"
        exit 1
    fi

    if [ ${major1} -eq ${major2} -a ${minor1} -lt ${minor2} ]; then
        echo "Installed version is newer than this version, exiting installation"
        exit 1
    fi

    if [ ${major1} -eq ${major2} -a ${minor1} -eq ${minor2} -a ${patch1} -lt ${patch2} ]; then
        echo "Installed version is newer than this version, exiting installation"
        exit 1
    fi

    delete_app

}

compare_versions
