'use strict';

const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const os = require('os');

// DEPLOY_PATH is set by the s3-deploy-action its value will be:
// `branch/[branch-name]/` or `version/[tag-name]/`
// See the following documentation for more detail:
//   https://github.com/concord-consortium/s3-deploy-action/blob/main/README.md#top-branch-example
const DEPLOY_PATH = process.env.DEPLOY_PATH;

// PLAYWRIGHT_CI is set to a truthy value when we're running playwright in
// GitHub actions, this is used to handle the https certificates.
// See the readme in playwright/certificate/
const PLAYWRIGHT_CI = process.env.PLAYWRIGHT_CI;

module.exports = (env, argv) => {
  const devMode = argv.mode !== 'production';

  return {
    context: __dirname, // to automatically find tsconfig.json
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      hot: true,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      server: {
        type: 'https',
        options: {
          key: PLAYWRIGHT_CI
            ? 'playwright/certificate/localhost.key'
            : path.resolve(os.homedir(), '.localhost-ssl/localhost.key'),
          cert: PLAYWRIGHT_CI
            ? 'playwright/certificate/localhost.pem'
            : path.resolve(os.homedir(), '.localhost-ssl/localhost.pem'),
        },
      },
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
      },
    },
    devtool: devMode ? 'eval-cheap-module-source-map' : 'source-map',
    entry: './src/index.tsx',
    mode: 'development',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'assets/index.[contenthash].js',
    },
    performance: { hints: false },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: [
            /node_modules/,
            /server/,        // Exclude server directory from webpack build
            /api/,           // Exclude api directory from webpack build
            /\.test\./,      // Exclude test files from webpack build
            /\.spec\./       // Exclude spec files from webpack build
          ],
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.webpack.json'
          }
        },
        // This code coverage instrumentation should only be added when needed. It makes
        // the code larger and slower
        process.env.CODE_COVERAGE ? {
          test: /\.[tj]sx?$/,
          loader: '@jsdevtools/coverage-istanbul-loader',
          options: { esModules: true },
          enforce: 'post',
          exclude: path.join(__dirname, 'node_modules'),
        } : {},
        {
          test: /\.(sa|sc|le|c)ss$/i,
          use: [
            devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                esModule: false,
                modules: {
                  // required for :import from scss files
                  // cf. https://github.com/webpack-contrib/css-loader#separating-interoperable-css-only-and-css-module-features
                  mode: 'icss',
                }
              }
            },
            'postcss-loader',
            {
              loader: 'sass-loader',
              options: {
                api: 'modern'
              }
            }
          ]
        },
        {
          test: /\.(png|woff|woff2|eot|ttf)$/,
          type: 'asset',
        },
        { // disable svgo optimization for files ending in .nosvgo.svg
          test: /\.nosvgo\.svg$/i,
          loader: '@svgr/webpack',
          options: {
            svgo: false,
          }
        },
        {
          test: /\.svg$/i,
          exclude: /\.nosvgo\.svg$/i,
          oneOf: [
            {
              // Do not apply SVGR import in CSS files.
              issuer: /\.(css|scss|less)$/,
              type: 'asset',
            },
            {
              issuer: /\.tsx?$/,
              loader: '@svgr/webpack',
              options: {
                svgoConfig: {
                  plugins: [
                    {
                      // cf. https://github.com/svg/svgo/releases/tag/v2.4.0
                      name: 'preset-default',
                      params: {
                        overrides: {
                          // don't minify "id"s (i.e. turn randomly-generated unique ids into "a", "b", ...)
                          // https://github.com/svg/svgo/blob/master/plugins/cleanupIds.js
                          cleanupIds: { minify: false },
                          // leave <line>s, <rect>s and <circle>s alone
                          // https://github.com/svg/svgo/blob/master/plugins/convertShapeToPath.js
                          convertShapeToPath: false,
                          // leave "stroke"s and "fill"s alone
                          // https://github.com/svg/svgo/blob/master/plugins/removeUnknownsAndDefaults.js
                          removeUnknownsAndDefaults: { defaultAttrs: false },
                          // leave viewBox alone
                          removeViewBox: false
                        }
                      }
                    }
                  ]
                }
              }
            }
          ]
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
    },
    stats: {
      // suppress "export not found" warnings about re-exported types
      warningsFilter: /export .* was not found in/,
    },
    plugins: [
      new ESLintPlugin({
        extensions: ['ts', 'tsx', 'js', 'jsx'],
      }),
      new MiniCssExtractPlugin({
        filename: devMode ? 'assets/[name].css' : 'assets/[name].[contenthash].css',
      }),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: 'src/index.html',
        favicon: 'src/public/favicon.ico',
        publicPath: '.',
      }),
      ...(DEPLOY_PATH ? [new HtmlWebpackPlugin({
        filename: 'index-top.html',
        template: 'src/index.html',
        favicon: 'src/public/favicon.ico',
        publicPath: DEPLOY_PATH
      })] : []),
      new CleanWebpackPlugin(),
    ]
  };
};
