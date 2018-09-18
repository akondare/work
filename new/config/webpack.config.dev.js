const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

const config = {
    entry: {
        app: ['./src/index.tsx']
    },
    output: {
        path: path.resolve(__dirname, 'dev'),
        filename: 'bundle.js'
    },
    module: {
        rules: [
            { test: /\.js$/, loader: 'source-map-loader' },
            { test: /\.css$/, loader: 'style-loader!css-loader?-url' },
            { test: /\.scss$/, loaders: ['style-loader', 'css-loader', 'resolve-url-loader', 'sass-loader?sourceMap'] },
            { test: /\.(ts|tsx)$/, exclude: /node_modules|lib/, loader: 'awesome-typescript-loader' },
            { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff' },
            { test: /\.(eot|ttf|svg|woff|woff2)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file-loader?name=[name].[ext]' }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './assets/index.html',
            inject: false
        }),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('development')
            }
        }),
        new webpack.HotModuleReplacementPlugin()
    ],

    resolve: {
        modules: [path.resolve('./'), 'node_modules'],
        extensions: ['.js', '.jsx', '.ts', '.tsx']
    }
};

module.exports = config;
