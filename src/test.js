import CLI from './index';

new CLI({
	commands: {
		start: {
			options: {
				'--debug': { desc: 'don\'t run as a background daemon' }
			},
			action({ argv }) {
				console.log('starting server');
				console.log(argv);

				return new Promise(resolve => {
					setTimeout(() => {
						console.log('server started');
						resolve();
					}, 1000);
				});
			}
		},
		stop: {
			options: {
				'--force': { desc: 'force the daemon to stop' }
			},
			action({ argv }) {
				console.log('stopping server');
				console.log(argv);

				return new Promise(resolve => {
					setTimeout(() => {
						console.log('server stopped');
						resolve();
					}, 1000);
				});
			}
		},
		restart: {
			options: {
				'--debug': { desc: 'don\'t run as a background daemon' }
			},
			action({ argv }) {
				console.log('restarting server');
				console.log(argv);

				return new Promise(resolve => {
					setTimeout(() => {
						console.log('server restarted');
						resolve();
					}, 1000);
				});
			}
		},
		config: {
			options: {
				'--subscribe': { desc: 'request a subscription' }
			},
			args: [
				{ name: 'path', required: true, regex: /^\//, desc: 'the path to request' },
				{ name: 'json', type: 'json', desc: 'an option JSON payload to send' }
			],
			action({ argv, _ }) {
				console.log('CONFIG!');
				console.log(argv);
				console.log(_);
			}
		},
		exec: {
			options: {
				'--subscribe': { desc: 'request a subscription' }
			},
			args: [
				{ name: 'path', required: true, regex: /^\//, desc: 'the path to request' },
				{ name: 'json', type: 'json', desc: 'an option JSON payload to send' }
			],
			action({ argv, _ }) {
				console.log('EXEC!');
				console.log(argv);
				console.log(_);
			}
		},
		logcat: {
			options: {
				'--no-colors': { desc: 'disables colors' }
			},
			action({ argv }) {
				console.log('LOGCAT!');
				console.log(argv);
			}
		},
		status: {
			options: {
				'--json': { desc: 'outputs the status as JSON' }
			},
			action({ argv }) {
				console.log('STATUS!');
				console.log(argv);
			}
		},
		help2: {
			action() {
				console.log('CUSTOM HELP!');
			}
		}
	},
	options: {
		'--config <json>':      { type: 'json', desc: 'serialized JSON string to mix into the appcd config' },
		'--config-file <file>': { type: 'file', desc: 'path to a appcd JS config file' },
		'-v, --version':        { desc: 'outputs the appcd version' }
	}
	// help: true
	// default: 'start'
}).exec()
	.then(() => {
		console.log('done');
	})
	.catch(console.error);
