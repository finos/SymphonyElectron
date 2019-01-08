const gulp = require('gulp');
const less = require('gulp-less');
const sourcemaps = require('gulp-sourcemaps');
const tsc = require('gulp-tsc');
const del = require('del');
const path = require('path');

// TODO: Add gulp watch tasks

gulp.task('clean', function() {
    return del('lib');
});

gulp.task('compile', function() {
    return gulp.src(['src/**/*.ts'])
        .pipe(tsc({ project: './tsconfig.json' }))
        .pipe(gulp.dest('lib/'))
});

gulp.task('less', function () {
    return gulp.src('./src/**/*.less')
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(path.join(__dirname, 'lib/src')));
});

gulp.task('copy', function () {
    return gulp.src([
        './src/renderer/assets/*',
        './src/renderer/*.html',
        './src/locale/*'
    ], {
        "base": "./src"
    }).pipe(gulp.dest('lib/src'))
});

gulp.task('build', gulp.series('clean', 'compile', 'less', 'copy'));