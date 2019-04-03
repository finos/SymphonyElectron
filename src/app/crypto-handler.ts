import { app } from 'electron';
import { Library } from 'ffi-napi';
import * as path from 'path';
import { refType, types } from 'ref-napi';

const execPath = path.dirname(app.getPath('exe'));
import { isDevEnv, isMac } from '../common/env';
import { logger } from '../common/logger';

const TAG_LENGTH = 16;
const arch = process.arch === 'ia32';
const winLibraryPath = isDevEnv ? path.join(__dirname, '..', '..', 'library') : path.join(execPath, 'library');
const macLibraryPath = isDevEnv ? path.join(__dirname, '..', '..', '..', 'library') : path.join(execPath, '..', 'library');

const cryptoLibPath = isMac ?
    path.join(macLibraryPath, 'cryptoLib.dylib') :
    (arch ? path.join(winLibraryPath, 'libsymphonysearch-x86.dll') : path.join(winLibraryPath, 'libsymphonysearch-x64.dll'));

const library = new Library((cryptoLibPath), {
    AESEncryptGCM: [types.int32, [
        refType(types.uchar),
        types.int32,
        refType(types.uchar),
        types.int32,
        refType(types.uchar),
        refType(types.uchar),
        types.uint32,
        refType(types.uchar),
        refType(types.uchar),
        types.uint32,
    ]],

    AESDecryptGCM: [types.int32, [
        refType(types.uchar),
        types.int32,
        refType(types.uchar),
        types.int32,
        refType(types.uchar),
        types.uint32,
        refType(types.uchar),
        refType(types.uchar),
        types.uint32,
        refType(types.uchar),
    ]],

    getVersion: [types.CString, []],
});

interface ICryptoLib {
    AESGCMEncrypt: (name: string, base64IV: string, base64AAD: string, base64Key: string, base64In: string) => string | null;
    AESGCMDecrypt: (base64IV: string, base64AAD: string, base64Key: string, base64In: string) => string | null;
}

class CryptoLibrary implements ICryptoLib {

    /**
     * Encrypt / Decrypt
     *
     * @param name {string} Method name to execute
     * @param base64IV {string}
     * @param base64AAD {string}
     * @param base64Key {string}
     * @param base64In {string}
     * @constructor
     */
    public static EncryptDecrypt(name: string, base64IV: string, base64AAD: string, base64Key: string, base64In: string): string | null {
        let base64Input = base64In;

        if (!base64Input) {
            base64Input = '';
        }

        const IV: Buffer = Buffer.from(base64IV, 'base64');
        const AAD: Buffer = Buffer.from(base64AAD, 'base64');
        const KEY: Buffer = Buffer.from(base64Key, 'base64');
        const IN: Buffer = Buffer.from(base64Input, 'base64');

        if (name === 'AESGCMEncrypt') {
            const outPtr: Buffer = Buffer.alloc(IN.length);
            const TAG: Buffer = Buffer.alloc(TAG_LENGTH);

            const resultCode = library.AESEncryptGCM(IN, IN.length, AAD, AAD.length, KEY, IV, IV.length, outPtr, TAG, TAG_LENGTH);

            if (resultCode < 0) {
                logger.error(`AESEncryptGCM, Failed to encrypt with exit code ${resultCode}`);
            }
            const bufferArray = [outPtr, TAG];
            return Buffer.concat(bufferArray).toString('base64');
        }

        if (name === 'AESGCMDecrypt') {
            const cipherTextLen = IN.length - TAG_LENGTH;
            const TAG = Buffer.from(IN.slice(IN.length - 16, IN.length));
            const outPtr = Buffer.alloc(IN.length - TAG_LENGTH);

            const resultCode = library.AESDecryptGCM(IN, cipherTextLen, AAD, AAD.length, TAG, TAG_LENGTH, KEY, IV, IV.length, outPtr);

            if (resultCode < 0) {
                logger.error(`AESDecryptGCM, Failed to decrypt with exit code ${resultCode}`);
            }
            return outPtr.toString('base64');
        }

        return null;
    }

    /**
     * Encrypts the given data
     *
     * @param base64IV {string}
     * @param base64AAD {string}
     * @param base64Key {string}
     * @param base64In {string}
     * @constructor
     */
    public AESGCMEncrypt(base64IV: string, base64AAD: string, base64Key: string, base64In: string): string | null {
        return CryptoLibrary.EncryptDecrypt('AESGCMEncrypt', base64IV, base64AAD, base64Key, base64In);
    }

    /**
     * Decrypts the give data
     *
     * @param base64IV {string}
     * @param base64AAD {string}
     * @param base64Key {string}
     * @param base64In {string}
     * @constructor
     */
    public AESGCMDecrypt(base64IV: string, base64AAD: string, base64Key: string, base64In: string): string | null {
        return CryptoLibrary.EncryptDecrypt('AESGCMDecrypt', base64IV, base64AAD, base64Key, base64In);
    }
}

const cryptoLibrary = new CryptoLibrary();

export { cryptoLibrary };
