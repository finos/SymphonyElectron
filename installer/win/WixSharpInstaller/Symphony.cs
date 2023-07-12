//css_dir ..\WixSharpToolset\;
//css_ref System.Core.dll;
//css_ref System.Windows.Forms.dll;
//css_ref PresentationFramework.dll;
//css_ref Wix_bin\SDK\Microsoft.Deployment.WindowsInstaller.dll;
//css_ref WixSharp.UI.dll;
//css_imp WelcomeDialog.cs;
//css_imp WelcomeDialog.designer.cs;
//css_imp CloseDialog.cs;
//css_imp CloseDialog.designer.cs;
//css_imp ProgressDialog.cs
//css_imp ProgressDialog.Designer.cs
//css_imp ExitDialog.cs;
//css_imp ExitDialog.designer.cs;
//css_imp MaintenanceDialog.cs;
//css_imp MaintenanceDialog.designer.cs;

using WixSharp;
using WixSharp.Forms;
using Microsoft.Deployment.WindowsInstaller;
using Microsoft.Win32;

class Script
{
    static public void Main(string[] args)
    {
        // The name "Symphony" is used in a lot of places, for paths, shortut names and installer filename, so define it once
        var productName = "Symphony";

        var userDataPathArgument = "--userDataPath=\"[USER_DATA_PATH]\"";

        // Create a wixsharp project instance and assign the project name to it, and a hierarchy of all files to include
        // Files are taken from multiple locations, and not all files in each location should be included, which is why
        // the file list is rather long and explicit. At some point we might make the `dist` folder match exactly the
        // desired contents of installation, and then we can simplify this bit.
        var project = new ManagedProject(productName,
            new Dir(@"%ProgramFiles%\" + productName,
                new File(new Id("symphony_exe"), @"..\..\..\dist\win-unpacked\Symphony.exe",
                    // Create two shortcuts to the main Symphony.exe file, one on the desktop and one in the program menu
                    new FileShortcut(productName, @"%Desktop%")
                    {
                        IconFile = @"..\..\..\images\icon.ico",
                        Arguments = userDataPathArgument
                    },
                    new FileShortcut(productName, @"%ProgramMenu%")
                    {
                        IconFile = @"..\..\..\images\icon.ico",
                        Arguments = userDataPathArgument
                    }
                ),
                // updateService,
                new File(@"..\..\..\dist\win-unpacked\chrome_100_percent.pak"),
                new File(@"..\..\..\dist\win-unpacked\chrome_200_percent.pak"),
                new File(@"..\..\..\dist\win-unpacked\d3dcompiler_47.dll"),
                new File(@"..\..\..\dist\win-unpacked\ffmpeg.dll"),
                new File(@"..\..\..\dist\win-unpacked\icudtl.dat"),
                new File(@"..\..\..\dist\win-unpacked\libEGL.dll"),
                new File(@"..\..\..\dist\win-unpacked\libGLESv2.dll"),
                new File(@"..\..\..\dist\win-unpacked\LICENSE.electron.txt"),
                new File(@"..\..\..\dist\win-unpacked\LICENSES.chromium.html"),
                new File(@"..\..\..\dist\win-unpacked\resources.pak"),
                new File(@"..\..\..\dist\win-unpacked\snapshot_blob.bin"),
                new File(@"..\..\..\dist\win-unpacked\v8_context_snapshot.bin"),
                new File(@"..\..\..\dist\win-unpacked\vk_swiftshader.dll"),
                new File(@"..\..\..\dist\win-unpacked\vk_swiftshader_icd.json"),
                new File(@"..\..\..\dist\win-unpacked\vulkan-1.dll"),
                new File(@"..\..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\screen-share-indicator-frame\ScreenShareIndicatorFrame.exe"),
                new File(@"..\..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\screen-snippet\ScreenSnippet.exe"),
                new File(@"..\..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\symphony-native-window-handle-helper\SymphonyNativeWindowHandleHelper.exe"),
                new Dir(@"config",
                    new Files(@"..\..\..\dist\win-unpacked\config\*.*")
                ),
                new Dir(@"dictionaries",
                    new Files(@"..\..\..\dist\win-unpacked\dictionaries\*.*")
                ),
                new Dir(@"locales",
                    new Files(@"..\..\..\node_modules\electron\dist\locales\*.*")
                ),
                new Dir(@"resources",
                    new DirFiles(@"..\..\..\dist\win-unpacked\resources\*.*"),
                    new Dir(@"app.asar.unpacked",
                        new Dir(@"node_modules",
                            new Files(@"..\..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\*.*")
                        )
                    )
                ),
                new Dir(@"cloud9",
                    new Files(@"..\..\..\dist\win-unpacked\cloud9\*.*")
                )
            ),

            // Add a launch condition to require Windows Server 2008 or later
            // The property values to compare against can be found here:
            //    https://docs.microsoft.com/en-us/windows/win32/msi/operating-system-property-values
            new LaunchCondition("VersionNT>=600 AND WindowsBuild>=6001", "OS not supported"),

            // Add registry entry used by protocol handler to launch symphony when opening symphony:// URIs
            new RegValue(WixSharp.RegistryHive.ClassesRoot, productName, "", "URL:symphony"),
            new RegValue(WixSharp.RegistryHive.ClassesRoot, productName, "URL Protocol", ""),
            new RegValue(WixSharp.RegistryHive.ClassesRoot, productName + @"\shell\open\command", "", "\"[INSTALLDIR]Symphony.exe\" " + userDataPathArgument + " \"%1\""),

            // When installing or uninstalling, we want Symphony to be closed down, but the standard way of sending a WM_CLOSE message
            // will not work for us, as we have a "minimize on close" option, which stops the app from terminating on WM_CLOSE. So we
            // instruct the installer to not send a Close message, but instead send the EndSession message, and we have a custom event
            // handler in the SDA code which listens for this message, and ensures app termination when it is received.
            new CloseApplication("Symphony.exe", false) { EndSessionMessage = true }
            );

        // The build script which calls the wix# builder, will be run from a command environment which has %SYMVER% set.
        // So we just extract that version string, create a Version object from it, and pass it to out project definition.
        var version = System.Environment.GetEnvironmentVariable("SYMVER");
        var updatedVersion = version.Replace("-", ".");
        project.Version = new System.Version(updatedVersion);

        // To get the correct behaviour with upgrading the product, the product GUID needs to be different for every build,
        // but the UpgradeCode needs to stay the same. If we wanted to make a new major version and allow it to be installed
        // side-by-side with the previous version, we would generate a new UpgradeCode for the new version onwards.
        // More details can be found in this stackoverflow post:
        //      https://stackoverflow.com/a/26344742
        project.GUID = new System.Guid("{4042AD1C-90E1-4032-B6B9-2BF6A4214096}");
        project.ProductId = System.Guid.NewGuid();
        project.UpgradeCode = new System.Guid("{36402281-8141-4797-8A90-07CFA75EFA55}");

        // Allow any versions to be upgraded/downgraded freely
        project.MajorUpgradeStrategy = MajorUpgradeStrategy.Default;
        project.MajorUpgradeStrategy.RemoveExistingProductAfter = Step.InstallInitialize;
        project.MajorUpgradeStrategy.UpgradeVersions.Minimum = "0.0.0";
        project.MajorUpgradeStrategy.UpgradeVersions.Maximum = null; // No max version limit
        project.MajorUpgradeStrategy.UpgradeVersions.IncludeMaximum = true;
        project.MajorUpgradeStrategy.UpgradeVersions.IncludeMinimum = true;
        project.MajorUpgradeStrategy.PreventDowngradingVersions.Minimum = "0.0.0";
        project.MajorUpgradeStrategy.PreventDowngradingVersions.Maximum = "0.0.0";
        project.MajorUpgradeStrategy.PreventDowngradingVersions.IncludeMaximum = true;
        project.MajorUpgradeStrategy.PreventDowngradingVersions.IncludeMinimum = true;

        // Declare all the custom properties we want to use, and assign them default values. It is possible to override
        // these when running the installer, but if not specified, the defaults will be used.
        project.Properties = new[]
        {
            new PublicProperty("APPDIR", ""),
            new PublicProperty("ALLUSERS", "1"),
            new PublicProperty("ALWAYS_ON_TOP", "DISABLED" ),
            new PublicProperty("AUTO_LAUNCH_PATH", ""),
            new PublicProperty("AUTO_START", "ENABLED"),
            new PublicProperty("BRING_TO_FRONT", "DISABLED"),
            new PublicProperty("CUSTOM_TITLE_BAR", "ENABLED"),
            new PublicProperty("DEV_TOOLS_ENABLED", "true"),
            new PublicProperty("FULL_SCREEN", "true"),
            new PublicProperty("LOCATION", "true"),
            new PublicProperty("LAUNCH_ON_INSTALL", "true"),
            new PublicProperty("MEDIA", "true"),
            new PublicProperty("MIDI_SYSEX", "true"),
            new PublicProperty("MINIMIZE_ON_CLOSE", "ENABLED"),
            new PublicProperty("NOTIFICATIONS", "true"),
            new PublicProperty("OPEN_EXTERNAL", "true"),
            new PublicProperty("POD_URL", "https://my.symphony.com"),
            new PublicProperty("CONTEXT_ORIGIN_URL", ""),
            new PublicProperty("POINTER_LOCK", "true"),
            new PublicProperty("USER_DATA_PATH", ""),
            new PublicProperty("OVERRIDE_USER_AGENT", "false"),
            new PublicProperty("ENABLE_BROWSER_LOGIN", "false"),
            new PublicProperty("BROWSER_LOGIN_AUTOCONNECT", "false"),
            new PublicProperty("FORCE_AUTO_UPDATE","false"),
            new PublicProperty("CHROME_FLAGS", ""),
            new Property("MSIINSTALLPERUSER", "1"),
            new Property("PROGRAMSFOLDER", System.Environment.ExpandEnvironmentVariables(@"%PROGRAMFILES%"))
        };

        // Define the custom actions we want to run, and at what point of the installation we want to execute them.
        project.Actions = new WixSharp.Action[]
        {
            // InstallVariant
            //
            // We want to be able to display the POD URL dialog every time SDA starts after a reinstall, regardless of
            // whether it is a new version or the same version, but we don't want to display it if no reinstallation
            // have been done. To detect this, we always write a new GUID to the fill InstallVariant.info on every
            // installation.
            new ElevatedManagedAction(CustomActions.InstallVariant, Return.check, When.After, Step.InstallFiles, Condition.NOT_BeingRemoved )
            {
                // INSTALLDIR is a built-in property, and we need it to know which path to write the InstallVariant to
                UsesProperties = "INSTALLDIR"
            },

            // UpdateConfig
            //
            // After installation, the Symphony.config file needs to be updated with values from the install properties,
            // either their default values as specified above, or with the overridden value if an override was specified
            // on the command line when the installer was started.
            new ElevatedManagedAction(CustomActions.UpdateConfig, Return.check, When.After, Step.InstallFiles, Condition.NOT_BeingRemoved )
            {
                // The UpdateConfig action needs the built-in property INSTALLDIR as well as most of the custom properties
                UsesProperties = "INSTALLDIR,POD_URL,CONTEXT_ORIGIN_URL,MINIMIZE_ON_CLOSE,ALWAYS_ON_TOP,AUTO_START,BRING_TO_FRONT,MEDIA,LOCATION,NOTIFICATIONS,MIDI_SYSEX,POINTER_LOCK,FULL_SCREEN,OPEN_EXTERNAL,CUSTOM_TITLE_BAR,DEV_TOOLS_ENABLED,AUTO_LAUNCH_PATH,USER_DATA_PATH,OVERRIDE_USER_AGENT,CHROME_FLAGS,ENABLE_BROWSER_LOGIN,BROWSER_LOGIN_AUTOCONNECT,FORCE_AUTO_UPDATE"
            },

            // CleanRegistry
            //
            // We have some registry keys which are added by the SDA application when it is first launched. This custom
            // action will clean up those keys on uninstall. The name/location of keys have changed between different
            // versions of SDA, so we clean up all known variations, and ignore any missing ones.
            new ElevatedManagedAction(CustomActions.CleanRegistry, Return.ignore, When.After, Step.RemoveFiles, Condition.BeingUninstalled ),


            // CleanRegistryCurrentUser
            //
            // The registry keys stored under HKEY_CURRENT_USER can not be accessed through an ElevatedManagedAction, as
            // elevated actions run as a different user (local system account rather than current user) so those keys
            // are removed in this action.
            new ManagedAction(CustomActions.CleanRegistryCurrentUser, Return.ignore, When.After, Step.RemoveFiles, Condition.BeingUninstalled ),

            // Start Symphony after installation is complete
            new ManagedAction(CustomActions.StartAfterInstall, Return.ignore, When.After, Step.InstallFinalize, Condition.NOT_BeingRemoved )
            {
                UsesProperties = "INSTALLDIR,LAUNCH_ON_INSTALL,USER_DATA_PATH"
            },
        };

        // Use our own Symphony branded bitmap for installation dialogs
        project.BannerImage = "Banner.jpg";
        project.BackgroundImage = "Tabloid.jpg";
        project.ValidateBackgroundImage = false;

        // Define our own installation flow, using a mix of custom dialogs (defined in their own files) and built-in dialogs
        project.ManagedUI = new ManagedUI();
        project.ManagedUI.InstallDialogs.Add<Symphony.WelcomeDialog>()
                                        .Add<Symphony.CloseDialog>()
                                        .Add<Symphony.ProgressDialog>()
                                        .Add<Symphony.ExitDialog>();
        project.ManagedUI.ModifyDialogs.Add<Symphony.MaintenanceDialog>()
                                       .Add<Symphony.CloseDialog>()
                                       .Add<Symphony.ProgressDialog>()
                                       .Add<Symphony.ExitDialog>();

        project.Load += project_Load;

        project.ControlPanelInfo.NoRepair = true;
        project.ControlPanelInfo.NoModify = true;
        project.ControlPanelInfo.ProductIcon = @"..\..\..\images\icon.ico";
        project.ControlPanelInfo.Manufacturer = "Symphony";

        project.Platform = Platform.x64;

        // Generate an MSI from all settings done above
        Compiler.BuildMsi(project);
    }


    static void project_Load(SetupEventArgs e)
    {
        try
        {
            if (e.IsInstalling || e.IsUpgrading)
            {
                // "ALLUSERS" will be set to "2" if installing through UI, so the "MSIINSTALLPERUSER" property can be used so the user can choose install scope
                if (e.Session["ALLUSERS"] != "2")
                {
                    // If "ALLUSERS" is "1" or "", this is a quiet command line installation, and we need to set the right paths here, since the UI haven't.

                    if (e.Session["APPDIR"] != "")
                    {
                        // If "APPDIR" param was specified, just use that as is
                        e.Session["INSTALLDIR"] = e.Session["APPDIR"];
                    }
                    else if (e.Session["ALLUSERS"] == "")
                    {
                        // Install for current user
                        e.Session["INSTALLDIR"] = System.Environment.ExpandEnvironmentVariables(@"%LOCALAPPDATA%\Programs\Symphony\" + e.ProductName);
                    }
                    else
                    {
                        // Install for all users
                        e.Session["INSTALLDIR"] = e.Session["PROGRAMSFOLDER"] + @"\Symphony\" + e.ProductName;
                    }
                }

                // Try to close all running symphony instances before installing. Since we have started using the EndSession message to tell the app to exit,
                // we don't really need to force terminate anymore. But the older versions of SDA does not listen for the EndSession event, so we still need
                // this code to ensure older versions gets shut down properly.
                System.Diagnostics.Process.GetProcessesByName("Symphony").ForEach(p =>
                {
                    if (System.IO.Path.GetFileName(p.MainModule.FileName) == "Symphony.exe")
                    {
                        if (!p.HasExited)
                        {
                            p.Kill();
                            p.WaitForExit();
                        }
                    }
                });
            }
        }
        catch (System.ComponentModel.Win32Exception ex)
        {
            // We always seem to get this specific exception triggered, but the application still close down correctly.
            // The exception description is "Only part of a ReadProcessMemory or WriteProcessMemory request was completed".
            // We ignore that specific exception, so as not to put false error outputs into the log.
            if (ex.NativeErrorCode != 299)
            {
                e.Session.Log("Error trying to close all Symphony instances: " + ex.ToString());
            }
        }
        catch (System.Exception ex)
        {
            e.Session.Log("Error trying to close all Symphony instances: " + ex.ToString());
        }
    }
}

public class CustomActions
{
    // InstallVariant custom action
    [CustomAction]
    public static ActionResult InstallVariant(Session session)
    {
        try
        {
            // Create the InstallVariant.info file
            var installDir = session.Property("INSTALLDIR");
            var filename = System.IO.Path.Combine(installDir, @"config\InstallVariant.info");
            var installVariantFile = new System.IO.StreamWriter(filename);

            // Generate new GUID for each time we install, and write it as a text string to the file
            var guid = System.Guid.NewGuid();
            installVariantFile.Write(guid.ToString());

            installVariantFile.Close();
        }
        catch (System.Exception e)
        {
            session.Log("Error executing InstallVariant: " + e.ToString());
            return ActionResult.Failure;
        }
        return ActionResult.Success;
    }

    // UpdateConfig custom action
    [CustomAction]
    public static ActionResult UpdateConfig(Session session)
    {
        try
        {
            // Read the Symphony.config file
            var installDir = session.Property("INSTALLDIR");
            var filename = System.IO.Path.Combine(installDir, @"config\Symphony.config");
            string data = System.IO.File.ReadAllText(filename);

            // Replace all the relevant settings with values from the properties
            data = ReplaceProperty(data, "url", session.Property("POD_URL"));
            data = ReplaceProperty(data, "contextOriginUrl", session.Property("CONTEXT_ORIGIN_URL"));
            data = ReplaceProperty(data, "minimizeOnClose", session.Property("MINIMIZE_ON_CLOSE"));
            data = ReplaceProperty(data, "alwaysOnTop", session.Property("ALWAYS_ON_TOP"));
            data = ReplaceProperty(data, "launchOnStartup", session.Property("AUTO_START"));
            data = ReplaceProperty(data, "bringToFront", session.Property("BRING_TO_FRONT"));
            data = ReplaceProperty(data, "isCustomTitleBar", session.Property("CUSTOM_TITLE_BAR"));
            data = ReplaceProperty(data, "autoLaunchPath", FixPathFormat(session.Property("AUTO_LAUNCH_PATH")));
            data = ReplaceProperty(data, "userDataPath", FixPathFormat(session.Property("USER_DATA_PATH")));
            data = ReplaceProperty(data, "chromeFlags", session.Property("CHROME_FLAGS"));
            data = ReplaceBooleanProperty(data, "pointerLock", session.Property("POINTER_LOCK"));
            data = ReplaceBooleanProperty(data, "openExternal", session.Property("OPEN_EXTERNAL"));
            data = ReplaceBooleanProperty(data, "notifications", session.Property("NOTIFICATIONS"));
            data = ReplaceBooleanProperty(data, "midiSysex", session.Property("MIDI_SYSEX"));
            data = ReplaceBooleanProperty(data, "media", session.Property("MEDIA"));
            data = ReplaceBooleanProperty(data, "geolocation", session.Property("LOCATION"));
            data = ReplaceBooleanProperty(data, "fullscreen", session.Property("FULL_SCREEN"));
            data = ReplaceBooleanProperty(data, "devToolsEnabled", session.Property("DEV_TOOLS_ENABLED"));
            data = ReplaceBooleanProperty(data, "overrideUserAgent", session.Property("OVERRIDE_USER_AGENT"));
            data = ReplaceBooleanProperty(data, "enableBrowserLogin", session.Property("ENABLE_BROWSER_LOGIN"));
            data = ReplaceBooleanProperty(data, "browserLoginAutoConnect", session.Property("BROWSER_LOGIN_AUTOCONNECT"));
            data = ReplaceBooleanProperty(data, "forceAutoUpdate", session.Property("FORCE_AUTO_UPDATE"));
            // Write the contents back to the file
            System.IO.File.WriteAllText(filename, data);
        }
        catch (System.Exception e)
        {
            session.Log("Error executing UpdateConfig: " + e.ToString());
            return ActionResult.Failure;
        }
        return ActionResult.Success;
    }

    // Helper function called by UpdadeConfig action, for each config file value that needs to be
    // replaced by a value taken from the property. `data` is the entire contents of the config file.
    // `name` is the name of the setting in the config file (for example "url" or "minimizeOnClose".
    // `value` is the value to insert for the setting, and needs to be grabbed from the propery
    // collection before calling the function. The function returns the full config file content with
    // the requested replacement performed.
    static string ReplaceProperty(string data, string name, string value)
    {
        // Using regular expressions to replace the existing value in the config file with the
        // one from the property. This is the same as the regex we used to have in the old
        // Advanced Installer, which looked like this: "url"\s*:\s*".*" => "url": "[POD_URL]"
        return System.Text.RegularExpressions.Regex.Replace(data, @"""" + name + @"""\s*:\s*"".*""",
            @"""" + name + @""":""" + value.Trim() + @"""");
    }

    // Helper function called by UpdadeConfig action, for each config file value that needs to be
    // replaced by a value taken from the property. `data` is the entire contents of the config file.
    // `name` is the name of the setting in the config file (for example "url" or "minimizeOnClose".
    // `value` is the value to insert for the setting, and needs to be grabbed from the propery
    // collection before calling the function. The function returns the full config file content with
    // the requested replacement performed.
    static string ReplaceBooleanProperty(string data, string name, string value)
    {
        // Using regular expressions to replace the existing value in the config file with the
        // one from the property. This is the same as the regex we used to have in the old
        // Advanced Installer, which looked like this: "url"\s*:\s*".*" => "url": "[POD_URL]"
        return System.Text.RegularExpressions.Regex.Replace(data, @"""" + name + @"""\s*:\s*.[^,|\n|\r|\r\n]*",
            @"""" + name + @""":" + value.Trim());
    }

    // When SDA is parsing the JSON config file, it will interpret backslash as an escape character,
    // and will throw an error for invalid escape codes. To make a path valid for parsing, we need
    // to replace each backslash with doubli backslash. After SDA have parsed the JSON, it will make
    // the double backslash become single backslash again.
    static string FixPathFormat(string path)
    {
        return path.Replace(@"\", @"\\");
    }


    // CleanRegistry custom action
    [CustomAction]
    public static ActionResult CleanRegistry(Session session)
    {
        try
        {
            // Remove registry keys added for auto-launch

            using (var key = Registry.Users.OpenSubKey(@"\.DEFAULT\Software\Microsoft\Windows\CurrentVersion\Run", true))
            {
                if (key != null)
                {
                    key.DeleteValue("Symphony", false);
                }
            }

            // Remove registry keys added by protocol handlers

            using (var key = Registry.LocalMachine.OpenSubKey(@"Software\Classes", true))
            {
                if (key != null)
                {
                    key.DeleteSubKeyTree("symphony", false);
                }
            }
            using (var key = Registry.ClassesRoot.OpenSubKey(@"\", true))
            {
                if (key != null)
                {
                    key.DeleteSubKeyTree("symphony", false);
                }
            }
        }
        catch (System.Exception e)
        {
            session.Log("Error executing CleanRegistry: " + e.ToString());
            return ActionResult.Success;
        }
        return ActionResult.Success;
    }

    // CleanRegistryCurrentUser custom action
    [CustomAction]
    public static ActionResult CleanRegistryCurrentUser(Session session)
    {
        try
        {
            // Remove registry keys added for auto-launch

            using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true))
            {
                if (key != null)
                {
                    key.DeleteValue("Symphony", false);
                    key.DeleteValue("com.symphony.electron-desktop", false);
                    key.DeleteValue("electron.app.Symphony", false);
                }
            }

            // Remove registry keys added by protocol handlers & for phone calls

            using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Classes", true))
            {
                if (key != null)
                {
                    key.DeleteSubKeyTree("symphony", false);
                    key.DeleteSubKeyTree("Symphony.tel", false);
                    key.DeleteSubKeyTree("Symphony.sms", false);
                }
            }

            // Remove registry keys added for phone calls

            using (var key = Registry.CurrentUser.OpenSubKey(@"Software", true))
            {
                if (key != null)
                {
                    key.DeleteSubKeyTree("Symphony", false);
                }
            }

            // Remove registry keys added by phone calls - symphony app registration

            using (var key = Registry.CurrentUser.OpenSubKey(@"Software\RegisteredApplications", true))
            {
                if (key != null)
                {
                    key.DeleteValue("Symphony", false);
                }
            }
        }
        catch (System.Exception e)
        {
            session.Log("Error executing CleanRegistryCurrentUser: " + e.ToString());
            return ActionResult.Success;
        }
        return ActionResult.Success;
    }

    // StartAfterInstall custom action
    [CustomAction]
    public static ActionResult StartAfterInstall(Session session)
    {
        try
        {
            if (session.Property("LAUNCH_ON_INSTALL") == "true")
            {
                System.Diagnostics.Process process = new System.Diagnostics.Process();
                process.StartInfo.FileName = System.IO.Path.Combine(session.Property("INSTALLDIR"), "Symphony.exe");
                if (session.Property("USER_DATA_PATH") != "")
                {
                    process.StartInfo.Arguments = "--userDataPath=\"" + session.Property("USER_DATA_PATH") + "\"";
                }
                process.Start();
            }
        }
        catch (System.Exception e)
        {
            session.Log("Error executing StartAfterInstall: " + e.ToString());
            return ActionResult.Failure;
        }
        return ActionResult.Success;
    }
}
