/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/node-apis/
 */

 exports.onCreateWebpackConfig = ({
	stage,
	rules,
	loaders,
	plugins,
	actions
}) => {
	const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
	actions.setWebpackConfig({
		plugins: [
			new MonacoWebpackPlugin({
				languages: [ 'javascript' ]
			})
		],
		module: {
			rules: [
				{
					test: /\.txt$/,
					use: 'raw-loader'
				}
			]
		}
	});
};
