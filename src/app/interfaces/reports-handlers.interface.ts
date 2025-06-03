export enum Platform {
  IV = 'IV',
}

export enum LogCategory {
  LATEST = 'LATEST',
  RECENT = 'RECENT',
  C9_TRADER = 'c9trader',
  C9_ZUES = 'c9zeus',
}

export enum LogUtilities {
  ONE_MINUTE = 60000,
  LOG_TIMESTAMP_THRESH_HOLD = 31,
}

export type RetrieveIVLogs = (logsPath: string) => void;
export type RemoveIVLogs = (logsPath: string) => void;
