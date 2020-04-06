const fs = require('fs');
const gulp = require('gulp');
const less = require('gulp-less');
const sourcemaps = require('gulp-sourcemaps');
const tsc = require('gulp-typescript');
const del = require('del');
const path = require('path');

const tsProject = tsc.createProject('./tsconfig.json');

gulp.task('clean', function() {
    return del('lib');
});

/**
 * Compile all typescript files
 * and copy to the destination
 */
gulp.task('compile', function() {
    return tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .pipe(sourcemaps.write('.'))
        .on('error', (err) => console.log(err))
        .pipe(gulp.dest('lib/'))
});

gulp.task('less', function () {
    return gulp.src('./src/**/*.less')
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(path.join(__dirname, 'lib/src')));
});

/**
 * Copy all assets to JS codebase
 */
gulp.task('copy', function () {
    return gulp.src([
        './src/renderer/assets/*',
        './src/renderer/*.html',
        './src/locale/*',
        './package.json'
    ], {
        "base": "./src"
    }).pipe(gulp.dest('lib/src'))
});

/**
 * Set expiry time for test builds
 */
gulp.task('setExpiry', function (done) {
    // Set expiry of 15 days for test builds we create from CI
    const expiryDays = process.argv[4] || 15;
    if (expiryDays < 1) {
        console.log(`Not setting expiry as the value provided is ${expiryDays}`);
        done();
        return;
    }

    console.log(`Setting expiry to ${expiryDays} days`);
    const milliseconds = 24*60*60*1000;
    const expiryTime = new Date().getTime() + (expiryDays * milliseconds);
    console.log(`Setting expiry time to ${expiryTime}`);

    const ttlHandlerFile = path.join(__dirname, 'src/app/ttl-handler.ts');
    fs.readFile(ttlHandlerFile, 'utf8', function (err,data) {
        if (err) {
            console.error(err);
            return done(err);
        }

        // Do a simple search and replace in the `ttl-handler.ts` file
        const replacementString = `const ttlExpiryTime = ${expiryTime}`;
        const result = data.replace(/const ttlExpiryTime = -1/g, replacementString);

        fs.writeFile(ttlHandlerFile, result, 'utf8', function (err) {
            if (err) {
                return done(err);
            }
            done();
        });
    });
});

gulp.task('build', gulp.series('clean', 'compile', 'less', 'copy'));
