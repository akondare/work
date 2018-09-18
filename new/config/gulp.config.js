module.exports = {
    // Used as the name of the distributable war file
    name: 'ReactProjectTemplate',

    // Location of the distributable war file to be built
    distFolder: 'dist',

    // Host address for the dev server
    devAddress: 'localhost',

    // Port that the dev server runs on
    devPort: 3001,

    // Used as "contentBase" for webpack-dev-server
    // Allows you to import scripts in index.html from other folders
    devScriptFolders: ['./lib'],

    // List of files/folders that will be copied into the production war file
    prodScripts: ['./lib/**/*'],

    // Name of the polyfill bundle file
    polyfillBundleName: 'polyfill-bundle.js',

    // Folder where files are temporarily stored during the build/dev process
    tempFolder: '.dev'
};
