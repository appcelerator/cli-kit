import React, { PureComponent } from 'react';
import DefaultLayout from '../layouts/default';
import DocsNav from '../components/docs-nav';
import styles from '../css/docs.module.scss';
import { graphql } from 'gatsby';
import { Icon } from 'semantic-ui-react';
import { Location } from '@reach/router'

export default class DocsTemplate extends PureComponent {
	render() {
		const { fileAbsolutePath, frontmatter, headings, html } = this.props.data.markdownRemark;
		const { title } = frontmatter;

		const url = `https://github.com/cb1kenobi/cli-kit/blob/master${fileAbsolutePath.match(/(\/site\/.*)$/)[1]}`;

		return (
			<DefaultLayout title={`Docs - ${title}`}>
				<div className={styles.docs}>
					<nav>
						<Location>
							{({ location }) => {
								return <DocsNav location={location} sections={headings} />
							}}
						</Location>
					</nav>
					<content>
						<div>
							<h1>{title}</h1>
							<div className="content" dangerouslySetInnerHTML={{ __html: html }} />
						</div>
						<a className="edit-page" href={url}><Icon name="edit" />Edit this page on GitHub</a>
					</content>
				</div>
			</DefaultLayout>
		);
	}
}

export const pageQuery = graphql`
	query DocsByPath($path: String!) {
		markdownRemark(fields: { path: { eq: $path } }) {
			fileAbsolutePath
			frontmatter {
				title
			}
			headings {
				value
				depth
			}
			html
		}
	}
`;
