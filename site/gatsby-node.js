const path = require('path');
const { createFilePath } = require('gatsby-source-filesystem');

exports.createPages = async ({ actions, graphql }) => {
	const { createPage } = actions;

	// wire up docs
	let result = await graphql(`{
		allMarkdownRemark(
			filter: { fileAbsolutePath: { regex: "\/docs/" } }
			limit: 1000
			sort: { order: DESC, fields: [frontmatter___title] }
		) {
			edges {
				node {
					fileAbsolutePath
					frontmatter {
						title
					}
					html
				}
			}
		}
	}`);

	if (result.errors) {
		throw result.errors;
	}

	const docTemplate = path.resolve('src/templates/docs-template.js');
	for (const { node } of result.data.allMarkdownRemark.edges) {
		const name = path.basename(node.fileAbsolutePath).replace(/\..+$/, '');
		createPage({
			path: name === 'index' ? '/docs' : `/docs/${name}`,
			component: docTemplate,
			context: {}
		});
	}

	// wire up blog posts
	result = await graphql(`{
		allMarkdownRemark(
			filter: { fileAbsolutePath: { regex: "\/blog/" } }
			limit: 1000
			sort: { fields: [frontmatter___date], order: DESC }
		) {
			edges {
				node {
					fields {
						slug
					}
					frontmatter {
						title
					}
				}
			}
		}
	}`);

	if (result.errors) {
		throw result.errors;
	}

	const blogPost = path.resolve('src/templates/blog-post.js');
	let i = 0;
	const posts = result.data.allMarkdownRemark.edges;
	for (const post of posts) {
		const previous = i === posts.length - 1 ? null : posts[i + 1].node;
		const next = i === 0 ? null : posts[i - 1].node;

		createPage({
			path: `/blog${post.node.fields.slug}`,
			component: blogPost,
			context: {
				slug: post.node.fields.slug,
				previous,
				next
			}
		});

		i++;
	}
};

// register the blog post pages
exports.onCreateNode = ({ node, actions, getNode }) => {
	if (node.internal.type === 'MarkdownRemark') {
		if (/\/blog\//.test(node.fileAbsolutePath)) {
			actions.createNodeField({
				name: 'slug',
				node,
				value: createFilePath({ node, getNode })
			});
			actions.createNodeField({
				name: 'type',
				node,
				value: 'blog'
			});
		} else if (/\/docs\//.test(node.fileAbsolutePath)) {
			const name = path.basename(node.fileAbsolutePath).replace(/\..+$/, '');
			actions.createNodeField({
				name: 'path',
				node,
				value: name === 'index' ? '/docs' : `/docs/${name}`
			});
			actions.createNodeField({
				name: 'type',
				node,
				value: 'docs'
			});
		}
	}
};

exports.onCreateWebpackConfig = ({ actions, getConfig, loaders, stage }) => {
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
					test: /\/examples\/(?!index\.).+\.js$/,
					use: 'raw-loader'
				}
			]
		}
	});

	if (stage === "build-html") {
		actions.setWebpackConfig({
			module: {
				rules: [
					{
						test: /\/monaco-editor\/esm\/vs\/editor\//,
						use: loaders.null()
					}
				]
			}
		});
	}
};
