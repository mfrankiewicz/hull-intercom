const path = require("path");
const webpack = require("webpack");
const Visualizer = require("webpack-visualizer-plugin");

let plugins = [];

if (process.env.NODE_ENV === "production") {
  plugins = [
    new webpack.optimize.UglifyJsPlugin({
      compressor: {
        warnings: false,
        screw_ie8: false
      }
    }),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV)
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    })
  ];
} else {
  plugins = [new Visualizer()];
}

module.exports = {
  devtool: "#source-map",
  entry: {
    ship: path.join(__dirname, "src/ship.js")
  },
  output: {
    path: path.join(__dirname, "/dist/"),
    filename: "[name].js",
    publicPath: "/"
  },
  plugins,
  resolve: { extensions: [".js"] },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader"
      }
    ]
  }
};
