/**
 * AES GCM Stream
 * This module exports encrypt and decrypt stream constructors which can be
 * used to protect data with authenticated encryption.
 */
'use strict';

let stream = require('stream');
let Transform = stream.Transform;
let util = require('util');
let crypto = require('crypto');

let KEY_LENGTH = 32; // bytes
let GCM_NONCE_LENGTH = 12; //bytes
let GCM_MAC_LENGTH = 16; //bytes

let keyEncoding = 'base64';

/**
 * Private helper method to validate a key passed into the Encrypt and Decrypt streams.
 * Strings are converted it into a buffer, buffers are returned as they are.
 * @param key
 * @throws Missing, Encoding, or Length errors
 * @returns Buffer
 */
let validateAndConvertKey = function(key) {
    if (key && key instanceof Buffer && key.length === KEY_LENGTH) {
        return key;
    } else if (key && typeof key === 'string') {
        let bufKey = new Buffer(key, keyEncoding);
        if (bufKey.length !== KEY_LENGTH) {
            let encodingErrorMessage = 'Provided key string is either of an unknown encoding (expected: ' +
                keyEncoding + ') or the wrong length.';
            throw new Error(encodingErrorMessage);
        }
        return bufKey;
    }
    let message = 'The key options property is required! Expected ' +
        keyEncoding + ' encoded string or a buffer.';
    throw new Error(message);
};

exports.encrypt = EncryptionStream;
exports.decrypt = DecryptionStream;

/**
 * createSalt
 * Helper method that returns a salt
 * @returns string
 * @throws error
 */
exports.createSalt = function(length) {
    try {
        return crypto.randomBytes(length);
    } catch (ex) {
        throw ex;
    }
};

/**
 * EncryptionStream
 * A constructor which returns an encryption stream
 * The stream first outputs a 12 byte nonce then encrypted cipher text.
 * When the stream is flushed it outputs a 16 byte MAC.
 * @param options Object Object.key is the only required param
 * @returns {EncryptionStream}
 * @constructor
 */
function EncryptionStream(options) {
    if (!(this instanceof EncryptionStream)) {
        return new EncryptionStream(options);
    }

    let nonce = options.nonce || exports.createSalt(12);

    this._key = validateAndConvertKey(options.key);
    this._cipher = crypto.createCipheriv('aes-256-gcm', this._key, nonce);

    Transform.call(this, options);
    this.push(nonce);
}
util.inherits(EncryptionStream, Transform);

EncryptionStream.prototype._transform = function(chunk, enc, cb) {
    this.push(this._cipher.update(chunk));
    cb();
};

EncryptionStream.prototype._flush = function(cb) {
    // final must be called on the cipher before generating a MAC
    this._cipher.final(); // this will never output data
    this.push(this._cipher.getAuthTag()); // 16 bytes

    cb();
};

/**
 * DecryptionStream
 * A constructor which returns a decryption stream
 * The stream assumes the first 12 bytes of data are the nonce and the final
 * 16 bytes received is the MAC.
 * @param options Object Object.key is the only required param
 * @returns {DecryptionStream}
 * @constructor
 */
function DecryptionStream(options) {
    if (!(this instanceof DecryptionStream)) {
        return new DecryptionStream(options);
    }

    this._started = false;
    this._nonce = new Buffer(GCM_NONCE_LENGTH);
    this._nonceBytesRead = 0;
    this._cipherTextChunks = [];
    this._key = validateAndConvertKey(options.key);

    Transform.call(this, options);
}
util.inherits(DecryptionStream, Transform);

DecryptionStream.prototype._transform = function(chunk, enc, cb) {
    let chunkLength = chunk.length;
    let chunkOffset = 0;
    let _chunk = chunk;
    if (!this._started) {
        if (this._nonceBytesRead < GCM_NONCE_LENGTH) {
            let nonceRemaining = GCM_NONCE_LENGTH - this._nonceBytesRead;
            chunkOffset = chunkLength <= nonceRemaining ? chunkLength : nonceRemaining;
            _chunk.copy(this._nonce, this._nonceBytesRead, 0, chunkOffset);
            _chunk = _chunk.slice(chunkOffset);
            chunkLength = _chunk.length;
            this._nonceBytesRead += chunkOffset;
        }


        if (this._nonceBytesRead === GCM_NONCE_LENGTH) {
            this._decipher = crypto.createDecipheriv('aes-256-gcm', this._key, this._nonce);
            this._started = true;
        }
    }

    // We can't use an else because we have no idea how long our chunks will be
    // all we know is that once we've got a nonce we can start storing cipher text
    if (this._started) {
        this._cipherTextChunks.push(_chunk);
    }

    cb();
};

DecryptionStream.prototype._flush = function(cb) {
    let mac = pullOutMac(this._cipherTextChunks);
    if (!mac) {
        return this.emit('error', new Error('Decryption failed: bad cipher text.'));
    }
    this._decipher.setAuthTag(mac);
    let decrypted = this._cipherTextChunks.map(function(item) {
        return this._decipher.update(item);
    }, this);
    try {
        this._decipher.final();
    } catch (e) {
        return cb();
    }
    decrypted.forEach(function(item) {
        this.push(item);
    }, this);
    return cb();
};

function pullOutMac(array) {
    let macBits = [];
    let macByteCount = 0;
    let current, macStartIndex;
    while (macByteCount !== GCM_MAC_LENGTH && array.length) {
        current = array.pop();
        if (macByteCount + current.length <= GCM_MAC_LENGTH) {
            macBits.push(current);
            macByteCount += current.length;
        } else {
            macStartIndex = (macByteCount + current.length) - GCM_MAC_LENGTH;
            macBits.push(current.slice(macStartIndex));
            array.push(current.slice(0, macStartIndex));
            macByteCount += (current.length - macStartIndex);
        }
    }
    if (macByteCount !== GCM_MAC_LENGTH) {
        return null;
    }
    macBits.reverse();
    return Buffer.concat(macBits, GCM_MAC_LENGTH);
}