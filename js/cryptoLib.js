const electron = require('electron');
const app = electron.app;
const ffi = require('ffi');
const ref = require('ref');
const path = require('path');
const execPath = path.dirname(app.getPath('exe'));

const log = require('./log.js');
const logLevels = require('./enums/logLevels.js');
const { isMac, isDevEnv } = require('../js/utils/misc');

const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const arch = process.arch === 'ia32';
const winLibraryPath = isDevEnv ? path.join(__dirname, '..', 'library') : path.join(execPath, 'library');
const macLibraryPath = isDevEnv ? path.join(__dirname, '..', 'library') : path.join(execPath, '..', 'library');

const cryptoLibPath = isMac ?
    path.join(macLibraryPath, 'cryptoLib.dylib') :
    (arch ? path.join(winLibraryPath, 'libsymphonysearch-x86.dll') : path.join(winLibraryPath, 'libsymphonysearch-x64.dll'));

const voidPtr = ref.refType(ref.types.void);
const RSAKeyPair = exports.RSAKeyPair = voidPtr;
const RSAKeyPairPtr = exports.RSAKeyPairPtr = ref.refType(RSAKeyPair);
const RSAPubKey = exports.RSAPubKey = voidPtr;
const RSAPubKeyPtr = exports.RSAPubKeyPtr = ref.refType(RSAPubKey);

const library = new ffi.Library((cryptoLibPath), {

    AESEncryptGCM: [ref.types.int32, [
        ref.refType(ref.types.uchar),
        ref.types.int32,
        ref.refType(ref.types.uchar),
        ref.types.int32,
        ref.refType(ref.types.uchar),
        ref.refType(ref.types.uchar),
        ref.types.uint32,
        ref.refType(ref.types.uchar),
        ref.refType(ref.types.uchar),
        ref.types.uint32,
    ]],

    AESDecryptGCM: [ref.types.int32, [
        ref.refType(ref.types.uchar),
        ref.types.int32,
        ref.refType(ref.types.uchar),
        ref.types.int32,
        ref.refType(ref.types.uchar),
        ref.types.uint32,
        ref.refType(ref.types.uchar),
        ref.refType(ref.types.uchar),
        ref.types.uint32,
        ref.refType(ref.types.uchar),
    ]],

    encryptRSA: [ref.types.uint32, [
        RSAPubKeyPtr,
        ref.types.int32,
        ref.refType(ref.types.uchar),
        ref.types.uint32,
        ref.refType(ref.types.uchar),
        ref.types.uint32,
    ]],

    decryptRSA: [ref.types.uint32, [
        RSAPubKeyPtr,
        ref.types.int32,
        ref.refType(ref.types.uchar),
        ref.types.uint32,
        ref.refType(ref.types.uchar),
        ref.types.uint32,
    ]],

    deserializeRSAPubKey: [RSAPubKey, [
        ref.refType(ref.types.uchar),
        ref.types.uint32,
    ]],
    deserializeRSAKeyPair: [RSAKeyPairPtr, [
        ref.refType(ref.types.uchar),
        ref.types.uint32,
    ]],

    getRSAKeySize: [ref.types.uint32, [
        RSAKeyPairPtr
    ]],

    getVersion: [ref.types.CString, []],
});

/**
 * Method to decrypt content
 * @param Base64IV
 * @param Base64AAD
 * @param Base64Key
 * @param Base64In
 * @return {*}
 * @constructor
 */
const AESGCMEncrypt = function(Base64IV, Base64AAD, Base64Key, Base64In) {
    return EncryptDecrypt('AESGCMEncrypt', Base64IV, Base64AAD, Base64Key, Base64In);
};

/**
 * Method to decrypt content
 * @param Base64IV
 * @param Base64AAD
 * @param Base64Key
 * @param Base64In
 * @return {*}
 * @constructor
 */
const AESGCMDecrypt = function(Base64IV, Base64AAD, Base64Key, Base64In) {
    return EncryptDecrypt('AESGCMDecrypt', Base64IV, Base64AAD, Base64Key, Base64In);
};

/**
 * Encrypt / Decrypt
 * @param name {String} - Method name
 * @param Base64IV {String} base64
 * @param Base64AAD {String} base64
 * @param Base64Key {String} base64
 * @param Base64In {String} base64
 * @return {*}
 * @constructor
 */
const EncryptDecrypt = function(name, Base64IV, Base64AAD, Base64Key, Base64In) {
    let base64In = Base64In;

    if (!base64In) {
        base64In = "";
    }

    const IV = Buffer.from(Base64IV, 'base64');
    const AAD = Buffer.from(Base64AAD, 'base64');
    const Key = Buffer.from(Base64Key, 'base64');
    const In = Buffer.from(base64In, 'base64');

    if (name === 'AESGCMEncrypt') {
        const OutPtr = Buffer.alloc(In.length);
        const Tag = Buffer.alloc(TAG_LENGTH);

        const resultCode = library.AESEncryptGCM(In, In.length, AAD, AAD.length, Key, IV, IV.length, OutPtr, Tag, TAG_LENGTH);

        if (resultCode < 0) {
            log.send(logLevels.ERROR, `AESEncryptGCM, Failed to encrypt with exit code ${resultCode}`);
        }
        log.send(logLevels.INFO, `Output from AESEncryptGCM ${resultCode}`);
        const bufferArray = [OutPtr, Tag];
        return Buffer.concat(bufferArray).toString('base64');
    }

    if (name === 'AESGCMDecrypt') {
        const CipherTextLen = In.length - TAG_LENGTH;
        const Tag = Buffer.from(In.slice(In.length - 16, In.length));
        const OutPtr = Buffer.alloc(In.length - TAG_LENGTH);

        const resultCode = library.AESDecryptGCM(In, CipherTextLen, AAD, AAD.length, Tag, TAG_LENGTH, Key, IV, IV.length, OutPtr);

        if (resultCode < 0) {
            log.send(logLevels.ERROR, `AESDecryptGCM, Failed to decrypt with exit code ${resultCode}`);
        }
        log.send(logLevels.INFO, `Output from AESDecryptGCM ${resultCode}`);
        return OutPtr.toString('base64');
    }

    return null;
};

/**
 * Decrypt RSA
 * @param pemKey
 * @param input
 * @return {*}
 * @constructor
 */
const RSADecrypt = function (pemKey, input) {
    return RSAEncryptDecrypt("RSADecrypt", pemKey, input);
};

/**
 * Encrypt / Decrypt RSA
 * @param action
 * @param pemKey
 * @param inputStr
 * @return {String}
 * @constructor
 */
const RSAEncryptDecrypt = function (action, pemKey, inputStr) {

    let rsaKey = getRSAKeyFromPEM(pemKey);

    if (!rsaKey) {
        log.send(logLevels.ERROR, `Failed to parse formatted RSA PEM key`);
    }

    let input = Buffer.from(inputStr, 'base64');
    let outLen = library.getRSAKeySize(rsaKey);

    let outPtr = Buffer.alloc(KEY_LENGTH);

    let ret = 0;

    if (action === 'RSAEncrypt') {
        ret = library.encryptRSA(rsaKey, 0, input, input.length, outPtr, outLen);
    } else {
        outLen = library.decryptRSA(rsaKey, 0, input, input.length, outPtr, outLen);

        if (outLen < 0) {
            ret = outLen;
        }
    }

    if (ret !== 0) {
        log.send(logLevels.ERROR, `${action} failed due to -> ${ret}`);
    }
    return Buffer.from(outPtr.toString('hex'), 'hex').toString('base64');
};

/**
 * Get RSA key from PEM key
 * @param pemKey
 * @return {*}
 */
const getRSAKeyFromPEM = function (pemKey) {

    let pemKeyBytes = Buffer.from(pemKey, 'utf-8');

    let rsaKey;

    if (pemKey.startsWith("-----BEGIN PUBLIC KEY-----")) {
        rsaKey = library.deserializeRSAPubKey(pemKeyBytes, pemKey.length);
    } else {
        rsaKey = library.deserializeRSAKeyPair(pemKeyBytes, pemKey.length);
    }

    if (rsaKey === 0) {
        log.send(logLevels.ERROR, 'RSAKey is 0!!');
    }
    return rsaKey;
};


module.exports = {
    AESGCMEncrypt: AESGCMEncrypt,
    AESGCMDecrypt: AESGCMDecrypt,
    RSADecrypt: RSADecrypt,
};
