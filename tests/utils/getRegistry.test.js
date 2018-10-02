const getRegistry = require('../../js/utils/getRegistry.js');

const { isMac } = require('../../js/utils/misc.js');

describe('Tests for getRegistry', function() {

    describe('Should not get registry for mac', function() {

        if (isMac){

            it('should fail to get path for mac', function(done) {

                getRegistry('PodUrl').then(resolve).catch(reject);

                function resolve() {
                    // shouldn't get here
                    expect(true).toBe(false);
                }

                function reject(err) {
                    expect(err).toBeTruthy();
                    done();
                }
            });

        }

    });

    describe('Should get registry for windows', function() {

        if (!isMac){

            it('should get registry path', function(done) {

                getRegistry('PodUrl').then(resolve).catch(reject);

                function resolve(url) {
                    expect(url).toBe('string');
                    done();
                }

                function reject(err) {
                    expect(err).toBeTruthy();
                    done();
                }

            });

            it('should not get the registry path', function(done) {

                getRegistry('wrongUrl').then(resolve).catch(reject);

                function resolve() {
                    expect(true).toBe(false)
                }

                function reject(err) {
                    expect(err).toBeTruthy();
                    expect(err.message).toBe('Cannot find PodUrl Registry. Using default url.');
                    done();
                }

            });

        }

    });

});