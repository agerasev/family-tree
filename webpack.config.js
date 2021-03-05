const path = require("path");

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
};
