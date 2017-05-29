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

- (void)willExitPane:(InstallerSectionDirection)dir {
    
    // Set the default protocol to https
    NSString *protocol = @"https://";
    
    NSString *podUrl = [_podUrlTextBox stringValue];
    
    // If the pod url is empty, by default, set it to my.symphony.com
    if ([podUrl length] == 0) {
        podUrl = @"my.symphony.com";
    }
    
    // Create the final url
    NSString *finalUrl = [protocol stringByAppendingString: podUrl];
    
    // By default, set minimizeOnClose and autoLaunchOnStart to true
    NSString *minimizeOnClose = @"true";
    NSString *autoLaunchOnStart = @"true\n";
    
    // If the checkbox is changed, set the minimize on close value accordingly
    if ([_minimizeOnCloseCheckBox state] == 0) {
        minimizeOnClose = @"false";
    }
    
    // If the checkbox is changed, set the auto launch value accordingly
    if ([_autoLaunchCheckBox state] == 0) {
        autoLaunchOnStart = @"false\n";
    }
    
    NSArray *symSettings = [[NSArray alloc] initWithObjects:finalUrl, minimizeOnClose, autoLaunchOnStart, nil];
    NSString *symSettingsString = [symSettings componentsJoinedByString:@"\n"];
    
    // Write all the above settings to file
    [symSettingsString writeToFile:@"/tmp/sym_settings.txt" atomically:YES encoding:NSUTF8StringEncoding error:nil];
    
}


@end
