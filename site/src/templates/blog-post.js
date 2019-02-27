import React, { Component } from 'react';
import DefaultLayout from '../layouts/default';
import { graphql } from 'gatsby';
import { Link } from 'gatsby';

export default class Template extends Component {
	render() {
		const { markdownRemark: post } = this.props.data;
		const { date, title } = post.frontmatter;
		const { previous, next } = this.props.pageContext;

		return (
			<DefaultLayout location={this.props.location} title={`Blog - ${title}`}>
				<div className="page">
					<h1>{title}</h1>
					<p>{date}</p>
					<div dangerouslySetInnerHTML={{ __html: post.html }} />
					<ul	style={{
						display: `flex`,
						flexWrap: `wrap`,
						justifyContent: `space-between`,
						listStyle: `none`,
						padding: 0
					}}>
						<li>
							{previous && (
								<Link to={previous.fields.slug} rel="prev">
									← {previous.frontmatter.title}
								</Link>
							)}
						</li>
						<li>
							{next && (
								<Link to={next.fields.slug} rel="next">
									{next.frontmatter.title} →
								</Link>
							)}
						</li>
					</ul>
				</div>
			</DefaultLayout>
		);
	}
}

export const pageQuery = graphql`
	query BlogPostBySlug($slug: String!) {
		markdownRemark(
			fields: { slug: { eq: $slug } }
		) {
			id
			excerpt(pruneLength: 160)
			html
			frontmatter {
				title
				date(formatString: "MMMM DD, YYYY")
			}
		}
	}
`;
