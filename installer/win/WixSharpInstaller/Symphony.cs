//css_dir ..\WixSharpToolset\;
//css_ref System.Core.dll;
//css_ref System.Windows.Forms.dll;
//css_ref Wix_bin\SDK\Microsoft.Deployment.WindowsInstaller.dll;
//css_ref WixSharp.UI.dll;
//css_imp WelcomeDlg.cs;
//css_imp WelcomeDlg.designer.cs;
//css_imp CloseDlg.cs;
//css_imp CloseDlg.designer.cs;
//css_imp InstallDirDialog.cs
//css_imp InstallDirDialog.Designer.cs
//css_imp ExitDlg.cs;
//css_imp ExitDlg.designer.cs;
//css_imp MaintenanceDlg.cs;
//css_imp MaintenanceDlg.designer.cs;
//css_imp ProgressDialog.cs
//css_imp ProgressDialog.Designer.cs
//css_imp MaintenanceTypeDialog.cs;
//css_imp MaintenanceTypeDialog.designer.cs;

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

        // Create a wixsharp project instance and assign the project name to it, and a hierarchy of all files to include
        // Files are taken from multiple locations, and not all files in each location should be included, which is why
        // the file list is rather long and explicit. At some point we might make the `dist` folder match exactly the
        // desired contents of installation, and then we can simplify this bit.
        var project = new ManagedProject(productName,
            new Dir(@"%ProgramFiles%\" + productName,
                new File(new Id("symphony_exe"), @"..\..\..\dist\win-unpacked\Symphony.exe",
                    // Create two shortcuts to the main Symphony.exe file, one on the desktop and one in the program menu
                    new FileShortcut(productName, @"%Desktop%") { IconFile = @"..\..\..\images\icon.ico" },
                    new FileShortcut(productName, @"%ProgramMenu%") { IconFile = @"..\..\..\images\icon.ico" }
                ),
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
                new Dir(@"config",
                    new Files(@"..\..\..\dist\win-unpacked\config\*.*")
                ),
                new Dir(@"dictionaries",
                    new Files(@"..\..\..\dist\win-unpacked\dictionaries\*.*")
                ),
                new Dir(@"library",
                    new File(@"..\..\..\library\dictionary"),
                    new File(@"..\..\..\library\indexvalidator-x64.exe"),
                    new File(@"..\..\..\library\libsymphonysearch-x64.dll"),
                    new File(@"..\..\..\library\lz4-win-x64.exe"),
                    new File(@"..\..\..\library\tar-win.exe")
                ),
                new Dir(@"locales",
                    new Files(@"..\..\..\node_modules\electron\dist\locales\*.*")
                ),
                new Dir(@"resources",
                    new DirFiles(@"..\..\..\dist\win-unpacked\resources\*.*"),
                    new Dir(@"app.asar.unpacked",
                        new Dir(@"node_modules",
                            new Dir(@"@felixrieseberg\spellchecker\build\Release",
                                new File(@"..\..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\@felixrieseberg\spellchecker\build\Release\spellchecker.node")
                            ),
                            new Dir(@"cld\build\Release",
                                new File(@"..\..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\cld\build\Release\cld.node")
                            ),
                            new Dir(@"diskusage\build\Release",
                                new File(@"..\..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\diskusage\build\Release\diskusage.node")
                            ),
                            new Dir(@"ffi-napi\build\Release",
                                new File(@"..\..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\ffi-napi\build\Release\ffi_bindings.node")
                            ),
                            new Dir(@"keyboard-layout\build\Release",
                                new File(@"..\..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\keyboard-layout\build\Release\keyboard-layout-manager.node")
                            ),
                            new Dir(@"ref-napi\build\Release",
                                new File(@"..\..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\ref-napi\build\Release\binding.node")
                            ),
                            new Dir(@"spawn-rx",
                                new Files(@"..\..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\spawn-rx\*.*")
                            ),
                            new Dir(@"swift-search\node_modules",
                                new Dir(@"ffi-napi\build\Release",
                                    new File(@"..\..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\swift-search\node_modules\ffi-napi\build\Release\ffi_bindings.node")
                                ),
                                new Dir(@"ref-napi\build\Release",
                                    new File(@"..\..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\swift-search\node_modules\ref-napi\build\Release\binding.node")
                                )
                            )
                        )
                    )
                ),
                new Dir(@"swiftshader",
                    new Files(@"..\..\..\dist\win-unpacked\swiftshader\*.*")
                )
            ),

            // Add a launch condition to require Windows Server 2008 or later
            // The property values to compare against can be found here:
            //    https://docs.microsoft.com/en-us/windows/win32/msi/operating-system-property-values
            new LaunchCondition("VersionNT>=600 AND WindowsBuild>=6001", "OS not supported"),

            // Add registry entry used by protocol handler to launch symphony when opening symphony:// URIs
            new RegValue(WixSharp.RegistryHive.ClassesRoot, productName + @"\shell\open\command", "", "\"[INSTALLDIR]Symphony.exe\" \"%1\"")
        );

        // The build script which calls the wix# builder, will be run from a command environment which has %SYMVER% set.
        // So we just extract that version string, create a Version object from it, and pass it to out project definition.
        var version = System.Environment.GetEnvironmentVariable("SYMVER");
        project.Version = new System.Version(version);

        // To get the correct behaviour with upgrading the product, the product GUID needs to be different for every build,
        // but the UpgradeCode needs to stay the same. If we wanted to make a new major version and allow it to be installed
        // side-by-side with the previous version, we would generate a new UpgradeCode for the new version onwards.
        // More details can be found in this stackoverflow post:
        //      https://stackoverflow.com/a/26344742
        project.GUID = System.Guid.NewGuid();
        project.UpgradeCode = new System.Guid("{a9b448c9-f065-41a4-87c3-da527c6a389b}");

        // Don't allow installation of earlier versions, but do allow installing the same version as is already installed.
        project.MajorUpgrade = new MajorUpgrade();
        project.MajorUpgrade.AllowDowngrades = false;
        project.MajorUpgrade.AllowSameVersionUpgrades = true;
        project.MajorUpgrade.DowngradeErrorMessage = "A more recent version of Symphony is already installed on this computer.";

        // Declare all the custom properties we want to use, and assign them default values. It is possible to override
        // these when running the installer, but if not specified, the defaults will be used.
        project.Properties = new[]
        {
            new PublicProperty("ALLUSERS", "true"),
            new PublicProperty("ALWAYS_ON_TOP", "DISABLED" ),
            new PublicProperty("AUTO_LAUNCH_PATH", ""),
            new PublicProperty("AUTO_START", "ENABLED"),
            new PublicProperty("BRING_TO_FRONT", "DISABLED"),
            new PublicProperty("CUSTOM_TITLE_BAR", "ENABLED"),
            new PublicProperty("DEV_TOOLS_ENABLED", "true"),
            new PublicProperty("FULL_SCREEN", "true"),
            new PublicProperty("LOCATION", "true"),
            new PublicProperty("MEDIA", "true"),
            new PublicProperty("MIDI_SYSEX", "true"),
            new PublicProperty("MINIMIZE_ON_CLOSE", "ENABLED"),
            new PublicProperty("NOTIFICATIONS", "true"),
            new PublicProperty("OPEN_EXTERNAL", "true"),
            new PublicProperty("POD_URL", "https://my.symphony.com"),
            new PublicProperty("POINTER_LOCK", "true"),
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
            new ElevatedManagedAction(CustomActions.InstallVariant, Return.check, When.After, Step.InstallFiles, Condition.NOT_Installed )
            {
                // INSTALLDIR is a built-in property, and we need it to know which path to write the InstallVariant to
                UsesProperties = "INSTALLDIR"
            },

            // UpdateConfig
            //
            // After installation, the Symphony.config file needs to be updated with values from the install properties,
            // either their default values as specified above, or with the overridden value if an override was specified
            // on the command line when the installer was started.
            new ElevatedManagedAction(CustomActions.UpdateConfig, Return.check, When.After, Step.InstallFiles, Condition.NOT_Installed )
            {
                // The UpdateConfig action needs the built-in property INSTALLDIR as well as most of the custom properties
                UsesProperties = "INSTALLDIR,POD_URL,MINIMIZE_ON_CLOSE,ALWAYS_ON_TOP,AUTO_START,BRING_TO_FRONT,MEDIA,LOCATION,NOTIFICATIONS,MIDI_SYSEX,POINTER_LOCK,FULL_SCREEN,OPEN_EXTERNAL,CUSTOM_TITLE_BAR,DEV_TOOLS_ENABLED,AUTO_LAUNCH_PATH"
            },

            // CleanRegistry
            //
            // We have some registry keys which are added by the SDA application when it is first launched. This custom
            // action will clean up those keys on uninstall. The name/location of keys have changed between different
            // versions of SDA, so we clean up all known variations, and ignore any missing ones.
            new ElevatedManagedAction(CustomActions.CleanRegistry, Return.ignore, When.After, Step.RemoveFiles, Condition.Installed ),

            // Start Symphony after installation is complete
            new InstalledFileAction("symphony_exe", "", Return.asyncNoWait, When.After, Step.InstallFinalize, Condition.NOT_Installed)
        };

        // Use our own Symphony branded bitmap for installation dialogs
        project.BannerImage = "Banner.jpg";
        project.BackgroundImage = "Tabloid.jpg";

        // Define our own installation flow, using a mix of custom dialogs (defined in their own files) and built-in dialogs
        project.ManagedUI = new ManagedUI();
        project.ManagedUI.InstallDialogs.Add<Symphony.WelcomeDlg>()
                                        .Add<Symphony.InstallDirDialog>()
                                        .Add<Symphony.ProgressDialog>()
                                        .Add<Symphony.ExitDlg>()
                                        .Add<Symphony.CloseDlg>();
        project.ManagedUI.ModifyDialogs.Add<Symphony.MaintenanceDlg>()
                                       .Add<Symphony.MaintenanceTypeDialog>()
                                        .Add<Symphony.ProgressDialog>()
                                       .Add<Symphony.ExitDlg>();

        project.Load += project_Load;
        project.BeforeInstall += project_BeforeInstall;

        project.ControlPanelInfo.NoRepair = true;
        project.ControlPanelInfo.NoModify = true;

        project.Platform = Platform.x64;

        // Generate an MSI from all settings done above
        Compiler.BuildMsi(project);
    }

    static void project_Load(SetupEventArgs e)
    {
        try
        {
            // Try to close all running symphony instances before installing
            System.Diagnostics.Process.GetProcessesByName("Symphony").ForEach(p => {
                if( System.IO.Path.GetFileName(p.MainModule.FileName) =="Symphony.exe")
                {
                    if( !p.HasExited )
                    {
                        p.Kill();
                        p.WaitForExit();
                    }
                }
            });
        }
        catch (System.ComponentModel.Win32Exception ex)
        {
            // We always seem to get this specific exception triggered, but the application still close down correctly.
            // The exception description is "Only part of a ReadProcessMemory or WriteProcessMemory request was completed".
            // We ignore that specific exception, so as not to put false error outputs into the log.
            if (ex.NativeErrorCode != 299) {
                e.Session.Log("Error trying to close all Symphony instances: " + ex.ToString() );
            }
        }
        catch (System.Exception ex)
        {
            e.Session.Log("Error trying to close all Symphony instances: " + ex.ToString() );
        }
    }

    // Display a confirmation dialog when uninstalling Symphony, and cancel uninstall unless user confirms.
    static void project_BeforeInstall(SetupEventArgs e)
    {
        try
        {
            if (e.IsUninstalling && e.Session["REMOVE"] == "ALL")
            {
                var result = System.Windows.Forms.MessageBox.Show("Are you sure you want to uninstall this product?",
                    "Windows Installer", System.Windows.Forms.MessageBoxButtons.YesNo);
                if (result != System.Windows.Forms.DialogResult.Yes)
                {
                    e.Result = ActionResult.UserExit; // Signal to installer to exit
                }
            }
        }
        catch (System.Exception ex)
        {
            e.Session.Log("Error displaying uninstall confirmation dialog: " + ex.ToString() );
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
            session.Log("Error executing InstallVariant: " + e.ToString() );
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
            data = ReplaceProperty(data, "minimizeOnClose", session.Property("MINIMIZE_ON_CLOSE"));
            data = ReplaceProperty(data, "alwaysOnTop", session.Property("ALWAYS_ON_TOP"));
            data = ReplaceProperty(data, "launchOnStartup", session.Property("AUTO_START"));
            data = ReplaceProperty(data, "bringToFront", session.Property("BRING_TO_FRONT"));
            data = ReplaceProperty(data, "media", session.Property("MEDIA"));
            data = ReplaceProperty(data, "geolocation", session.Property("LOCATION"));
            data = ReplaceProperty(data, "notifications", session.Property("NOTIFICATIONS"));
            data = ReplaceProperty(data, "midiSysex", session.Property("MIDI_SYSEX"));
            data = ReplaceProperty(data, "pointerLock", session.Property("POINTER_LOCK"));
            data = ReplaceProperty(data, "fullscreen", session.Property("FULL_SCREEN"));
            data = ReplaceProperty(data, "openExternal", session.Property("OPEN_EXTERNAL"));
            data = ReplaceProperty(data, "isCustomTitleBar", session.Property("CUSTOM_TITLE_BAR"));
            data = ReplaceProperty(data, "devToolsEnabled", session.Property("DEV_TOOLS_ENABLED"));
            data = ReplaceProperty(data, "autoLaunchPath", session.Property("AUTO_LAUNCH_PATH"));

            // Write the contents back to the file
            System.IO.File.WriteAllText(filename, data);
        }
        catch (System.Exception e)
        {
            session.Log("Error executing UpdateConfig: " + e.ToString() );
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
    static string ReplaceProperty( string data, string name, string value )
    {
        // Using regular expressions to replace the existing value in the config file with the
        // one from the property. This is the same as the regex we used to have in the old
        // Advanced Installer, which looked like this: "url"\s*:\s*".*" => "url": "[POD_URL]"
        return System.Text.RegularExpressions.Regex.Replace(data, @"""" + name + @"""\s*:\s*"".*""",
            @"""" + name + @""":""" + value.Trim() + @"""");
    }

    // CleanRegistry custom action
    [CustomAction]
    public static ActionResult CleanRegistry(Session session)
    {
        try
        {
            // Remove registry keys added for auto-launch

            using( var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true) )
            {
                if (key != null)
                {
                    key.DeleteValue("Symphony", false);
                    key.DeleteValue("com.symphony.electron-desktop", false);
                    key.DeleteValue("electron.app.Symphony", false);
                }
            }
            using( var key = Registry.Users.OpenSubKey(@"\.DEFAULT\Software\Microsoft\Windows\CurrentVersion\Run", true) )
            {
                if (key != null)
                {
                    key.DeleteValue("Symphony", false);
                }
            }


            // Remove registry keys added by protocol handlers

            using( var key = Registry.CurrentUser.OpenSubKey(@"Software\Classes", true) )
            {
                if (key != null)
                {
                    key.DeleteSubKeyTree("symphony", false);
                }
            }
            using( var key = Registry.LocalMachine.OpenSubKey(@"Software\Classes", true) )
            {
                if (key != null)
                {
                    key.DeleteSubKeyTree("symphony", false);
                }
            }
            using( var key = Registry.ClassesRoot.OpenSubKey(@"\", true) )
            {
                if (key != null)
                {
                    key.DeleteSubKeyTree("symphony", false);
                }
            }
        }
        catch (System.Exception e)
        {
            session.Log("Error executing CleanRegistry: " + e.ToString() );
            return ActionResult.Success;
        }
        return ActionResult.Success;
    }
}
