//css_dir ..\..\;
//css_ref System.Core.dll;
//css_ref Wix_bin\SDK\Microsoft.Deployment.WindowsInstaller.dll;
//css_ref WixSharp.UI.dll;

using WixSharp;

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
                new File(@"..\..\dist\win-unpacked\Symphony.exe"),
                new File(@"..\..\dist\win-unpacked\chrome_100_percent.pak"),
                new File(@"..\..\dist\win-unpacked\chrome_200_percent.pak"),
                new File(@"..\..\dist\win-unpacked\d3dcompiler_47.dll"),
                new File(@"..\..\dist\win-unpacked\ffmpeg.dll"),
                new File(@"..\..\dist\win-unpacked\icudtl.dat"),
                new File(@"..\..\dist\win-unpacked\libEGL.dll"),
                new File(@"..\..\dist\win-unpacked\libGLESv2.dll"),
                new File(@"..\..\dist\win-unpacked\LICENSE.electron.txt"),
                new File(@"..\..\dist\win-unpacked\LICENSES.chromium.html"),
                new File(@"..\..\dist\win-unpacked\resources.pak"),
                new File(@"..\..\dist\win-unpacked\snapshot_blob.bin"),
                new File(@"..\..\dist\win-unpacked\v8_context_snapshot.bin"),
                new File(@"..\..\dist\win-unpacked\vk_swiftshader.dll"),
                new File(@"..\..\dist\win-unpacked\vk_swiftshader_icd.json"),
                new File(@"..\..\dist\win-unpacked\vulkan-1.dll"),
                new File(@"..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\screen-share-indicator-frame\ScreenShareIndicatorFrame.exe"),
                new File(@"..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\screen-snippet\ScreenSnippet.exe"),
                new Dir(@"config",
                    new Files(@"..\..\dist\win-unpacked\config\*.*")
                ),
                new Dir(@"dictionaries",
                    new Files(@"..\..\dist\win-unpacked\dictionaries\*.*")
                ),
                new Dir(@"library",
                    new File(@"..\..\library\dictionary"),
                    new File(@"..\..\library\indexvalidator-x64.exe"),
                    new File(@"..\..\library\libsymphonysearch-x64.dll"),
                    new File(@"..\..\library\lz4-win-x64.exe"),
                    new File(@"..\..\library\tar-win.exe")
                ),
                new Dir(@"locales",
                    new Files(@"C:\symphony\SymphonyElectron\node_modules\electron\dist\locales\*.*")
                ),
                new Dir(@"resources",
                    new DirFiles(@"..\..\dist\win-unpacked\resources\*.*"),
                    new Dir(@"app.asar.unpacked",
                        new Dir(@"node_modules",
                            new Dir(@"@felixrieseberg\spellchecker\build\Release",
                                new File(@"..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\@felixrieseberg\spellchecker\build\Release\spellchecker.node")
                            ),
                            new Dir(@"cld\build\Release",
                                new File(@"..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\cld\build\Release\cld.node")
                            ),
                            new Dir(@"diskusage\build\Release",
                                new File(@"..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\diskusage\build\Release\diskusage.node")
                            ),
                            new Dir(@"ffi-napi\build\Release",
                                new File(@"..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\ffi-napi\build\Release\ffi_bindings.node")
                            ),
                            new Dir(@"keyboard-layout\build\Release",
                                new File(@"..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\keyboard-layout\build\Release\keyboard-layout-manager.node")
                            ),
                            new Dir(@"ref-napi\build\Release",
                                new File(@"..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\ref-napi\build\Release\binding.node")
                            ),
                            new Dir(@"spawn-rx",
                                new Files(@"..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\spawn-rx\*.*")
                            ),
                            new Dir(@"swift-search\node_modules",
                                new Dir(@"ffi-napi\build\Release",
                                    new File(@"..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\swift-search\node_modules\ffi-napi\build\Release\ffi_bindings.node")
                                ),
                                new Dir(@"ref-napi\build\Release",
                                    new File(@"..\..\dist\win-unpacked\resources\app.asar.unpacked\node_modules\swift-search\node_modules\ref-napi\build\Release\binding.node")
                                )
                            )
                        )
                    )
                ),
                new Dir(@"swiftshader",
                    new Files(@"..\..\dist\win-unpacked\swiftshader\*.*")
                )
            )
		);
		
		// Generate and MSI from all settings done above
        Compiler.BuildMsi(project);
    }
}


