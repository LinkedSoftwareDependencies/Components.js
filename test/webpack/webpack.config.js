const path = require('path');

module.exports = [
  {
    target: "node",
    entry: path.join(__dirname, 'test.ts'),
    output: {
      filename: 'test.min.js',
      path: path.join(__dirname, '/build'),
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
  },
];