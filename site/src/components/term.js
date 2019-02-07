import React from 'react'
import { Terminal } from 'xterm';
import 'xterm/dist/xterm.css';
import * as fit from 'xterm/lib/addons/fit/fit';

Terminal.applyAddon(fit);

export default class Term extends React.Component {
	container = React.createRef();

	componentDidMount() {
		const term = this.term = new Terminal({
			fontFamily: 'Menlo, Monaco, "Courier New", monospace',
			fontSize: 12,
			theme: {
				background: '#1e1e1e'
			}
		});
		term.open(this.container.current);
		term.fit();
		term.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ')
	}

	componentWillUnmount() {
		if (this.term) {
			this.term.destroy();
			this.term = null;
		}
	}

	render() {
		const { className, width, height } = this.props;
		const style = { width, height };

		return <div className={className} ref={this.container} style={style} />;
	}
};
