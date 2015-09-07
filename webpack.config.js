'use strict';
/*eslint no-process-env:0*/

var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var CompressionPlugin = require('compression-webpack-plugin');
/*eslint-enable */

var config = {
  template: 'index.tmpl.html',
  index: 'index.html',
  src: './ws.public',
  dest: './ws.public'
};

var isProduction = process.env.NODE_ENV === 'production';

var absSrc = path.join(__dirname, config.src);
var absDest = path.join(__dirname, config.dest);
// var nodeModules = path.join(__dirname, './node_modules/');
var wConfig = {
  debug: true,
  profile: true,
  cache: true,
  devtool: isProduction ? 'sourcemaps' : 'eval',
  context: path.join(__dirname, config.src),
  entry: {
    'waffle-server': './components',
    angular: ['jquery', 'angular', 'angular-resource',
      'angular-ui-router', 'angular-breadcrumb', 'oclazyload',
      'angular-ui-bootstrap', 'async', 'lodash'
    ]
  },
  output: {
    path: absDest,
    publicPath: './',
    filename: 'dest/components/[name]-[hash:6].js',
    chunkFilename: 'dest/components/[name]-[hash:6].js'
  },
  resolve: {
    root: [absSrc],
    modulesDirectories: ['./components', 'node_modules'],
    extensions: ['', '.js', '.png', '.gif', '.jpg'],
    alias: {
      'angular-google-maps': 'angular-google-maps/dist/angular-google-maps.min.js',
      'ng-infinite-scroll': 'ng-infinite-scroll/build/ng-infinite-scroll.js'/*,
      datamaps: 'datamaps/dist/datamaps.all.js'*/
    }
  },
  module: {
    loaders: [
/*      {
        test: /ws\.public.*\.js$/,
        exclude: /(node_modules|bower_components|assets)/,
        loader: 'babel-loader'
      },*/
      {
        test: /\.less$/,
        //loader: 'style!css!less'
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader?sourceMap&root=' + absSrc + '!less-loader')
      },
      {
        test: /\.css$/,
        exclude: /bootstrap/ig,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader?sourceMap&root=' + absSrc)
        //loader: 'style!css'//?root=' + absSrc
      },
      {
        test: /\.(png|jpg|gif)$/,
        loader: 'url?name=assets/img/[name]-[hash:6].[ext]&limit=10000'
      },
      {
        test: /\.html$/,
        loader: 'html?name=[name].[ext]&root=' + absSrc
        //loader: ExtractTextPlugin.extract('html-loader?name=[name].[ext]&root=' + absSrc)
      },
      {
        test: [/fontawesome-webfont\.svg/, /fontawesome-webfont\.eot/],
        loader: 'file?name=assets/fonts/[name].[ext]'
      },
      // Needed for the css-loader when [bootstrap-webpack](https://github.com/bline/bootstrap-webpack)
      // loads bootstrap's css.
      {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?name=assets/fonts/[name].[ext]&limit=10000&mimetype=application/font-woff'
      },
      {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?name=assets/fonts/[name].[ext]&limit=10000&mimetype=application/font-woff'
      },
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?name=assets/fonts/[name].[ext]&limit=10000&mimetype=application/octet-stream'
      },
      {test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file?name=assets/fonts/[name].[ext]'},
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?name=assets/fonts/[name].[ext]&limit=10000&mimetype=image/svg+xml'
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      _isDev: !isProduction
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery'
    }),
    new ExtractTextPlugin('[name]-[hash:6].css'),
    new webpack.optimize.CommonsChunkPlugin('angular', 'dest/vendor/angular-[hash:6].bundle.js'),
    //new webpack.optimize.CommonsChunkPlugin({
    //  name: 'commons-chunk',
    //  filename: 'vendor/commons-[hash:6].bundle.js',
    //  minChunks: 2,
    //  //chunks: ['angular-bootstrap', 'bootstrap-css'],
    //  children: true
    //}),
    new HtmlWebpackPlugin({
      filename: config.index,
      template: path.join(config.src, config.template),
      chunks: ['angular', 'waffle-server'],
      minify: true
    })
  ],
  pushPlugins: function () {
    if (!isProduction) {
      return;
    }

    console.log('Adding production plugins');
    this.plugins.push.apply(this.plugins, [
      // production only
      new webpack.optimize.UglifyJsPlugin(),
      new CompressionPlugin({
        asset: '{file}.gz',
        algorithm: 'gzip',
        regExp: /\.js$|\.html|\.css|.map$/,
        threshold: 10240,
        minRatio: 0.8
      })
    ]);
  },
  stats: {colors: true, progress: true, children: false},
  devServer: {
    contentBase: config.dest,
    publicPath: '/',
    noInfo: true,
    hot: true,
    inline: true,
    historyApiFallback: true,
    devtool: 'eval',
    proxy: {
      '*/api/*': 'http://localhost:3000'
    }
  }
};

wConfig.pushPlugins();

module.exports = wConfig;
