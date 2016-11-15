var gulp = require('gulp'),
    watch = require('gulp-watch'),
    batch = require('gulp-batch');

// folders or files of bower packages we need in the repo
var dependencies = [
    'specimen-tools/build',
    'specimen-tools/lib',
    'rangeslider.js/dist',
    'jquery-selectric/public/jquery.selectric.js',
    'jquery-form-validator/form-validator/jquery.form-validator.js',
    'jquery-form-validator/form-validator/file.js',
    'jquery-fontsampler/dist',
    'requirejs',
    'requirejs-text',
    'opentype.js/dist/opentype.js',
    'Atem-CPS-whitelisting/lib',
    'Atem-Errors/lib',
    'Atem-Math-Tools/lib',
    'Atem-Pen-Case/lib'
];

// this is a bit excessively called also when other bower packages update as well
gulp.task('watch', function () {
    watch(['gulpfile.js', 'bower_components/**/*'], batch(function (events, done) {
        gulp.start('libs', done);
    }));
});

// simply copy any javascript files we need in production for
// require etc to the libs folder
gulp.task('libs', function() {
    // place code for your default task here
    for (var i = 0; i < dependencies.length; i++) {
        var d = dependencies[i],
            path = d.split('/'),
            src = './bower_components/' + d,
            dst = './js/libs/' + d;

        if (path[path.length - 1].indexOf('.js') === -1) {
            src += '/**/*';
        } else {
            dst = dst.substring(0, dst.lastIndexOf('/'));
        }
        gulp.src(src).pipe(gulp.dest(dst));
    }
});