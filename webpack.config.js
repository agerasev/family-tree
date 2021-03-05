const path = require("path");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: "./src/main.ts",
  module: {
    rules: [
      /*
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          "sass-loader",
        ],
      },
      */
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, "output"),
    filename: "bundle.js",
  },
  mode: "development",
  plugins: [
    new HtmlWebpackPlugin(),
    new WasmPackPlugin({
      crateDirectory: path.resolve(__dirname, "./solver")
    }),
  ],
  experiments: {
    asyncWebAssembly: true,
  },
};
