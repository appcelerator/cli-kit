process.env.NO_UPDATE_NOTIFIER = '1';

const spawnSync = require('child_process').spawnSync;
const sections = {}
const section = name => (sections[name] = new Map());

const packages = {
	'cli-kit': {},
	caporal: {
		title: 'Caporal.js'
	},
	commander: {
		title: 'Commander.js'
	},
	dashdash: {},
	fields: {},
	inquirer: {},
	meow: {},
	minimist: {},
	mri: {},
	oclif: {},
	prompt: {},
	promptly: {},
	prompts: {},
	yargs: {}
};

// populate info from npm
for (const name of Object.keys(packages)) {
	const { status, stdout, stderr } = spawnSync('npm', [ 'view', name, '--json' ]);
	if (status) {
		console.error(`Failed to get npm info for "${name}" (code ${status}):`);
		console.error(stderr.toString().trim());
		process.exit(1);
	}

	let json;
	try {
		json = JSON.parse(stdout.toString());
	} catch (e) {
		console.error(`Unable to JSON parse npm info for "${name}":`);
		console.error(e);
		process.exit(1);
	}

	packages[name].version = json.version;
	packages[name].url = `https://npmjs.com/package/${name}`;
	packages[name].time = new Date(json.time[json.version]);
	packages[name].fresh = (new Date() - packages[name].time) < (365 * 24 * 60 * 60 * 1000);
}

const months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];

section('General')
	.set('Version', Object.keys(packages).reduce((obj, name) => {
		obj[name] = packages[name].version;
		return obj;
	}, {}))
	.set('Actively maintained <br> (within last year)', Object.keys(packages).reduce((obj, name) => {
		const { fresh, time } = packages[name];
		obj[name] = { value: fresh || 'warn' };
		if (!fresh) {
			obj[name].text = `<br>Last release ${months[time.getMonth() + 1]} ${time.getFullYear()}`;
		}
		return obj;
	}, {}))
	.set('License', {
		'cli-kit': 'MIT',
		caporal: 'MIT',
		commander: 'MIT',
		dashdash: 'MIT',
		fields: 'MIT',
		inquirer: 'MIT',
		meow: 'MIT',
		minimist: 'MIT',
		mri: 'MIT',
		oclif: 'MIT',
		prompt: 'MIT',
		promptly: 'MIT',
		prompts: 'MIT',
		yargs: 'MIT'
	})
	.set('Language', {
		'cli-kit': 'JavaScript',
		caporal: 'JavaScript',
		commander: 'JavaScript',
		dashdash: 'JavaScript',
		fields: 'JavaScript',
		inquirer: 'JavaScript',
		meow: 'JavaScript',
		minimist: 'JavaScript',
		mri: 'JavaScript',
		oclif: 'TypeScript',
		prompt: 'JavaScript',
		promptly: 'JavaScript',
		prompts: 'JavaScript',
		yargs: 'JavaScript'
	})
	.set('Async/promise support', {
		'cli-kit': true,
		caporal: {
			value: true,
			note: 'Command actions only. The actually parsing is sync.'
		},
		commander: false,
		dashdash: false,
		fields: false,
		inquirer: true,
		meow: false,
		minimist: false,
		mri: false,
		oclif: {
			value: true,
			note: 'Command actions only. The actually parsing is sync.'
		},
		prompt: false,
		promptly: true,
		prompts: true,
		yargs: false
	})
	.set('Data type coercion', {
		'cli-kit': true,
		caporal: true,
		commander: true,
		dashdash: true,
		fields: false,
		inquirer: false,
		meow: true,
		minimist: true,
		mri: true,
		oclif: true,
		prompt: false,
		promptly: false,
		prompts: true,
		yargs: true
	})
	.set('User-defined input/output stream', {
		'cli-kit': true,
		caporal: false,
		commander: false,
		dashdash: false,
		fields: null,
		inquirer: true,
		meow: false,
		minimist: false,
		mri: false,
		oclif: false,
		prompt: true,
		promptly: true,
		prompts: true,
		yargs: false
	});

section('Parsing')
	.set('Command', {
		'cli-kit': true,
		caporal: true,
		commander: true,
		dashdash: false,
		fields: null,
		inquirer: null,
		meow: false,
		minimist: false,
		mri: false,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: true
	})
	.set('Command aliases', {
		'cli-kit': true,
		caporal: true,
		commander: true,
		dashdash: false,
		fields: null,
		inquirer: null,
		meow: false,
		minimist: false,
		mri: false,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: true
	})
	.set('Subcommands', {
		'cli-kit': true,
		caporal: {
			value: 'warn',
			note: 'Requires reparsing with subcommand context or manually subprocessing.'
		},
		commander: {
			value: 'warn',
			note: 'Automatically spawns subcommand in new process, otherwise requires reparsing with subcommand context.'
		},
		dashdash: false,
		fields: null,
		inquirer: null,
		meow: false,
		minimist: false,
		mri: false,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: {
			value: 'warn',
			note: 'Requires reparsing with subcommand context or manually subprocessing.'
		}
	})
	.set('Options', {
		'cli-kit': true,
		caporal: true,
		commander: true,
		dashdash: true,
		fields: null,
		inquirer: null,
		meow: true,
		minimist: true,
		mri: true,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: true
	})
	.set('Options aliases', {
		'cli-kit': true,
		caporal: false,
		commander: false,
		dashdash: true,
		fields: null,
		inquirer: null,
		meow: true,
		minimist: true,
		mri: true,
		oclif: false,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: true
	})
	.set('Custom option validator', {
		'cli-kit': true,
		caporal: true,
		commander: true,
		dashdash: false,
		fields: null,
		inquirer: null,
		meow: false,
		minimist: false,
		mri: false,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: {
			value: false,
			note: 'Only the last parsed invalid option error is raised.'
		}
	})
	.set('Flags (true/false)', {
		'cli-kit': true,
		caporal: false,
		commander: true,
		dashdash: true,
		fields: null,
		inquirer: null,
		meow: true,
		minimist: true,
		mri: true,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: true
	})
	.set('Flag negation (`--no-<name>`)', {
		'cli-kit': true,
		caporal: false,
		commander: true,
		dashdash: false,
		fields: null,
		inquirer: null,
		meow: true,
		minimist: true,
		mri: true,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: true
	})
	.set('Argument support', {
		'cli-kit': true,
		caporal: true,
		commander: true,
		dashdash: true,
		fields: null,
		inquirer: null,
		meow: true,
		minimist: true,
		mri: true,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: true
	})
	.set('Custom argument validator', {
		'cli-kit': true,
		caporal: true,
		commander: true,
		dashdash: false,
		fields: null,
		inquirer: null,
		meow: false,
		minimist: false,
		mri: false,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: true
	})
	.set('Stop parsing `--`', {
		'cli-kit': true,
		caporal: true,
		commander: true,
		dashdash: true,
		fields: null,
		inquirer: null,
		meow: true,
		minimist: true,
		mri: true,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: true
	})
	.set('Default option/argument values', {
		'cli-kit': true,
		caporal: true,
		commander: true,
		dashdash: true,
		fields: null,
		inquirer: null,
		meow: true,
		minimist: true,
		mri: true,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: true
	})
	.set('Environment variable support', {
		'cli-kit': true,
		caporal: false,
		commander: false,
		dashdash: true,
		fields: null,
		inquirer: null,
		meow: false,
		minimist: false,
		mri: false,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: {
			value: true,
			note: 'Custom environment variable names are not supported. The names must match a prefixed option name.'
		}
	})
	.set('Auto-generated help screen', {
		'cli-kit': true,
		caporal: true,
		commander: true,
		dashdash: {
			value: true,
			note: 'Options only. (e.g no usage, etc)'
		},
		fields: null,
		inquirer: null,
		meow: true,
		minimist: false,
		mri: false,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: true
	})
	.set('Custom help exit code', {
		'cli-kit': true,
		caporal: false,
		commander: false,
		dashdash: false,
		fields: null,
		inquirer: null,
		meow: true,
		minimist: false,
		mri: false,
		oclif: false,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: false
	});

section('Prompting')
	.set('Single-line text prompting', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: true,
		inquirer: true,
		meow: null,
		minimist: null,
		mri: null,
		oclif: true,
		prompt: true,
		promptly: true,
		prompts: true,
		yargs: null
	})
	.set('Multi-line text prompting', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: false,
		inquirer: false,
		meow: null,
		minimist: null,
		mri: null,
		oclif: false,
		prompt: false,
		promptly: false,
		prompts: false,
		yargs: null
	})
	.set('Password prompting', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: true,
		inquirer: true,
		meow: null,
		minimist: null,
		mri: null,
		oclif: true,
		prompt: true,
		promptly: true,
		prompts: true,
		yargs: null
	})
	.set('Confirm (yes/no) prompting', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: {
			value: true,
			note: 'Via select list input type.'
		},
		inquirer: true,
		meow: null,
		minimist: null,
		mri: null,
		oclif: true,
		prompt: true,
		promptly: true,
		prompts: true,
		yargs: null
	})
	.set('Press any key to continue prompting', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: false,
		inquirer: false,
		meow: null,
		minimist: null,
		mri: null,
		oclif: true,
		prompt: false,
		promptly: true,
		prompts: false,
		yargs: null
	})
	.set('Inline list prompting', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: {
			value: true,
			note: 'Via select list input type.'
		},
		inquirer: {
			value: true,
			note: 'Via expand input type.'
		},
		meow: null,
		minimist: null,
		mri: null,
		oclif: false,
		prompt: false,
		promptly: false,
		prompts: {
			value: true,
			note: 'Maximum 2 options via toggle input type.'
		},
		yargs: null
	})
	.set('Numbered select list prompting', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: true,
		inquirer: true,
		meow: null,
		minimist: null,
		mri: null,
		oclif: false,
		prompt: false,
		promptly: false,
		prompts: false,
		yargs: null
	})
	.set('Scrollable select list prompting', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: false,
		inquirer: true,
		meow: null,
		minimist: null,
		mri: null,
		oclif: false,
		prompt: false,
		promptly: false,
		prompts: true,
		yargs: null
	})
	.set('Multi-select/checkbox list prompting', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: false,
		inquirer: true,
		meow: null,
		minimist: null,
		mri: null,
		oclif: false,
		prompt: false,
		promptly: false,
		prompts: true,
		yargs: null
	})
	.set('File/directory prompting', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: true,
		inquirer: {
			value: true,
			note: 'Via [inquirer-fuzzy-path](https://www.npmjs.com/package/inquirer-fuzzy-path).'
		},
		meow: null,
		minimist: null,
		mri: null,
		oclif: false,
		prompt: false,
		promptly: false,
		prompts: false,
		yargs: null
	})
	.set('Multiple prompt chaining', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: true,
		inquirer: true,
		meow: null,
		minimist: null,
		mri: null,
		oclif: false,
		prompt: false,
		promptly: false,
		prompts: true,
		yargs: null
	})
	.set('External editor support', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: false,
		inquirer: true,
		meow: null,
		minimist: null,
		mri: null,
		oclif: false,
		prompt: false,
		promptly: false,
		prompts: false,
		yargs: null
	})
	.set('Custom value formatter/transformer', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: {
			value: true,
			note: 'Via validator callback.'
		},
		inquirer: {
			value: true,
			note: 'Via filter callback.'
		},
		meow: null,
		minimist: null,
		mri: null,
		oclif: false,
		prompt: {
			value: true,
			note: 'Via `before()` callback.'
		},
		promptly: {
			value: true,
			note: 'Via validator callback.'
		},
		prompts: true,
		yargs: null
	})
	.set('Custom validation', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: false,
		inquirer: true,
		meow: null,
		minimist: null,
		mri: null,
		oclif: false,
		prompt: true,
		promptly: true,
		prompts: true,
		yargs: null
	})
	.set('Default prompt values', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: true,
		inquirer: true,
		meow: null,
		minimist: null,
		mri: null,
		oclif: true,
		prompt: true,
		promptly: true,
		prompts: true,
		yargs: null
	})
	.set('Prompt history', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: true,
		inquirer: true,
		meow: null,
		minimist: null,
		mri: null,
		oclif: false,
		prompt: true,
		promptly: false,
		prompts: false,
		yargs: null
	})
	.set('Auto-suggest mismatch', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: true,
		inquirer: {
			value: true,
			note: 'Via [inquirer-prompt-suggest](https://www.npmjs.com/package/inquirer-prompt-suggest).'
		},
		meow: null,
		minimist: null,
		mri: null,
		oclif: false,
		prompt: true,
		promptly: false,
		prompts: false,
		yargs: null
	})
	.set('Autocomplete', {
		'cli-kit': undefined,
		caporal: null,
		commander: null,
		dashdash: null,
		fields: true,
		inquirer: true,
		meow: null,
		minimist: null,
		mri: null,
		oclif: false,
		prompt: false,
		promptly: false,
		prompts: true,
		yargs: null
	});

section('Logging')
	.set('Application logging', {
		'cli-kit': true,
		caporal: {
			value: true,
			note: 'Via [winston](https://npmjs.com/package/winston).'
		},
		commander: null,
		dashdash: null,
		fields: null,
		inquirer: null,
		meow: null,
		minimist: null,
		mri: null,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: null
	})
	.set('Application debug logging', {
		'cli-kit': {
			value: true,
			note: 'Uses [snooplogg](https://npmjs.com/package/snooplogg).'
		},
		caporal: false,
		commander: null,
		dashdash: null,
		fields: null,
		inquirer: null,
		meow: true,
		minimist: null,
		mri: false,
		oclif: false,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: null
	})
	.set('Internal debug logging', {
		'cli-kit': true,
		caporal: false,
		commander: null,
		dashdash: null,
		fields: null,
		inquirer: null,
		meow: null,
		minimist: null,
		mri: null,
		oclif: {
			value: true,
			note: 'Uses [debug](https://npmjs.com/package/debug).'
		},
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: null
	});

section('Misc')
	.set('Dedicated website', {
		'cli-kit': true,
		caporal: false,
		commander: false,
		dashdash: false,
		fields: false,
		inquirer: false,
		meow: false,
		minimist: false,
		mri: false,
		oclif: true,
		prompt: false,
		promptly: false,
		prompts: false,
		yargs: true
	})
	.set('External CLI extensions', {
		'cli-kit': true,
		caporal: false,
		commander: false,
		dashdash: false,
		fields: null,
		inquirer: null,
		meow: true,
		minimist: false,
		mri: false,
		oclif: true,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: false
	})
	.set('Internal hook system', {
		'cli-kit': true,
		caporal: false,
		commander: false,
		dashdash: false,
		fields: false,
		inquirer: false,
		meow: false,
		minimist: false,
		mri: false,
		oclif: true,
		prompt: false,
		promptly: false,
		prompts: false,
		yargs: false
	})
	.set('Bash completion', {
		'cli-kit': 'Planned',
		caporal: true,
		commander: false,
		dashdash: true,
		fields: null,
		inquirer: null,
		meow: false,
		minimist: false,
		mri: false,
		oclif: false,
		prompt: null,
		promptly: null,
		prompts: null,
		yargs: false
	})
	.set('REPL', {
		'cli-kit': 'Planned',
		caporal: false,
		commander: false,
		dashdash: false,
		fields: false,
		inquirer: false,
		meow: false,
		minimist: false,
		mri: false,
		oclif: false,
		prompt: false,
		promptly: false,
		prompts: false,
		yargs: false
	})
	.set('Built-in i18n support', {
		'cli-kit': 'Planned',
		caporal: false,
		commander: false,
		dashdash: false,
		fields: true,
		inquirer: false,
		meow: false,
		minimist: false,
		mri: false,
		oclif: false,
		prompt: false,
		promptly: false,
		prompts: false,
		yargs: false
	});

// console.log(packages);
// console.log(sections);

// PRINT THE TABLE

const packageHeader = `<tr><th></th>${Object.keys(packages).map(n => `<th scope="col" style="white-space:nowrap;"><a href="${packages[n].url}">${packages[n].title || n}</a></th>`).join('')}</tr>`;
const sectionHeader = name => `<thead><tr><th colspan="${Object.keys(packages).length + 1}" style="text-align:left;"><small>${name}</small></th></tr></thead>\n`;

console.log('\n<table>\n');

const notes = [];

for (const [ sec, map ] of Object.entries(sections)) {
	console.log(`<thead>${packageHeader}</thead>\n`);
	console.log(sectionHeader(sec));
	console.log('<tbody>');

	for (const [ feature, pkgs ] of map.entries()) {
		let row = `<tr><td>${feature}</td>`;

		for (const name of Object.keys(packages)) {
			const value = pkgs ? pkgs[name] : undefined;
			if (value === undefined) {
				row += '<td>?</td>';
			} else if (value === null) {
				row += '<td>n/a</td>';
			} else if (value === true) {
				row += '<td>:white_check_mark:</td>';
			} else if (value === 'warn') {
				row += '<td>:warning:</td>';
			} else if (value === false) {
				row += '<td>:x:</td>';
			} else if (typeof value === 'object') {
				if (value.value === true) {
					value.value = ':white_check_mark:';
				} else if (value.value === false) {
					value.value = ':x:';
				} else if (value.value === 'warn') {
					value.value = ':warning:';
				}
				if (value.note) {
					let p = notes.indexOf(value.note);
					if (p === -1) {
						p = notes.length;
						notes.push(value.note);
					}
					row += `<td>${value.value} <sub>${p + 1}</sub></td>`;
				} else if (value.value !== undefined) {
					row += `<td>${value.value}${value.text || ''}</td>`;
				} else {
					row += `<td>??</td>`;
				}
			} else {
				row += `<td>${value}</td>`;
			}
		}

		console.log(row + '</tr>');
	}

	console.log('</tbody>\n');
}

console.log('</table>\n');

notes.forEach((note, i) => {
	console.log(`<small>${i + 1}. ${note}</small><br>`);
});
console.log();
