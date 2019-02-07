import React from 'react'
import MonacoEditor from 'react-monaco-editor/lib/index';
import Term from '../components/term';
import styles from '../css/demo.module.scss';
import defaultCode from '../resources/demo.txt';

export default class Demo extends React.Component {
	state = {
		code: defaultCode,
		changed: false
	};

	editorDidMount(editor) {
		editor.onDidBlurEditorWidget(() => {
			if (this.state.changed) {
				this.setState({ changed: false });

				console.log('COMPILING');
				console.log(this.state.code);
			}
		});
	}

	onChange(code) {
		this.setState({ code, changed: true });
	}

	reset() {
		this.setState({ code: defaultCode, changed: true });
	}

	render() {
		return (
			<div className={styles.demo}>
				<header className={styles.tab}>
					<span>Terminal</span>
				</header>
				<header className={styles.tab}>
					<span>Code</span>
					<button className={styles.reset} onClick={::this.reset}>Reset</button>
				</header>
				<div className={styles.term}>
					<Term width="100%" height="100%" />
				</div>
				<div className={styles.editor}>
					<MonacoEditor
						language="javascript"
						editorDidMount={::this.editorDidMount}
						onChange={::this.onChange}
						options={{ minimap: { enabled: false } }}
						theme="vs-dark"
						value={this.state.code} />
				</div>
			</div>
		);
	}
}
