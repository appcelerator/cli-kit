import React from 'react'
import styles from '../css/footer.module.scss';
import { Container } from 'semantic-ui-react';
import { Link } from 'gatsby';

export default () => (
	<footer className={styles.footer}>
		<Container>
			<p><Link to="/">cli-kit</Link>: Open source command line toolkit</p>
			<p className={styles.copyright}>© 2015-{new Date().getFullYear()} cli-kit contributors</p>
		</Container>
	</footer>
);
