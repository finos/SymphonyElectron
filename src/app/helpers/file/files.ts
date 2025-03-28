import { IFile, IFiles } from '../../interfaces/file-helper.interface';

export class Files implements IFiles {
  private files = new Map<string, IFile>();

  constructor(private _files?: Map<string, IFile>) {
    this.set(this._files ?? this.files);
  }

  public get = () => {
    return this.files;
  };

  public set = (files: Map<string, IFile>) => {
    this.files = files;
  };
}
