# Intro
To allow users to set custom title bar on Windows

# Platforms Supported
Windows 10

# Purpose
Allows users to set custom title bar experience with either Native or Custom with Native. Some customers require the title bar to be visible for their other tools to capture the Symphony app's title bar name.

# Details

## Custom
Provides a clean Windows 10 hamburger menu experience.

## Native
Displays Native window title bar. Menu options can be accessed by pressing ALT key.

# How to use?
# Installation
You can set it during the installation process in the MSI installer. Use the "Custom Title Bar" checkbox to set it to true during installation.

## Menu Bar Option
Hamburger menu can be enabled or disabled under "Window" menu options
Note: When you switch between the different styles, you'll need to restart the app for the correct menu to appear.

# Customising The Title Bar
You can customise the styles by modifying the css file at the below mentioned location for a multi-user install

```
C:\Program Files\Symphony\Symphony\config\titleBarStyles.css
```

And, for a single user install, the path would be below
```
C:\Users\<username>\AppData\Local\Programs\Symphony\Symphony\config\titleBarStyles.css
```

## Background Design
```
#title-bar {
    background-image: url("http link to an image"); // Please note local files cannot be loaded
    background-size: cover;
}
```

## Branding Logo
```
.branding-logo {
    height: 32px;
    width: 100px;
    content: url("http link to an image"); // Please note local files cannot be loaded
}
```

After the above changes and relaunching the application the new title bar styles should get applied