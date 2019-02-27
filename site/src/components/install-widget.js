/* eslint-disable jsx-a11y/anchor-has-content, jsx-a11y/anchor-is-valid */

import React from 'react'
import styles from '../css/install-widget.module.scss';

export default class InstallWidget extends React.Component {
	field = React.createRef();

	state = {
		mode: 'npm'
	};

	copy() {
		this.field.current.select();
		document.execCommand('copy');
	}

	toggle() {
		this.setState({
			mode: this.state.mode === 'npm' ? 'yarn' : 'npm'
		});
	}

	render() {
		const code = `${this.state.mode === 'npm' ? 'npm install' : 'yarn add'} cli-kit --save`;
		return (
			<>
				<div className={styles.outer}>
					<div className={styles.inner}>
						<label className={styles.switch}>
							<input type="checkbox" onClick={::this.toggle} />
							<span>
								<span>npm</span>
								<span>yarn</span>
								<a></a>
							</span>
						</label>
						<code>{code}</code>
						<button onClick={::this.copy}>
							<svg height="16" width="16" viewBox="0 0 1024 896" xmlns="http://www.w3.org/2000/svg">
								<path fillRule="evenodd" fill="#ccc" d="M128 768h256v64H128v-64z m320-384H128v64h320v-64z m128 192V448L384 640l192 192V704h320V576H576z m-288-64H128v64h160v-64zM128 704h160v-64H128v64z m576 64h64v128c-1 18-7 33-19 45s-27 18-45 19H64c-35 0-64-29-64-64V192c0-35 29-64 64-64h192C256 57 313 0 384 0s128 57 128 128h192c35 0 64 29 64 64v320h-64V320H64v576h640V768zM128 256h512c0-35-29-64-64-64h-64c-35 0-64-29-64-64s-29-64-64-64-64 29-64 64-29 64-64 64h-64c-35 0-64 29-64 64z" />
							</svg>
						</button>
					</div>
				</div>
				<textarea
					readOnly={true}
					ref={this.field}
					style={{ left: '-9999px', position: 'absolute' }}
					value={code} />
			</>
		);
	}
}
