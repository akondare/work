const concat = require('gulp-concat');
const Config = require('./config/gulp.config.js');
const del = require('del');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const gulp = require('gulp');
const gulpTslint = require('gulp-tslint');
const gutil = require('gulp-util');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const pump = require('pump');
const rename = require('gulp-rename');
const tslint = require('tslint');
const uglify = require('gulp-uglify');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');
const webpackDevConfig = require('./config/webpack.config.dev.js');
const WebpackDevServer = require('webpack-dev-server');
const webpackProdConfig = require('./config/webpack.config.prod.js');
const zip = require('gulp-zip');

// Production build
gulp.task('prod', ['tslint', 'build']);

// Unminified production build
gulp.task('prod:unminified', ['tslint', 'build-unminified']);

// Dev server
gulp.task('dev', ['tslint', 'watch', 'webpack:dev-server']);

const TYPESCRIPT_FILES = ['src/**/*.ts', 'src/**/*.tsx'];
gulp.task('watch', () => {
    gulp.watch(TYPESCRIPT_FILES, ['tslint']);
});

gulp.task('tslint', () => {
    const program = tslint.Linter.createProgram('./tsconfig.json');
    return gulp
        .src(TYPESCRIPT_FILES.concat(['!src/shared/**/*']))
        .pipe(gulpTslint({ program, formatter: 'stylish' }))
        .pipe(gulpTslint.report({ allowWarnings: true, emitError: false }));
});

/**
 * Start the dev server
 */
gulp.task('webpack:dev-server', ['build-polyfills'], done => {
    webpackDevConfig.entry.app = [
        `webpack-dev-server/client?http://${Config.devAddress}:${Config.devPort}`,
        'webpack/hot/dev-server'
    ].concat(webpackDevConfig.entry.app);

    const config = Object.create(webpackDevConfig);
    config.plugins = config.plugins.concat([new InterpolateHtmlPlugin({ CONFIG: 'config.dev.js', POLYFILLS: Config.polyfillBundleName })]);
    config.devtool = 'cheap-module-source-map';

    new WebpackDevServer(webpack(config), {
        historyApiFallback: true,
        contentBase: ['./assets'].concat(Config.devScriptFolders).concat(Config.tempFolder),
        hot: true,
        stats: {
            children: false,
            chunks: false,
            chunkModules: false,
            modules: false,
            colors: true
        }
    }).listen(Config.devPort, Config.devAddress, err => {
        if (err) {
            throw new gutil.PluginError('webpack-dev-server', err);
        }
    });
});

/**
 * Compiles the source code and places the bundle in /build
 */
gulp.task('build', ['build-polyfills', 'webpack:build'], done => {
    buildWar().then(() => done());
});

/**
 * Same as "build" but unminified js/css
 */
gulp.task('build-unminified', ['build-polyfills', 'webpack:build-unminified'], done => {
    buildWar().then(() => done());
});

gulp.task('webpack:build', done => {
    gutil.log(gutil.colors.green('Creating minified production build...'));

    const config = Object.create(webpackProdConfig);
    config.plugins = config.plugins.concat([
        new InterpolateHtmlPlugin({ CONFIG: 'config.js', POLYFILLS: Config.polyfillBundleName }),
        new UglifyJSPlugin(),
        new OptimizeCssAssetsPlugin({
            cssProcessorOptions: {
                discardComments: { removeAll: true },
                mergeLonghand: false,
                mergeRules: false,
                reduceInitial: false,
                uniqueSelectors: false,
                zindex: false
            }
        })
    ]);
    config.devtool = 'none';

    webpack(config, (err, stats) => {
        if (err) {
            throw new gutil.PluginError('webpack:build', err);
        }

        const messages = formatWebpackMessages(stats.toJson({}, true));
        if (messages.errors.length) {
            throw new gutil.PluginError('webpack:build', messages.errors.join('\n\n'));
        }

        gutil.log(gutil.colors.green('Successfully compiled'));
        done();
    });
});

gulp.task('webpack:build-unminified', done => {
    gutil.log(gutil.colors.green('Creating unminified production build...'));

    const config = Object.create(webpackProdConfig);
    config.devtool = 'cheap-module-source-map';

    webpack(config, (err, stats) => {
        if (err) {
            throw new gutil.PluginError('webpack:build-unminified', err);
        }

        const messages = formatWebpackMessages(stats.toJson({}, true));
        if (messages.errors.length) {
            throw new gutil.PluginError(messages.errors.join('\n\n'));
        }

        gutil.log(gutil.colors.green('Successfully compiled'));
        done();
    });
});

gulp.task('clean', done => {
    clean().then(() => done());
});

/**
 * Concats the necessary polyfills into a single polyfill bundle
 */
gulp.task('build-polyfills', done => {
    gutil.log(gutil.colors.green('Building polyfills...'));
    copy(
        [
            './node_modules/whatwg-fetch/fetch.js',
            './node_modules/es5-shim/es5-shim.js',
            './node_modules/es5-shim/es5-sham.js',
            './node_modules/es6-promise/dist/es6-promise.auto.js',
            './node_modules/@cgsweb/polyfills/dist/*.js'
        ],
        `./${Config.tempFolder}`,
        [concat(Config.polyfillBundleName), uglify()],
        done
    );
});

function buildWar() {
    gutil.log(gutil.colors.green(`Creating ${Config.name}.war in './${Config.distFolder}...`));

    return Promise.all([
        copyPromise(['./assets/**/*', '!./assets/config*', '!./assets/index.html'], `./${Config.tempFolder}`),
        copyPromise('./assets/config.prod.js', `./${Config.tempFolder}`, [rename('config.js')]),
        copyPromise(Config.prodScripts, `./${Config.tempFolder}`),
        copyPromise('./build/**/*', `./${Config.tempFolder}`)
    ])
        .then(() => copyPromise(`./${Config.tempFolder}/**/*`, `./${Config.distFolder}`, [zip(`${Config.name}.war`)]))
        .then(clean);
}

function clean() {
    return del([`./${Config.tempFolder}`, './build']);
}

function copyPromise(source, destination, transforms) {
    return new Promise((resolve, reject) => copy(source, destination, transforms, resolve));
}

/**
 * Convenience function wrapping pump & gulp.src/dest w/ transforms.
 * @param {*} source - Glob for source files
 * @param {*} destination - Destination path
 * @param {*} transforms - Any gulp transforms to use
 * @param {*} cb - Callback function when done
 */
function copy(source, destination, transforms, cb) {
    cb = cb || (() => {}); // If no cb is passed, use a no-op
    const streams = [gulp.src(source), gulp.dest(destination)];
    if (transforms) {
        streams.splice(1, 0, ...transforms.filter(t => !!t));
    }
    return pump(streams, cb);
}
