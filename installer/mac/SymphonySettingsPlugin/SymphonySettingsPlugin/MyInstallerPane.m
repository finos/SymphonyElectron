//
//  MyInstallerPane.m
//  SymphonySettingsPlugin
//
//  Copyright © 2017 Symphony. All rights reserved.
//

#import "MyInstallerPane.h"

@implementation MyInstallerPane

- (NSString *)title
{
    return [[NSBundle bundleForClass:[self class]] localizedStringForKey:@"PaneTitle" value:nil table:nil];
}

- (void)willEnterPane:(InstallerSectionDirection)dir {
    // By default, set the value of the error message textbox to an empty string
    _podUrlAlertTextBox.stringValue = @"";
    [_podUrlTextBox setToolTip:@"Enter pod url in the format \"https://corporate.symphony.com\""];
    
    [_ssoCheckBox setToolTip:@"Only check this option if your Symphony POD has been configured for SSO, in doubt do not check - contact your Symphony Admin"];
}

- (BOOL)shouldExitPane:(InstallerSectionDirection)dir {
    
    NSString *podUrl = [_podUrlTextBox stringValue];
    
    // Now, validate the url against a url regex
    NSString *regex = @"^(https:\\/\\/)?(www.)?[a-z0-9]+([\\-\\.]{1}[a-z0-9]+)*\\.[a-z]{2,}(:[0-9]{1,5})?(\\/[a-zA-Z0-9-_.+!*'(),;\\/?:@=&$]*)?$";
    
    NSPredicate *podUrlTest = [NSPredicate predicateWithFormat:@"SELF MATCHES %@", regex];
    
    if (![podUrlTest evaluateWithObject:podUrl]) {
        _podUrlAlertTextBox.stringValue = @"Please enter a valid Pod url.";
        return NO;
    }
    
    if ([podUrl rangeOfString:@"[POD]"].location != NSNotFound) {
        _podUrlAlertTextBox.stringValue = @"Please enter a valid Pod url.";
        return NO;
    }
    
    // Double confirmation for disabling media
    if ([_mediaCheckBox state] == 0) {
        
        NSAlert *alert = [[NSAlert alloc] init];
        [alert setMessageText: @"Are you sure you wish to disable the camera, microphone, and speakers?"];
        [alert setInformativeText:@"Once disabled, users won't be able to participate in RTC calls effectively"];
        [alert addButtonWithTitle:@"No"];
        [alert addButtonWithTitle:@"Yes"];
        [alert setAlertStyle:NSWarningAlertStyle];
        
        NSInteger button = [alert runModal];
        
        if (button == NSAlertFirstButtonReturn) {
            return NO;
        }
        
        return YES;
        
    }
    
    return YES;
    
}

- (void)willExitPane:(InstallerSectionDirection)dir {
    
    [self writeSettingsToFile];
    [self writePermissionsToFile];
    
}

- (void)writeSettingsToFile {
    
    NSString *podUrl = [_podUrlTextBox stringValue];
    
    NSString *securePrefix = @"https://";
    if (![podUrl hasPrefix:securePrefix]) {
        podUrl = [securePrefix stringByAppendingString:podUrl];
        [_podUrlTextBox setStringValue:podUrl];
    }
    
    // By default, set autoLaunchOnStart and minimizeOnClose to true
    NSString *autoLaunchOnStart = @"true";
    NSString *minimizeOnClose = @"true";
    NSString *alwaysOnTop = @"false";
    NSString *bringToFront = @"false";
    NSString *devToolsEnabled = @"true\n";
    
    // If the checkbox is changed, set the auto launch value accordingly
    if ([_autoLaunchCheckBox state] == 0) {
        autoLaunchOnStart = @"false";
    }
    
    // If the checkbox is changed, set the minimize on close value accordingly
    if ([_minimizeOnCloseCheckBox state] == 0) {
        minimizeOnClose = @"false";
    }
    
    // If the checkbox is changed, set the always on top value accordingly
    if ([_alwaysOnTopCheckBox state] == 1) {
        alwaysOnTop = @"true";
    }
    
    // If the checkbox is changed, set the bring to front value accordingly
    if ([_bringToFrontCheckBox state] == 1) {
        bringToFront = @"true";
    }
    
    // If the checkbox is changed, set the dev tools enabled value accordingly
    if ([_devToolsCheckBox state] == 0) {
        devToolsEnabled = @"false\n";
    }
    
    // Create an array with the selected options
    NSArray *symSettings = [[NSArray alloc] initWithObjects:podUrl, minimizeOnClose, autoLaunchOnStart, alwaysOnTop, bringToFront, devToolsEnabled, nil];
    
    // Create a string from the array with new-line as the separator
    NSString *symSettingsString = [symSettings componentsJoinedByString:@"\n"];
    
    // Write all the above settings to file
    [symSettingsString writeToFile:@"/tmp/sym_settings.txt" atomically:YES encoding:NSUTF8StringEncoding error:nil];
    
}

- (void)writePermissionsToFile {
    
    // By default, set all the values to true
    NSString *media = @"true";
    NSString *geoLocation = @"true";
    NSString *notifications = @"true";
    NSString *pointerLock = @"true";
    NSString *fullScreen = @"true";
    NSString *openExternalApp = @"true";
    NSString *midiSysex = @"true";
    
    if ([_mediaCheckBox state] == 0) {
        media = @"false";
    }
    
    if ([_geoLocationCheckBox state] == 0) {
        geoLocation = @"false";
    }
    
    if ([_notificationsCheckBox state] == 0) {
        notifications = @"false";
    }
    
    if ([_pointerLockCheckBox state] == 0) {
        pointerLock = @"false";
    }
    
    if ([_fullScreenCheckBox state] == 0) {
        fullScreen = @"false";
    }
    
    if ([_openExternalAppCheckBox state] == 0) {
        openExternalApp = @"false";
    }
    
    if ([_midiSysexCheckBox state] == 0) {
        midiSysex = @"false";
    }
    
    // Create an array with the selected options
    NSArray *symPermissions = [[NSArray alloc] initWithObjects:media, geoLocation, notifications, midiSysex, pointerLock, fullScreen, openExternalApp, nil];
    
    // Create a string from the array with new-line as the separator
    NSString *symPermissionsString = [symPermissions componentsJoinedByString:@"\n"];
    
    // Write all the above settings to file
    [symPermissionsString writeToFile:@"/tmp/sym_permissions.txt" atomically:YES encoding:NSUTF8StringEncoding error:nil];
    
}

- (IBAction)handleSSOCheckboxStateChange:(id)sender {
    
    NSString *podUrl = [_podUrlTextBox stringValue];
    
    NSString *ssoUrl = @"/login/sso/initsso";
    if ([_ssoCheckBox state] == 1) {
        podUrl = [podUrl stringByAppendingString:ssoUrl];
        [_podUrlTextBox setStringValue:podUrl];
    } else {
        podUrl = [podUrl substringToIndex:podUrl.length - ssoUrl.length];
        [_podUrlTextBox setStringValue:podUrl];
    }
    
}

@end
