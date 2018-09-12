import React from 'react';
import { Container, Menu } from 'semantic-ui-react';
import { Link } from 'gatsby';

const primaryNav = [
	{ name: 'Home', path: '/' },
	{ name: 'Docs', path: '/docs' },
	{ name: 'Blog', path: '/blog' },
	{ name: 'GitHub', path: 'https://github.com/cb1kenobi/cli-kit' }
];

export default class Header extends React.PureComponent {
	render() {
		const { children } = this.props;

		return (
			<header>
				<Menu size="large" fixed="top" pointing inverted={true}>
					<Container as="nav">
						{primaryNav.map(item => {
							if (/^http/.test(item.path)) {
								return <a className="item" href={item.path}>{item.name}</a>;
							}

							return <Menu.Item
								as={Link}
								to={item.path}
								key={item.path}
								active={false}
							>{item.name}</Menu.Item>;
						})}
					</Container>
				</Menu>
				{children}
			</header>
		);
	}
}
