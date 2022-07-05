if (error) {
	const x = process.platform === 'win32' ? 'x' : '✖';
	>> ${style.error(`${x} ${error.message}`)}
	if (error.code === 'ERR_MISSING_REQUIRED_OPTION') {
		for (const option of error.meta.required) {
			>>|  ${style.highlight(option.format)}  ${option.desc || ''}
		}
	}
	>>
}

if (suggestions.length) {
	>> Did you mean?
	for (const s of suggestions) {
		>>|  ${style.highlight(s.name)}${s.desc ? ' - ' + s.desc : ''}
	}
	>>
}

if (Array.isArray(warnings) && warnings.length) {
	for (const warning of warnings) {
		>> ${style.warn(warning.message)}
	}
	>>
}

if (header) {
	>>>? ${header}
} else {
	>>>? ${desc || ''}
}

if (usage) {
	>>> ${style.heading(usage.title)}: ${style.highlight(usage.text)}
}

const maxcmd = commands.entries.reduce((p, cmd) => Math.max(p, cmd.label.length), 0);
const maxarg = arguments.entries.reduce((p, arg) => Math.max(p, arg.name.length + (arg.multiple ? 3 : 0)), 0);
const maxopt = options.scopes.reduce((p, scope) => Math.max(p, Object.values(scope.groups).reduce((p, opts) => Math.max(p, opts.reduce((p, opt) => Math.max(p, opt.label.length), 0)), 0)), 0);
const maxlen = Math.max(maxcmd, maxarg, maxopt);

if (commands.count) {
	>> ${style.heading(commands.title)}:
	for (const cmd of commands.entries) {
		>>|  ${style.highlight(cmd.label.padEnd(maxlen))}  ${cmd.desc || ''}
	}
	>>
}

if (arguments.count) {
	>> ${style.heading(arguments.title)}:
	for (const arg of arguments.entries) {
		>>|  ${style.highlight(`${arg.name}${arg.multiple ? '...' : ''}`.padEnd(maxlen))}  ${arg.desc || ''}
	}
	>>
}

if (options.count) {
	for (const scope of options.scopes) {
		if (scope.count) {
			>>|${style.heading(`${scope.title}:`)}

			for (const [ group, options ] of Object.entries(scope.groups)) {
				if (group) {
					>>|${style.subheading(`${group}:`)}
				}
				for (const option of options) {
					>>|  ${style.highlight(option.label.padEnd(maxlen))}  ${option.desc || ''}
				}
			}
			>>
		}
	}
}

if (footer) {
	>>> ${footer}
}
