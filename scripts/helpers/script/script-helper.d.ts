/**
 * Format current size as Bytes to readable unit accordingly as KB, MB, GB....
 *
 * @param byte @typeDef number - size as bytes
 * @return Return {Converted Number} {Unit} as string
 */
export declare function formatSize(byte: number): string;

/**
 * Convert Bytes to {unit}
 *
 * @param unit @typeDef DataMeasurement - which unit we should convert
 * @param bytes @typeDef number - input bytes to get converted
 *
 * @return Return {Converted Number} based on Unit as number
 */
export declare function bytesTo(unit: string, bytes: number): number;

/**
 * Recursively get total size of bundle
 *
 * @param dir as @string - Path to directory
 *
 * @return total size as number, throw error if dir is invalid
 */
export declare function getTotalSize(dir: string): number;

/**
 * Save build meta data to {currentFolderSnapshotFile}
 *
 * @param data as @object - build meta data
 * @param currentFolderSnapshotFile as @string - place to save the metadata file
 *
 */
export declare function saveMetaData(data: any, dir: string): void;

/**
 * Get general folder and content within sizes
 *
 * @param dir as @string - directory to read
 *
 * @returns stats as size of all files. I.E: {'file-001': 100Mb}
 */
export declare function getFolderSizes(dir: string): void;

declare const _default: {
  formatSize: typeof formatSize;
  bytesTo: typeof bytesTo;
  getTotalSize: typeof getTotalSize;
  saveMetaData: typeof saveMetaData;
  getFolderSizes: typeof getFolderSizes;
};
export default _default;
