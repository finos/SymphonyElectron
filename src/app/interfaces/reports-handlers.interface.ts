export enum Platform {
  IV = 'IV',
}

export enum LogCategory {
  LATEST = 'LATEST',
  RECENT = 'RECENT',
  C9_TRADER = 'c9trader',
  C9_ZUES = 'c9zeus',
  CLIENT = 'client_',
}

export enum LogUtilities {
  ONE_MINUTE = 60000,
  // Timestamp threshold, in minutes
  LOG_TIMESTAMP_THRESHOLD = 30,
}

export type RetrieveIVLogs = () => void;
export type RemoveIVLogs = (logsPath: string) => void;
