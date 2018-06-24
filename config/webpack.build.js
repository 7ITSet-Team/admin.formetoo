const webpack = require('webpack')
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CompressionPlugin = require("compression-webpack-plugin")
const gutil = require('gutil')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

const ENV = process.env.NODE_ENV || 'development'

const _root = path.resolve()
const _project = path.join(_root, '/src/front')
const _entry = _project + '/launcher.js'
const _themePath = _project + '/styles/'
const _output = path.join(_root, '/build/public/', (ENV === 'production') ? '/prod' : '/dev')

const aliases = {
    '@admin': _project,
    '@src': _project + '/src',
    '@common': _project + '/common',
    '@theme': _themePath
}

const envOptions = {
    ENV: JSON.stringify(ENV),
    outputPath: _output,
    aliases: (ENV === 'production') ? {
        '@config': _project + '/configs/config.prod'
    } : {
        '@config': _project + '/configs/config.dev'
    },
    watch: (ENV !== 'production'),
    mode: (ENV === 'production') ? 'production' : 'development',
    optimization: {
        minimizer: (ENV === 'production') ? [
            new UglifyJsPlugin({
                sourceMap: false,
                uglifyOptions: {
                    compress: {
                        drop_console: true
                    }
                }
            })
        ] : [],
        splitChunks: {
            minChunks: 30000
        }
    },

    plugins: (ENV === 'production') ? [
        new webpack.optimize.OccurrenceOrderPlugin(),
        new CompressionPlugin({
            asset: '[path].gz[query]',
            algorithm: "gzip",
            test: /\.js$|\.css$|\.html$/,
            threshold: 10240,
            minRatio: 0.8
        })
    ] : []
}

const config = {
    mode: envOptions.mode,
    context: _project,
    entry: {
        'main': ['babel-polyfill', _entry]
    },
    output: {
        path: envOptions.outputPath,
        filename: '[name].bundle.js',
        chunkFilename: '[name].bundle.js'
    },

    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel-loader",
            }, {
                test: /\.(png|jpg|eot|svg|ttf|woff)$/,
                use: [
                    {
                        loader: 'file-loader',
                        query: {
                            context: './',
                            useRelativePath: false,
                            outputPath: 'static/'
                        }
                    }
                ]
            }, {
                test: /\.css$/,
                use: [
                    {
                        loader: 'style-loader',
                    }, {
                        loader: 'css-loader',
                    }
                ],
            }
        ]
    },

    optimization: envOptions.optimization,

    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                'NODE_ENV': envOptions.ENV
            }
        }),
        new HtmlWebpackPlugin({
            filename: envOptions.outputPath + '/index.html',
            template: 'index.html',
            favicon: 'favicon.ico',
            title: 'formetoo'
        }),
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1
        }),
        ...envOptions.plugins
    ],
    resolve: {
        extensions: ['.js', '.jsx', '.css'],
        alias: Object.assign(aliases, envOptions.aliases)
    },
    watch: envOptions.watch
}


webpack(config, (err, stats) => {
    if (err) {
        throw new gutil.PluginError('webpack:build', err)
    }
    gutil.log('[webpack:build]', stats.toString({
        chunks: false,
        colors: true,
        timings: true
    }))
})

if (ENV !== 'production') {
    const staticServer = require('node-static')
    const fileServer = new staticServer.Server(_output, {gzip: true})

    require('http')
        .createServer((request, response) => {
            request.addListener('end', () => {
                fileServer.serve(request, response, (e, res) => {
                    if (e && (e.status === 404)) {
                        fileServer.serveFile('/index.html', 404, {}, request, response)
                    }
                })
            }).resume()
        }).listen(3030)
}