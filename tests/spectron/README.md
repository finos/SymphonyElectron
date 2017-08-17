# Spectron UI Automation Tests

## Objective:

The objective of writing and running the spectron tests is for UI automation, this helps in mocking user behaviour visually like in Selenium. In reality, Spectron is just a light-weight framework that connects Electron with Selenium (via Chrome Driver) to run the UI tests. More details can be found [here](https://electron.atom.io/spectron/)

## Testing Framework

Spectron supports chai and ava out of the box. For our purpose, since we've used jest across the unit tests, we've continued using jest for integrating spectron as well. 

Just check the .spectron.js tests in this folder to understand how the tests have been written. 

Intrinsics of what each test does is out of scope of this document. Please check with the development team for the same.

## Pre-requisites

- Electron installed (preferrably globally)
- Jest Installed (preferrably globally)
- Chrome Driver installed (taken care of by the npm dependencies)
- UI components access to the test suite. For instance, you cannot run this on a non-interactive user on a Mac

## Running the tests
- Make sure you have the latest dependencies installed
- Just run the command "npm run spectron-test" to kick start the spectron tests

## CI / CD Instructions (Jenkins)
Setting up Spectron to run on CI / CD is tricky, so, we need to follow the below procedure

### MacOS

- On Mac, we need to use an X11 server to run the Spectron tests to get access to the UI components (mainly BrowserWindow) of Electron.
- To achieve this, we need to [install XQuartz](https://www.xquartz.org/) that sets up the X11 server and provides the UI components for the automation framework.
- We create the below shell script to start the X11 server and have it ready for the tests.

```
#!/usr/bin/env bash
 
OS="osx"
if [ "${OS}" = "osx" ]; then ( /opt/X11/bin/Xvfb :99 -ac -screen 0 1024x768x8; echo ok )& sleep 5; fi
```

### Windows

Windows supports running UI tests out of the box, but we'd still need to tweak certain things and the procedure is explained below:

- First, we need to have a dedicated user account
- We need to setup auto-logon for the above user account [as explained here](https://serverfault.com/questions/840557/auto-login-a-user-at-boot-on-windows-server-2016).
- Then, we need to start the Jenkins slave agent via Java Web Start [as explained here](https://wiki.jenkins.io/display/JENKINS/Distributed+builds#Distributedbuilds-LaunchslaveagentviaJavaWebStart).
- Then, we just run the tests from the CI which would be run from the above created user account interactively.