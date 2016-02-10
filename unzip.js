'use strict';
/**
 writing this due to bugs in existing libraries and lack of desire to use grunt task to simply unzip
 **/

var path = require('path');
var fs = require('fs-extra');
var Zip = require('jszip');

exports.unzip = function (input, dest, data) {
    if (!data) {
        data = {};
    }
    return new Promise((resolve, reject) => {
        console.log('reading file');
        // Read in the contents

        var router = data.router;

        // If there is no router
        if (!router) {
            // Grab the cwd and return the relative path as our router
            var cwd = data.cwd || process.cwd();
            var separator = new RegExp(path.sep.replace('\\', '\\\\'), 'g');
            router = function routerFn(filepath) {
                // Join path via /
                // DEV: Files zipped on Windows need to use /  to have the same layout on Linux
                return path.relative(cwd, filepath).replace(separator, '/');
            };
        } else if (data.cwd) {
            // Otherwise, if a `cwd` was specified, throw a fit and leave
            reject('my-unzip does not accept `cwd` and `router` in the same config due to potential ordering complications. Please choose one.');
        }

        var zip = new Zip(input, {checkCRC32: data.checkCRC32});

        // Pluck out the files
        var files = zip.files;
        var filenames = Object.getOwnPropertyNames(files);

        // Iterate over the files
        filenames.forEach(function (filename) {
            // Find the content
            var fileObj = files[filename];
            var content = fileObj.asNodeBuffer();
            var routedName = router(filename);

            // If there is a file path (allows for skipping)
            if (routedName) {
                // Determine the filepath
                var filepath = path.join(dest, routedName);
                console.log('filepath is', fileObj.options.unixPermissions, filepath);

                if (filepath.endsWith('x64/bin/npm')) {
                    console.log('====', filepath, '=====');
                }

                // If the routedName en in a `/`, treat it as a/an (empty) directory
                // DEV: We use `/` over path.sep since it is consistently `/` across all platforms
                if (routedName.slice(-1) === '/') {
                    // console.log('Creating directory: "' + filepath + '"');
                    fs.ensureDirSync(filepath);
                } else {
                    // Create the destination directory
                    var fileDir = path.dirname(filepath);

                    fs.ensureDirSync(fileDir);
                    // console.log('Writing file: "' + filepath);

                    if (!fileObj.dir) {
                        fs.outputFileSync(filepath, content, {mode: fileObj.unixPermissions});
                    }
                }
            }
        });

        resolve();
    });
};

var stream = require('stream');
class UnzipStream extends stream.Writable {

    /**
     *
     * @param {object} _options
     * @param {string} _options.dest
     */
    constructor(options) {
        super();
        this.options = options;
        this.data = [];
    }

    write(buffer) {
        this.data.push(buffer);
    }

    end() {
        var newBuffer = Buffer.concat(this.data);
        exports.unzip(newBuffer, this.options.dest);
        console.log('end');
    }

}

exports.stream = (options) => {
    return new UnzipStream(options);
};

if (require.main === module) {
    var file = process.argv[2];
    var dest = 'dev/unzip-dest';
    fs.removeSync(dest);
    console.log('unzipping', file);
    fs.createReadStream(file).pipe(new UnzipStream({dest: dest}));
}

