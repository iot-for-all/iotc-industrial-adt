const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');

module.exports = [new ForkTsCheckerWebpackPlugin(),
new FileManagerPlugin({
    events: {
        onStart: {
            copy: [
                {
                    source: './package.json',
                    destination: './.webpack/main/package.json',
                },
                {
                    source: './src/mapper-logo.png',
                    destination: './.webpack/main/logo.png',
                },
            ],
        },
    },
}),];
