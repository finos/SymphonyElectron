import { Files } from './files';

export class FilesFactory {
  /**
   * Generating a new instance of Files
   *
   * @return new instance of Files
   */
  public static create() {
    return new Files();
  }
}
