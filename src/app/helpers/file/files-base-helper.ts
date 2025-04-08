import { IFile, IFileOptions } from '../../interfaces/file-helper.interface';
import { Files } from './files';

export type GetLatestModifiedFiles = (
  folderPath: string,
  options?: IFileOptions,
) => Map<string, IFile>;

export abstract class FileHelperBase {
  public abstract getLatestModifiedFiles: GetLatestModifiedFiles;

  public createFiles = () => {
    return new Files();
  };
}
