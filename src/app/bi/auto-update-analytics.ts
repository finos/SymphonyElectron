import { app } from 'electron';
import { isMac, isWindowsOS } from '../../common/env';
import { analytics } from './analytics-handler';
import {
  AnalyticsElements,
  IInstallData,
  InstallActionTypes,
  InstallLocationTypes,
  InstallTypes,
} from './interface';

/**
 * Sends auto update analytics event
 * @param action
 * @param installType
 */
export const sendAutoUpdateAnalytics = (
  action: InstallActionTypes,
  installType: InstallTypes,
) => {
  const installLocation = getInstallLocation();
  const event: IInstallData = {
    element: AnalyticsElements.SDA_INSTALL,
    action_type: action,
    extra_data: {
      installLocation,
      installType,
    },
  };
  analytics.track(event);
  if (action === InstallActionTypes.InstallStarted) {
    analytics.writeAnalyticFile();
  }
};

/**
 * Identifies and returns the installation location
 */
const getInstallLocation = () => {
  const appPath = app.getPath('exe');
  if (isWindowsOS) {
    if (appPath.includes('AppData\\Local\\Programs')) {
      return InstallLocationTypes.LOCAL;
    }
    if (appPath.includes('Program Files')) {
      return InstallLocationTypes.PROG_FILES;
    }
    return InstallLocationTypes.CUSTOM;
  }
  if (isMac) {
    if (appPath.includes('/Applications')) {
      return InstallLocationTypes.PROG_FILES;
    }
    return InstallLocationTypes.LOCAL;
  }

  return InstallLocationTypes.PROG_FILES;
};
