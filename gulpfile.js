/* gulp serve = browser-sync task*/
var gulp = require('gulp'),
    sass = require('gulp-sass'),
    fs = require('fs'),
    browserSync = require('browser-sync'),
    autoprefixer = require('gulp-autoprefixer'),
    uglify = require('gulp-uglify'),
    jshint = require('gulp-jshint'),
    header = require('gulp-header'),
    rename = require('gulp-rename');


var banner = [
    '/*!\n' +
    ' * <%= pkg.name %>\n' +
    ' * <%= pkg.title %>\n' +
    ' * <%= pkg.url %>\n' +
    ' * @author <%= pkg.author %>\n' +
    ' * @version <%= pkg.version %>\n' +
    ' * Copyright ' + new Date().getFullYear() + '. <%= pkg.license %> licensed.\n' +
    ' */',
    '\n'
].join('');

// Load all gulp plugins automatically
// and attach them to the `plugins` object
var plugins = require('gulp-load-plugins')();
var pkg = require('./package.json');
var dirs = pkg['h5bp-configs'].directories;


// ---------------------------------------------------------------------
// | Main tasks                                                        |
// ---------------------------------------------------------------------

var input = 'app/scss/main.scss';
var output = 'dist/css';


gulp.task('css', function(){
    return gulp.src(input)
    //run sass on these files
        .pipe(sass({errLogToConsole: true}))
        .pipe(autoprefixer('last 4 version'))
        .pipe(gulp.dest(output))
        .pipe(rename({suffix: '.min'}))
        .pipe(header(banner, {pkg: pkg}))
        .pipe(gulp.dest(output))
        .pipe(browserSync.reload({stream:true}));
});

gulp.task('js', function(){
    gulp.src('app/app.js')
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('default'))
        .pipe(header(banner, { pkg : pkg }))
        .pipe(gulp.dest('dist/js'))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min'}))
        .pipe(gulp.dest('dist/js'))
        .pipe(browserSync.reload({ stream:true, once:true }));
});

gulp.task('browser-sync',function(){
    'use strict';
    browserSync.init(null, {
       server: {
           baseDir: 'dist'
       }
    });
});

gulp.task('bs-reload', function () {
    'use strict';
    browserSync.reload();
});

gulp.task('default', ['css','js','browser-sync'], function (done) {
    gulp.watch('app/scss/*.scss', ['css']);
    gulp.watch('app/js/*.js', ['js']);
    gulp.watch('dist/*.html', ['bs-reload']);
});
