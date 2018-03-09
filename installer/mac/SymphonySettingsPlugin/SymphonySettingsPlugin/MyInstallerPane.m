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
    [_podUrlAlertTextBox setTitleWithMnemonic:@""];
}

- (BOOL)shouldExitPane:(InstallerSectionDirection)dir {
    
    NSString *podUrl = [_podUrlTextBox stringValue];
    
    // Check if the url contains a protocol, if not, prepend https to it
    NSString *securePrefix = @"https://";
    NSString *prefix = @"http://";
    if (![podUrl hasPrefix:securePrefix] && ![podUrl hasPrefix:prefix]) {
        podUrl = [securePrefix stringByAppendingString:podUrl];
        [_podUrlTextBox setStringValue:podUrl];
    }
    
    // Now, validate the url against a url regex
    NSString *regex = @"^(https:\/\/)(www.)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}(:[0-9]{1,5})?(\/[a-zA-Z0-9-_.+!*'(),;/?:@=&$]*)?$";
    NSPredicate *podUrlTest = [NSPredicate predicateWithFormat:@"SELF MATCHES %@", regex];
    if ([podUrlTest evaluateWithObject:podUrl]) {
        return YES;
    }
    
    // In case of an invalid url, display the message under the pod url text box
    // and don't go to the next screen, hence return NO
    [_podUrlAlertTextBox setTitleWithMnemonic:@"Please enter a valid Pod url."];
    return NO;
    
}

- (void)willExitPane:(InstallerSectionDirection)dir {
    
    NSString *podUrl = [_podUrlTextBox stringValue];
        
    // By default, set autoLaunchOnStart and minimizeOnClose to true
    NSString *autoLaunchOnStart = @"true";
    NSString *minimizeOnClose = @"true";
    
    // If the checkbox is changed, set the auto launch value accordingly
    if ([_autoLaunchCheckBox state] == 0) {
        autoLaunchOnStart = @"false";
    }
    
    // If the checkbox is changed, set the minimize on close value accordingly
    if ([_minimizeOnCloseCheckBox state] == 0) {
        minimizeOnClose = @"false";
    }
    
    // By default, set alwaysOnTop and bring to front to false
    NSString *alwaysOnTop = @"false";
    NSString *bringToFront = @"false\n";
    
    // If the checkbox is changed, set the always on top value accordingly
    if ([_alwaysOnTopCheckBox state] == 1) {
        alwaysOnTop = @"true";
    }
    
    // If the checkbox is changed, set the bring to front value accordingly
    if ([_bringToFrontCheckBox state] == 1) {
        bringToFront = @"true\n";
    }
    
    // Create an array with the selected options
    NSArray *symSettings = [[NSArray alloc] initWithObjects:podUrl, minimizeOnClose, autoLaunchOnStart, alwaysOnTop, bringToFront, nil];
    
    // Create a string from the array with new-line as the separator
    NSString *symSettingsString = [symSettings componentsJoinedByString:@"\n"];
    
    // Write all the above settings to file
    [symSettingsString writeToFile:@"/tmp/sym_settings.txt" atomically:YES encoding:NSUTF8StringEncoding error:nil];
    
}

@end
