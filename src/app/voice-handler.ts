import { app } from 'electron';
import * as path from 'path';
import { PhoneNumberProtocol } from '../common/api-interface';
import { isDevEnv, isMac, isWindowsOS } from '../common/env';
import { logger } from '../common/logger';

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

      const protocolClassRegKey = new Registry({
        hive: Registry.HKCU,
        key: `${REGISTRY_PATHS.Classes}\\${protocol}`,
      });
      await protocolClassRegKey.set(
        '',
        Registry.REG_SZ,
        `URL:${protocol}`,
        errorCallback,
      );

      await protocolClassRegKey.set(
        'URL Protocol',
        Registry.REG_SZ,
        '',
        errorCallback,
      );

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
    const allowedProtocols = [PhoneNumberProtocol.Sms, PhoneNumberProtocol.Tel];
    for (const protocol of protocols) {
      const idx = allowedProtocols.indexOf(protocol);
      if (idx > -1) {
        app.setAsDefaultProtocolClient(protocol);
        allowedProtocols.splice(idx, 1);
      }
    }
    if (allowedProtocols.length) {
      for (const unsupportedProtocol of allowedProtocols) {
        app.removeAsDefaultProtocolClient(unsupportedProtocol);
      }
    }
  }

  /**
   * Unregisters app for tel/sms on macOS
   */
  private unregisterAppOnMacOS(protocols: PhoneNumberProtocol[]) {
    for (const protocol of protocols) {
      app.removeAsDefaultProtocolClient(protocol);
    }
  }
}

const voiceHandler = new VoiceHandler();

export { voiceHandler };
