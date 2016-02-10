'use strict';

var unzip = require('../unzip');
var fs = require('fs-extra');
var path = require('path');
var expect = require('expect.js');

describe('unzip', () => {
    it('keep permissions', (done) => {
        var dest = path.join(__dirname, '../dev/unzip-dest');
        fs.removeSync(dest);
        var stream = fs.createReadStream(path.join(__dirname, 'resources/zipfile_1.zip'));
        stream.pipe(unzip.stream({dest: dest}));
        stream.on('end', () => {
            var stat = fs.statSync(path.join(dest, 'zipfile_1', 'bar.txt'));
            expect(stat.mode.toString(8)).to.be('100755');
            done();
        });
    });
});

