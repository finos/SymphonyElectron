export interface IFile {
  fileName: string;
  platform: string;
  modifiedTimestamp: number;
}

export interface IFileOptions {
  includeOnly?: string[];
  type?: string;
}

export interface IFiles {
  get: () => Map<string, IFile>;
  set: (files: Map<string, IFile>) => void;
}
