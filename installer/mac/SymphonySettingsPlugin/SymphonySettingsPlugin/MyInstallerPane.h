//
//  MyInstallerPane.h
//  SymphonySettingsPlugin
//
//  Copyright © 2017 Symphony. All rights reserved.
//

#import <InstallerPlugins/InstallerPlugins.h>

@interface MyInstallerPane : InstallerPane<NSTextFieldDelegate>

@property (weak) IBOutlet NSTextField *podUrlTextBox;
@property (weak) IBOutlet NSTextField *podUrlAlertTextBox;
@property (weak) IBOutlet NSButton *ssoCheckBox;

@end
