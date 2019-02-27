module.exports = {
	siteMetadata: {
		title: 'cli-kit',
		caption: 'Node.js command line interface toolkit',
		author: 'Chris Barber',
		description: 'cli-kit is a Node.js-based CLI toolkit that supports parsing, components, prompting, templates, and more.',
		siteUrl: 'https://cli-kit.js.org'
	},
	plugins: [
		'gatsby-plugin-catch-links',
		{
			resolve: `gatsby-plugin-google-analytics`,
			options: {
				trackingId:          'YOUR_GOOGLE_ANALYTICS_TRACKING_ID',
				head:                false,
				anonymize:           true,
				respectDNT:          true,
				// exclude:          ["/preview/**", "/do-not-track/me/too/"],
				siteSpeedSampleRate: 10,
				cookieDomain:        'none',
				allowAdFeatures:     false
			}
		},
		{
			resolve: 'gatsby-plugin-feed',
			options: {
				query: `{
					site {
						siteMetadata {
							title
							description
							siteUrl
							site_url: siteUrl
						}
					}
				}`,
				feeds: [
					{
						serialize({ query: { site, allMarkdownRemark } }) {
							return allMarkdownRemark.edges.map(edge => {
								return Object.assign({}, edge.node.frontmatter, {
									description:     edge.node.excerpt,
									date:            edge.node.frontmatter.date,
									url:             site.siteMetadata.siteUrl + edge.node.fields.slug,
									guid:            site.siteMetadata.siteUrl + edge.node.fields.slug,
									custom_elements: [ { 'content:encoded': edge.node.html } ]
								});
							});
						},
						query: `{
							allMarkdownRemark(
								filter: {
									frontmatter: { draft: { ne: true } }
									fileAbsolutePath: { regex: "\/blog/" }
								},
								limit: 1000,
								sort: { fields: [frontmatter___date], order: DESC }
							) {
								edges {
									node {
										excerpt
										html
										fields {
											slug
										}
										frontmatter {
											title
											date
										}
									}
								}
							}
						}`,
						output: '/rss.xml',
						title: 'Gatsby RSS Feed'
					}
				]
			}
		},
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
		'gatsby-plugin-react-helmet',
		{
			resolve: 'gatsby-transformer-remark',
			options: {
				plugins: [
					'gatsby-remark-autolink-headers',
					{
						resolve: 'gatsby-remark-emojis',
						options: {
							active: true,
							size: 16,
						}
					},
					{
						resolve: 'gatsby-remark-prismjs',
						options: {
							languageExtensions: [
								{
									language: 'keyvalue',
									definition: {
										value: /(?<=.+[^\n].+(?:\t| {2,})+)[^\n]+/,
										key: /.*/s
									}
								}
							]
						}
					}
				]
			}
		},
		'gatsby-plugin-offline',
		'gatsby-plugin-sass',
		'gatsby-plugin-sitemap',
		{
			resolve: 'gatsby-source-filesystem',
			options: {
				name: 'blog',
				path: `${__dirname}/content/blog`
			}
		},
		{
			resolve: 'gatsby-source-filesystem',
			options: {
				name: 'docs',
				path: `${__dirname}/content/docs`
			}
		}
	]
};
