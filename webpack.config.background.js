const path = require('path');

module.exports = {
    entry: './background/background.ts',
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
        filename: 'background.js',
        path: path.resolve(__dirname, 'extension-out'),
    },
};
