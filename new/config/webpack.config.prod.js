const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const padStart = require('lodash.padstart');
const path = require('path');
const webpack = require('webpack');

const date = new Date();
const timestamp = `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}_${padStart(date.getHours(), 2, '0')}-${padStart(
    date.getMinutes(),
    2,
    '0'
)}-${padStart(date.getSeconds(), 2, '0')}`;

const config = {
    entry: {
        app: ['./src/index.tsx']
    },
    output: {
        path: path.resolve(__dirname, '../build/'),
        filename: `./[name].${timestamp}.js`
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: 'css-loader?-url'
                })
            },
            {
                test: /\.scss$/,
                loader: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: [{ loader: 'css-loader' }, { loader: 'resolve-url-loader' }, { loader: 'sass-loader' }]
                })
            },
            {
                test: /\.(ts|tsx)$/,
                include: /src/,
                loader: 'awesome-typescript-loader'
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'url-loader?limit=10000&mimetype=application/font-woff',
                exclude: /node_modules/
            },
            {
                test: /\.(eot|ttf|svg|woff|woff2)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'file-loader?name=[name].[ext]',
                exclude: /node_modules/
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './assets/index.html',
            inject: false
        }),
        new ExtractTextPlugin({ filename: `[name].${timestamp}.css` }),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('production')
            }
        })
    ],

    resolve: {
        modules: [path.resolve('./'), 'node_modules'],
        extensions: ['.js', '.jsx', '.ts', '.tsx']
    }
};

module.exports = config;
