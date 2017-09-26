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

- (BOOL)shouldExitPane:(InstallerSectionDirection)dir {
    
    NSString *podUrl = [_podUrlTextBox stringValue];
    NSURL *validUrl = [NSURL URLWithString:podUrl];
    
    if (!validUrl || !validUrl.host) {
        
        [_podUrlAlertTextBox setTitleWithMnemonic:@"Please enter a valid Pod url.\nIt should be in the format \"https://corporate.symphony.com\""];
        
        return NO;
        
    }
    
    return YES;
    
}

- (void)willExitPane:(InstallerSectionDirection)dir {
        
    NSString *podUrl = [_podUrlTextBox stringValue];
    
    // If the pod url is empty, by default, set it to my.symphony.com
    if ([podUrl length] == 0) {
        podUrl = @"https://corporate.symphony.com";
    }
        
    // By default, set autoLaunchOnStart to true
    NSString *autoLaunchOnStart = @"true";
    
    // If the checkbox is changed, set the auto launch value accordingly
    if ([_autoLaunchCheckBox state] == 0) {
        autoLaunchOnStart = @"false";
    }
    
    // By default, set minimizeOnClose and alwaysOnTop to false
    NSString *minimizeOnClose = @"false";
    NSString *alwaysOnTop = @"false\n";
    
    // If the checkbox is changed, set the minimize on close value accordingly
    if ([_minimizeOnCloseCheckBox state] == 1) {
        minimizeOnClose = @"true";
    }
    
    // If the checkbox is changed, set the always on top value accordingly
    if ([_alwaysOnTopCheckBox state] == 1) {
        alwaysOnTop = @"true\n";
    }
    
    // Create an array with the selected options
    NSArray *symSettings = [[NSArray alloc] initWithObjects:podUrl, minimizeOnClose, autoLaunchOnStart, alwaysOnTop, nil];
    
    // Create a string from the array with new-line as the separator
    NSString *symSettingsString = [symSettings componentsJoinedByString:@"\n"];
    
    // Write all the above settings to file
    [symSettingsString writeToFile:@"/tmp/sym_settings.txt" atomically:YES encoding:NSUTF8StringEncoding error:nil];
    
}

@end
