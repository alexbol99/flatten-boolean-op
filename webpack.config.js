const path = require('path');

const config = {
    entry: './index.js',
    output: {
        library: "flatten-boolean-op",
        libraryTarget: "commonjs2",
        path: path.resolve(__dirname, 'dist'),
        filename: 'flatten-boolean-op.min.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/
            }
        ],
    },
    plugins: [],
    devtool: "source-map"
};

config.plugins = config.plugins.filter((plugin) => plugin.constructor.name !== 'UglifyJsPlugin');

module.exports = config;
