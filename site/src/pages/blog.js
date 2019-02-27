import React from 'react'
import DefaultLayout from '../layouts/default';
import { Link, graphql } from "gatsby"

export default class BlogPage extends React.PureComponent {
	render() {
		const posts = this.props.data.allMarkdownRemark.edges;

		return (
			<DefaultLayout location={this.props.location}>
				{posts.map(({ node }) => {
					const title = node.frontmatter.title || node.fields.slug;
					return (
						<div key={node.fields.slug}>
							<h3><Link to={`/blog/${node.fields.slug}`}>{title}</Link></h3>
							<small>{node.frontmatter.date}</small>
							<p dangerouslySetInnerHTML={{ __html: node.excerpt }} />
						</div>
					);
				})}
			</DefaultLayout>
		);
	}
}

export const pageQuery = graphql`
	query {
		allMarkdownRemark(
			filter: {
				frontmatter: { draft: { ne: true } }
				fileAbsolutePath: { regex: "\/blog/" }
			}
			sort: { fields: [frontmatter___date], order: DESC }
		) {
			edges {
				node {
					excerpt
					fields {
						slug
					}
					frontmatter {
						date(formatString: "MMMM DD, YYYY")
						title
					}
				}
			}
		}
	}
`;
