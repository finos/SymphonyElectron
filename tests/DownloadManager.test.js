const downloadManager = require('../js/downloadManager');
const electron = require('./__mocks__/electron');

describe('download manager', function() {
    describe('Download Manager to create DOM once download is initiated', function() {
        beforeEach(function() {
            global.document.body.innerHTML =
                '<div id="download-main">' +
                '</div>';
        });

        it('should inject download bar element into DOM once download is initiated', function() {
            electron.ipcRenderer.send('downloadCompleted', { _id: '12345', fileName: 'test', total: 100 });
            expect(document.getElementsByClassName('text-cutoff')[0].innerHTML).toBe('test');
            expect(document.getElementById('per').innerHTML).toBe('100 Downloaded');
        });

        it('should inject multiple download items during multiple downloads', function() {
            electron.ipcRenderer.send('downloadCompleted', { _id: '12345', fileName: 'test', total: 100 });
            electron.ipcRenderer.send('downloadCompleted', { _id: '67890', fileName: 'test1', total: 200 });

            let fileNames = document.getElementsByClassName('text-cutoff');
            expect(fileNames[0].innerHTML).toBe('test1');
            expect(fileNames[1].innerHTML).toBe('test');
            expect(document.getElementById('per').innerHTML).toBe('100 Downloaded');

            let downloadElements = document.getElementsByClassName('download-element');
            expect(downloadElements[0].id).toBe('67890');
            expect(downloadElements[1].id).toBe('12345');
        });

    });

    describe('Download Manager to initiate footer', function() {
        beforeEach(function() {
            global.document.body.innerHTML =
                '<div id="footer" class="hidden">' +
                '<div id="download-manager-footer">' +
                '<div id="download-main">' +
                '</div>' +
                '</div>' +
                '</div>';
        });

        it('should inject dom element once download is completed', function() {
            electron.ipcRenderer.send('downloadProgress');
            expect(document.getElementById('footer').classList).not.toContain('hidden');
        });

        it('should remove the download bar and clear up the download items', function() {

            electron.ipcRenderer.send('downloadProgress');
            expect(document.getElementById('footer').classList).not.toContain('hidden');

            document.getElementById('close-download-bar').click();
            expect(document.getElementById('footer').classList).toContain('hidden');

        });

    });

    describe('Download Manager to initiate footer', function() {

        beforeEach(function() {
            global.document.body.innerHTML =
                '<div id="footer" class="hidden">' +
                '<div id="download-manager-footer">' +
                '<div id="download-main">' +
                '</div>' +
                '</div>' +
                '</div>';
        });

        it('should inject ul element if not found', function() {

            electron.ipcRenderer.send('downloadProgress');

            expect(document.getElementById('download-main')).not.toBeNull();
            expect(document.getElementById('footer').classList).not.toContain('hidden');

        });

    });

});