const path = require('path');
const webpack = require('webpack');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = [
  {
    target: "web",
    entry: path.join(__dirname, 'test-web.ts'),
    output: {
      filename: 'test.min.js',
      path: path.join(__dirname, '/build-web'),
      libraryTarget: 'commonjs2',
    },
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          exclude: /node_modules/,
        }
      ],
    },
    resolveLoader: {
      modules: ['node_modules', path.resolve(__dirname, 'node_modules')],
    },
    plugins: [
      new NodePolyfillPlugin(),
      new webpack.DefinePlugin({
        'process.platform': JSON.stringify('browser'),
      }),
    ],
    resolve: {
      fallback: {
        fs: false
      }
    }
  },
];
