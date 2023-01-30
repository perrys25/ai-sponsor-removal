const path = require('path');

module.exports = {
    entry: './content/content.ts',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: 'content.js',
        path: path.resolve(__dirname, 'extension-out'),
    },
};
