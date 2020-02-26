import React, { PureComponent } from 'react'
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
// import { AttachAddon } from 'xterm-addon-attach';
import { FitAddon } from 'xterm-addon-fit';

class AttachAddon {
	constructor() {
		this.ws = new WebSocket('ws://localhost:12345');
		this.ws.binaryType = 'arraybuffer';
		this.disposables = [];
	}

	activate(term) {
		this.disposables.push(
			this.addListener('message', evt => {
				console.log(evt);
				const { data } = evt;
				term.write(typeof data === 'string' ? data : new Uint8Array(data));
			}),
			this.addListener('close', () => this.dispose()),
			this.addListener('error', () => this.dispose()),
			term.onData(data => this.sendData(data)),
			term.onBinary(data => this.sendBinary(data))
		);
	}

	addListener(type, handler) {
		this.ws.addEventListener(type, handler);
		return {
			dispose: () => this.ws.removeEventListener(type, handler)
		};
	}

	dispose() {
		this.disposables.forEach(d => d.dispose());
	}

	sendBinary(data) {
		console.log('BINARY', data);
		if (this.ws.readyState === 1) {
			const buffer = new Uint8Array(data.length);
			for (let i = 0; i < data.length; i++) {
				buffer[i] = data.charCodeAt(i) & 255;
			}
			this.ws.send(buffer);
		}
	}

	sendData(data) {
		console.log('DATA', data);
		if (this.ws.readyState === 1) {
			this.ws.send(data);
		}
	}
}

export default class Term extends PureComponent {
	container = React.createRef();

	componentDidMount() {
		const term = this.term = new Terminal({
			fontFamily: 'Menlo, Monaco, "Courier New", monospace',
			fontSize: 12,
			theme: {
				background: '#1e1e1e'
			}
		});

		// const ws = new WebSocket('ws://localhost:12345');
		const attachAddon = new AttachAddon(); // ws);
		const fitAddon = new FitAddon();

		term.loadAddon(attachAddon);
		term.loadAddon(fitAddon);

		term.open(this.container.current);

		fitAddon.fit();

		console.log(term.rows, term.cols);

		// term.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ')
	}

	componentWillUnmount() {
		if (this.term) {
			this.term.dispose();
			this.term = null;
		}
	}

	render() {
		const { className, width, height } = this.props;
		const style = { width, height };

		return <div className={className} ref={this.container} style={style} />;
	}
};
