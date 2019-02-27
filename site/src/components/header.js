import nav from '../../site-nav.json';
import React, { PureComponent } from 'react';
import styles from '../css/header.module.scss';
import { Container, Icon } from 'semantic-ui-react';
import { Link } from 'gatsby';

export default class Header extends PureComponent {
	render() {
		const renderNav = type => {
			return <nav className={styles[type]}>
				{nav[type].map(item => {
					if (/^http/.test(item.path)) {
						return <a className="item" href={item.path} key={item.path} title={item.hint}>
							{item.icon ? <Icon name={item.icon} /> : null}
							<span>{item.name}</span>
						</a>;
					}

					const getProps = ({ isCurrent, isPartiallyCurrent }) => {
						if (isCurrent || isPartiallyCurrent) {
							return {
								className: [ link.props.className, link.props.activeClassName ]
									.filter(Boolean)
									.join(` `),
								style: { ...link.props.style, ...link.props.activeStyle }
							};
						}
						return null;
					};

					const link = <Link
							to={item.path}
							key={item.path}
							title={item.hint}
							getProps={getProps}
							activeClassName={styles.active}
						>{item.icon ? <Icon name={item.icon} /> : null}<span>{item.name}</span></Link>;

					return link;
				})}
			</nav>;
		};

		return (
			<header className={styles.header}>
				<Container>
					<h1 className="project"><Link to="/">cli-kit</Link></h1>
					{renderNav('primary')}
					{renderNav('secondary')}
				</Container>
			</header>
		);
	}
}
