import { exec } from 'child_process';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { PhoneNumberProtocol } from '../common/api-interface';
import { isDevEnv, isMac, isWindowsOS } from '../common/env';
import { logger } from '../common/logger';

const LS_REGISTER_PATH =
  '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister';
enum REGISTRY_PATHS {
  Classes = '\\Software\\Classes',
  Capabilities = '\\Software\\Symphony\\Capabilities',
  UrlRegistration = '\\Software\\Symphony\\Capabilities\\URLAssociations',
  SymTelCmd = '\\Software\\Classes\\Symphony.tel\\shell\\open\\command',
  SymSmsCmd = '\\Software\\Classes\\Symphony.sms\\shell\\open\\command',
  SymTelDefaultIcon = '\\Software\\Classes\\Symphony.tel\\DefaultIcon',
  SymSmsDefaultIcon = '\\Software\\Classes\\Symphony.sms\\DefaultIcon',
  RegisteredApps = '\\Software\\RegisteredApplications',
}

class VoiceHandler {
  /**
   * Registers Symphony as  phone calls/SMS app
   */
  public registerSymphonyAsDefaultApp(protocols: PhoneNumberProtocol[]) {
    if (isWindowsOS) {
      this.registerAppOnWindows(protocols);
    } else if (isMac) {
      this.registerAppOnMacOS(protocols);
    }
  }
  /**
   * Unregisters Symphony as  phone calls/SMS app
   */
  public unregisterSymphonyAsDefaultApp(protocols: PhoneNumberProtocol[]) {
    if (isWindowsOS) {
      this.unregisterAppOnWindows(protocols);
    } else if (isMac) {
      this.unregisterAppOnMacOS(protocols);
    }
  }

  /**
   * Registers app on Windows
   */
  private async registerAppOnWindows(protocols: PhoneNumberProtocol[]) {
    const Registry = require('winreg');
    const appPath = isDevEnv
      ? path.join(path.dirname(app.getPath('exe')), 'Electron.exe')
      : path.join(path.dirname(app.getPath('exe')), 'Symphony.exe');
    const applicationCapabilitiesRegKey = new Registry({
      hive: Registry.HKCU,
      key: REGISTRY_PATHS.Capabilities,
    });
    const symURLAssociationRegKey = new Registry({
      hive: Registry.HKCU,
      key: REGISTRY_PATHS.UrlRegistration,
    });
    const symAppRegistrationRegKey = new Registry({
      hive: Registry.HKCU,
      key: REGISTRY_PATHS.RegisteredApps,
    });
    for (const protocol of protocols) {
      const keys = this.getProtocolSpecificKeys(protocol);

      const symCommandRegKey = new Registry({
        hive: Registry.HKCU,
        key: keys.symCommandKey,
      });
      const symDefaultIconRegKey = new Registry({
        hive: Registry.HKCU,
        key: keys.symDefaultIconKey,
      });
      const errorCallback = (error) => {
        if (error) {
          logger.error(
            'voice-handler: error while creating voice registry keys: ',
            error,
          );
        }
      };
      await applicationCapabilitiesRegKey.set(
        'ApplicationName',
        Registry.REG_SZ,
        'Symphony',
        errorCallback,
      );
      await applicationCapabilitiesRegKey.set(
        'ApplicationDescription',
        Registry.REG_SZ,
        'Symphony',
        errorCallback,
      );
      await symURLAssociationRegKey.set(
        protocol,
        Registry.REG_SZ,
        `Symphony.${protocol}`,
        errorCallback,
      );
      await symDefaultIconRegKey.set(
        '',
        Registry.REG_SZ,
        appPath,
        errorCallback,
      );
      await symCommandRegKey.set(
        '',
        Registry.REG_SZ,
        `"${appPath}" "%1"`,
        errorCallback,
      );
      await symAppRegistrationRegKey.set(
        'Symphony',
        Registry.REG_SZ,
        'Software\\Symphony\\Capabilities',
        errorCallback,
      );
    }
  }

  /**
   * Returns Windows call/sms specific registry keys calls/SMS
   */
  private getProtocolSpecificKeys(protocol) {
    const keys = {
      symCommandKey: '',
      symDefaultIconKey: '',
    };
    switch (protocol) {
      case PhoneNumberProtocol.Sms:
        keys.symCommandKey = REGISTRY_PATHS.SymSmsCmd;
        keys.symDefaultIconKey = REGISTRY_PATHS.SymSmsDefaultIcon;
        break;
      case PhoneNumberProtocol.Tel:
        keys.symCommandKey = REGISTRY_PATHS.SymTelCmd;
        keys.symDefaultIconKey = REGISTRY_PATHS.SymTelDefaultIcon;
        break;
      default:
        logger.info('voice-handler: unsupported protocol');
        break;
    }
    return keys;
  }

  /**
   * Unregisters tel / sms protocols on Windows
   */
  private async unregisterAppOnWindows(protocols: PhoneNumberProtocol[]) {
    const Registry = require('winreg');
    const symURLAssociationRegKey = new Registry({
      hive: Registry.HKCU,
      key: REGISTRY_PATHS.UrlRegistration,
    });

    const errorCallback = (error) => {
      if (error) {
        logger.error(
          'voice-handler: error while removing voice registry keys: ',
          error,
        );
      }
    };
    const DestroyErrorCallback = (error) => {
      if (error) {
        logger.error(
          'voice-handler: error while destroying voice registry keys: ',
          error,
        );
      }
    };
    for (const protocol of protocols) {
      await symURLAssociationRegKey.remove(protocol, errorCallback);
      const symprotocolClassRegKey = new Registry({
        hive: Registry.HKCU,
        key: `${REGISTRY_PATHS.Classes}\\Symphony.${protocol}`,
      });
      await symprotocolClassRegKey.destroy(DestroyErrorCallback);
    }
  }

  /**
   * Registers app on macOS
   */
  private registerAppOnMacOS(protocols: PhoneNumberProtocol[]) {
    this.readLaunchServicesPlist((plist) => {
      for (const protocol of protocols) {
        const itemIdx = plist.LSHandlers.findIndex(
          (lsHandler) => lsHandler.LSHandlerURLScheme === protocol,
        );
        // macOS allows only one app being declared as able to make calls
        if (itemIdx !== -1) {
          plist.splice(itemIdx, 1);
        }
        const plistEntry = {
          LSHandlerURLScheme: protocol,
          LSHandlerRoleAll: 'com.symphony.electron-desktop',
          LSHandlerPreferredVersions: {
            LSHandlerRoleAll: '-',
          },
        };
        plist.LSHandlers.push(plistEntry);
      }
      this.updateLaunchServicesPlist(plist);
    });
  }

  /**
   * Unregisters app for tel/sms on macOS
   */
  private unregisterAppOnMacOS(protocols: PhoneNumberProtocol[]) {
    this.readLaunchServicesPlist((plist) => {
      if (plist) {
        const filteredList = plist.LSHandlers.filter(
          (lsHandler) => protocols.indexOf(lsHandler.LSHandlerURLScheme) === -1,
        );
        plist.LSHandlers = filteredList;
        this.updateLaunchServicesPlist(plist);
      }
    });
  }

  /**
   * Reads macOS launch services plist
   * @param callback
   */
  private readLaunchServicesPlist(callback) {
    const plistPath = this.getLaunchServicesPlistPath();
    const tmpPath = `${plistPath}.${Math.random()}`;
    exec(`plutil -convert json "${plistPath}" -o "${tmpPath}"`, (err) => {
      if (err) {
        logger.error(
          'voice-handler: error while converting binary file: ',
          err,
        );
        return;
      }
      fs.readFile(tmpPath, (readErr, data) => {
        if (readErr) {
          logger.error('voice-handler: error while reading tmp file:');
          return;
        }
        try {
          const plistContent = JSON.parse(data.toString());
          callback(plistContent);
          fs.unlink(tmpPath, (err) => {
            if (err) {
              logger.error('voice-handler: error clearing tmp file ', err);
            }
          });
        } catch (e) {
          logger.error('voice-handler: unexpected error occured ', err);
          return;
        }
      });
    });
  }

  /**
   * Updates launch services plist file
   * @param defaults
   */
  private updateLaunchServicesPlist(defaults) {
    const plistPath = this.getLaunchServicesPlistPath();
    const tmpPath = `${plistPath}.${Math.random()}`;
    try {
      fs.writeFileSync(tmpPath, JSON.stringify(defaults));
    } catch (e) {
      logger.error('voice-handler: error while creating tmp plist ', e);
      return;
    }
    exec(`plutil -convert binary1 "${tmpPath}" -o "${plistPath}"`, () => {
      fs.unlink(tmpPath, (err) => {
        if (err) {
          logger.error(`voice-handler: error while clearing ${tmpPath}: `, err);
        }
      });
      // Relaunch Launch Services so it take into consideration updated plist file
      exec(
        `${LS_REGISTER_PATH} -kill -r -domain local -domain system -domain user`,
        (registerErr) => {
          if (registerErr) {
            logger.error(
              'voice-handler: error relaunching Launch Services ',
              registerErr,
            );
          }
        },
      );
    });
  }

  /**
   * Returns Launch services plist filepath
   * @param callback
   */
  private getLaunchServicesPlistPath() {
    const secureLaunchServicesPlist = `${process.env.HOME}/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist`;
    const insecureLaunchServicesPlist = `${process.env.HOME}/Library/Preferences/com.apple.LaunchServices.plist`;

    const secureLaunchServicesPlistExists = fs.existsSync(
      secureLaunchServicesPlist,
    );
    if (secureLaunchServicesPlistExists) {
      return secureLaunchServicesPlist;
    }
    return insecureLaunchServicesPlist;
  }
}

const voiceHandler = new VoiceHandler();

export { voiceHandler };
