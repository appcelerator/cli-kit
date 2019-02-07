import React from 'react';
import PropTypes from 'prop-types';
import Helmet from 'react-helmet';
import { StaticQuery, graphql } from 'gatsby';

import Header from '../components/header';
import Footer from '../components/footer';

import '../css/styles.css';
import 'semantic-ui-css/semantic.min.css';

export default class HomeLayout extends React.PureComponent {
	render() {
		const { children } = this.props;

		return (
			<StaticQuery
				query={graphql`
					query HomeTitleQuery {
						site {
							siteMetadata {
								title
							}
						}
					}
				`}

				render={data => (
					<>
						<Helmet
							title={data.site.siteMetadata.title}
							meta={[
								{ name: 'description', ent: 'cli-kit: Node.js Command Line Interface Toolkit' },
								{ name: 'keywords', content: 'node, cli, command line, climl, parser, prompting' }
							]}
						>
							<html lang="en" />
						</Helmet>
						<Header />
						<main>
							{children}
						</main>
						<Footer />
					</>
				)}
			/>
		);
	}
}

HomeLayout.propTypes = {
	children: PropTypes.node.isRequired
};
