# Intro
Electron allows us to disable GPU in case of graphic issues.

# Platforms Supported
macOS, Windows 10, Windows 7

# Purpose
To allow users to disable GPU in case of screen sharing video / graphic issues.

# Details
In the current implementation, we support this feature by setting flags to true in the Chromium container. The following flags are set:

- disable-gpu
- disable-gpu-compositing
- disable-d3d11

To make this work, you need to set the "disableGpu" to "true" under the "customFlags" configuration in the "Symphony.config" file.

# Examples
If your app is installed in C:\Program Files\Symphony\Symphony, you need to edit the file "Symphony.config" under the "config" sub-directory and set "disableGpu" to "true".

# Other Info
N/A