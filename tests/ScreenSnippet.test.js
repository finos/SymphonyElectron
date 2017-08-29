const { ScreenSnippet, readResult } = require('../js/screenSnippet');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { isMac } = require('../js/utils/misc.js');

const snippetBase64 = require('./fixtures/snippet/snippet-base64.js');

// mock child_process used in ScreenSnippet
jest.mock('child_process', function() {
    return {
        execFile: mockedExecFile
    }
});

/**
 * mock version of execFile just creates a copy of a test jpeg file.
 */
function mockedExecFile(util, args, doneCallback) {
    let outputFileName = args[args.length - 1];

    copyTestFile(outputFileName, function(copyTestFile) {
        doneCallback();
    });
}

function copyTestFile(destFile, done) {
    const testfile = path.join(__dirname,
        'fixtures/snippet/ScreenSnippet.jpeg');

    let reader = fs.createReadStream(testfile);
    let writer = fs.createWriteStream(destFile);

    writer.on('close', function() {
        done();
    });

    reader.pipe(writer);
}

function createTestFile(done) {
    let tmpDir = os.tmpdir();
    const testFileName = path.join(tmpDir,
        'ScreenSnippet-' + Date.now() + '.jpeg');

    copyTestFile(testFileName, function() {
        done(testFileName)
    });
}



describe('Tests for ScreenSnippet', function() {
    describe('when reading a valid jpeg file', function() {

        // skip test for windows - until feature is supported
        if (isMac) {
            it('should match base64 output', function(done) {
                let s = new ScreenSnippet();
                s.capture().then(gotImage);

                function gotImage(rsp) {
                    expect(rsp.type).toEqual('image/jpg;base64');
                    expect(rsp.data).toEqual(snippetBase64);
                    done();
                }
            });
        }

        it('should remove output file after completed', function(done) {
            createTestFile(function(testfileName) {
                readResult(testfileName, resolve);

                function resolve() {
                    // should be long enough before file
                    // gets removed
                    setTimeout(function() {
                        let exists = fs.existsSync(testfileName);
                        expect(exists).toBe(false);
                        done();
                    }, 2000);
                }
            });
        });
    });

    it('should fail if output file does not exist', function(done) {
        let nonExistentFile = 'bogus.jpeg';
        readResult(nonExistentFile, resolve, reject);

        function resolve() {
            // shouldn't get here
            expect(true).toBe(false);
        }

        function reject(err) {
            expect(err).toBeTruthy();
            done();
        }
    });

    // skip test for windows - until feature is supported
    if (isMac) {
        it('should fail if read file fails', function(done) {
            const origFsReadFile = fs.readFile;

            fs.readFile = jest.fn(mockedReadFile);

            function mockedReadFile(filename, callback) {
                callback(new Error('failed'));
            }

            let s = new ScreenSnippet();
            s.capture().then(resolved).catch(rejected);

            function resolved(err) {
                cleanup();
                // shouldn't get here
                expect(true).toBe(false);
            }

            function rejected(err) {
                expect(err).toBeTruthy();
                cleanup();
                done();
            }

            function cleanup() {
                fs.readFile = origFsReadFile;
            }
        });
    }
});