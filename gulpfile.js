'use strict';

const fsx = require('fs-extra');
const glob = require('glob');
const gulp = require('gulp');
const imagemin = require('gulp-imagemin');
const open = require('gulp-open');
const plumber = require('gulp-plumber');
const rs = require('run-sequence');

const config = fsx.readJsonSync('config.json');
const s3 = require('gulp-s3-upload')(config);

let paths = {
    s3: config.S3URLPath,
    dest: {
        img: (isGlob) =>  {
            return './build/' + (isGlob ? '**/*' : '');
        }
    },
    src: {
        img: (isGlob) => {
            return './img/' + (isGlob ? '**/*' : '');
        }
    }
};

gulp.task('clean', () => {

    return fsx.removeSync(paths.dest.img());

});

gulp.task('imagemin', ['clean'], () => {

    return gulp.src(paths.src.img(true))
    .pipe(plumber())
    .pipe(imagemin())
    .pipe(gulp.dest(paths.dest.img()));

});

gulp.task('upload', () => {

    return gulp.src(paths.dest.img(true))
    .pipe(plumber())
    .pipe(s3({
        Bucket: config.S3BucketName,
        ACL: 'public-read'
    }, {
        // S3 Constructor options
        maxRetries: 5
    }));

});

gulp.task('open', () => {

    return glob(paths.dest.img(true), (err, files) => {

        let html = '<dl>';
        files.forEach((file) => {

            let path = paths.s3 + file.replace(paths.dest.img(), '');
            html += `<dt>${path}</dt>`;
            html += `<dd><img src="${path}" /></dd>`;

        });
        html += '</dl>';
        console.log(html);
        fsx.outputFileSync('./index.html', html);
        gulp.src('./index.html')
        .pipe(plumber())
        .pipe(open());

    });

});

gulp.task('default', (cb) => {

    rs('imagemin', 'upload', 'open', cb);

});
