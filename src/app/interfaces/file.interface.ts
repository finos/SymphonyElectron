export interface IFile {
  fileName: string;
  platform: string;
  modifiedTimestamp: number;
  path?: string;
}

export interface IFileOptions {
  includeOnly?: string[];
  type?: string;
}
