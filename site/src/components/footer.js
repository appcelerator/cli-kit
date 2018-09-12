import React from 'react'
import { Container, Grid } from 'semantic-ui-react';

export default () => (
	<footer>
		<Container className="inverted">
			<Grid columns={2} divided>
				<Grid.Row>
					<Grid.Column>
						Copyright © 2018
					</Grid.Column>
					<Grid.Column>
						Sitemap
					</Grid.Column>
				</Grid.Row>
			</Grid>
		</Container>
	</footer>
);
