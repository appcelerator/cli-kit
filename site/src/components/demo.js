import React, { PureComponent } from 'react'
// import MonacoEditor from 'react-monaco-editor/lib/index';
import Term from '../components/term';
import styles from '../css/demo.module.scss';
import examples from '../../content/examples';
import { Dropdown, Icon, Popup } from 'semantic-ui-react';

/*
<MonacoEditor
						language="javascript"
						editorDidMount={::this.editorDidMount}
						onChange={::this.onCodeChange}
						options={{ minimap: { enabled: false } }}
						theme="vs-dark"
						value={this.state.code} />
						*/

const listing = Object.keys(examples).map(value => ({
	text: `${value} Example`,
	value
}));

export default class Demo extends PureComponent {
	state = {
		code: examples[listing[0].value],
		changed: false,
		compile: true,
		example: listing[0].value
	};

	componentWillUpdate(props, state) {
		if (state.changed && state.compile) {
			this.setState({ changed: false, compile: false });
			console.log('COMPILING');
			console.log(state.code);
		}
	}

	editorDidMount(editor) {
		editor.onDidBlurEditorWidget(() => this.setState({ compile: true }));
	}

	onCodeChange(code) {
		this.setState({ code, changed: true, compile: false });
	}

	onExampleChange(e, { value }) {
		this.setState({ code: examples[value], changed: true, compile: true, example: value });
	}

	reset() {
		this.setState({ code: examples[this.state.example], changed: true, compile: true });
	}

	render() {
		return (
			<div className={styles.demo}>
				<header>
					<span className={styles.tab}>Terminal</span>
				</header>
				<header>
					<span className={styles.tab}>Code</span>
					<Dropdown
						pointing floating inline
						options={listing}
						onChange={::this.onExampleChange}
						defaultValue={this.state.example} />
					<Popup
						position='top center'
						trigger={<Icon name="undo alternate" onClick={::this.reset} />}
						content='Reset example' />
				</header>
				<div className={styles.term}>
					<Term width="100%" height="100%" />
				</div>
				<div className={styles.editor}>
					editor goes here
				</div>
			</div>
		);
	}
}
