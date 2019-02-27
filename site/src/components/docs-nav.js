import React, { PureComponent } from 'react';
import styles from '../css/docs.module.scss';
import { docs } from '../../site-nav.json';
import { graphql, StaticQuery } from 'gatsby';
import { Icon } from 'semantic-ui-react';
import { Link } from 'gatsby';

export default class DocsNav extends PureComponent {
	render() {
		return (
			<StaticQuery
				query={graphql`
					query {
						allMarkdownRemark(
							filter: { fields: { type: { eq: "docs" }}}
						) {
							edges {
								node {
									fields {
										path
									}
									frontmatter {
										title
									}
								}
							}
						}
					}
				`}

				render={data => {
					const location = this.props.location.pathname.replace(/\/$/, '');
					const groups = {};
					const { sections } = this.props;

					for (const name of Object.keys(docs)) {
						const group = groups[name] = [];
						for (let url of docs[name]) {
							if (Array.isArray(url)) {
								group.push({
									url: url[1],
									label: url[0],
									external: true
								});
								continue;
							}

							url = `/docs${url === '/' ? '' : url}`;
							let link = null;

							for (const { node } of data.allMarkdownRemark.edges) {
								if (node.fields.path === url) {
									link = {
										url,
										label: node.frontmatter.title,
										current: url === location
									};
									group.push(link);
									break;
								}
							}

							if (link && link.current && sections) {
								link.sections = sections
									.filter(section => section.depth === 2)
									.map(section => {
										return {
											url: `${url}#${section.value.toLowerCase().replace(/\s/g, '-')}`,
											label: section.value
										};
									});
							}
						}
					}

					const renderList = (list, depth) => {
						if (list.length) {
							return <ul className={styles.list}>
								{list.map((item, i) => {
									if (item.external) {
										return <li key={i}><a href={item.url}>{item.label}</a></li>;
									}

									return <li key={i} className={item.current ? 'active' : null}>
										{depth ? <Icon name="angle right" /> : null}
										<Link to={item.url}>{item.label}</Link>
										{item.sections ? renderList(item.sections, depth + 1) : null}
									</li>;
								})}
							</ul>;
						}
					};

					console.log(groups);

					return <>
						{Object.keys(groups).map((group, i) => {
							return <div key={i}>
								<h4>{group}</h4>
								{renderList(groups[group], 0)}
							</div>;
						})}
					</>;
				}}
			/>
		);
	}
}
