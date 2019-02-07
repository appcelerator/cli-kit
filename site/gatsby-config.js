module.exports = {
	siteMetadata: {
		title: 'cli-kit: Node.js command line interface toolkit',
		author: 'Chris Barber',
		description: 'cli-kit is a Node.js-based CLI toolkit that supports parsing, components, prompting, templates, and more.',
		siteUrl: 'https://cli-kit.js.org'
	},
	plugins: [
		'gatsby-plugin-react-helmet',
		{
			resolve: 'gatsby-plugin-manifest',
			options: {
				name: 'cli-kit',
				short_name: 'cli-kit',
				start_url: '/',
				background_color: '#663399',
				theme_color: '#663399',
				display: 'minimal-ui',
				icon: 'src/images/icon.png'
			}
		},
		'gatsby-plugin-offline',
		'gatsby-plugin-sass',
		{
			resolve: 'gatsby-transformer-remark',
			options: {
				plugins: [
					'gatsby-remark-prismjs'
				]
			}
		},
		{
			resolve: `gatsby-source-filesystem`,
			options: {
				path: `${__dirname}/src/docs`,
				name: "docs"
			}
		}
	]
};
