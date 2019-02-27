import React, { PureComponent } from 'react';
import { StaticQuery, graphql } from 'gatsby';
import Link from 'gatsby-link'

export default class Sidebar extends PureComponent {
	render() {
		return (
			<StaticQuery
				query={graphql`
					query {
						allMarkdownRemark(
							filter: { fileAbsolutePath: {regex : "\/docs/"} }
						) {
							edges {
								node {
									frontmatter {
										path
										title
									}
								}
							}
						}
					}
				`}

				render={data => {
					const pages = data.allMarkdownRemark.edges;

					return (
						<div>
							<ul>
								{pages.map(({ node }) => {
									const { path, title } = node.frontmatter;
									return <li key={path}><Link to={path}>{title}</Link></li>
								})}
							</ul>
						</div>
					);
				}}
			/>
		);
	}
}
