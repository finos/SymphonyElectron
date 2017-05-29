//
//  MyInstallerPane.h
//  SymphonySettingsPlugin
//
//  Copyright © 2017 Symphony. All rights reserved.
//

#import <InstallerPlugins/InstallerPlugins.h>

@interface MyInstallerPane : InstallerPane

@property (weak) IBOutlet NSButton *minimizeOnCloseCheckBox;
@property (weak) IBOutlet NSButton *autoLaunchCheckBox;
@property (weak) IBOutlet NSTextField *podUrlTextBox;

@end
