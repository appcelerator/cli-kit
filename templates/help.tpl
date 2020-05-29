if (error) {
	>> ${style.alert(error.message)}
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
		>>> ${warning.message}
	}
}

if (header) {
	>>>? ${header}
} else {
	>>>? ${desc || ''}
}

if (usage) {
	>>> ${style.heading(usage.title)}: ${style.highlight(usage.text)}
}

if (commands.count) {
	>> ${style.heading(commands.title)}:
	for (const cmd of commands.entries) {
		>>|  ${style.highlight(cmd.label)}  ${cmd.desc || ''}
	}
	>>
}

if (arguments.count) {
	>> ${style.heading(arguments.title)}:
	for (const arg of arguments.entries) {
		>>|  ${style.highlight(arg.name)}${arg.multiple ? style.highlight('...') : ''}  ${arg.desc || ''}
	}
	>>
}

if (options.count) {
	for (const scope of options.scopes) {
		if (scope.count) {
			>> ${style.heading(scope.title)}:
			for (const [ group, options ] of Object.entries(scope.groups)) {
				if (group) {
					>> ${style.lowlight(group)}
				}
				for (const option of options) {
					let s = '';
					if (option.short) {
						s += `-${option.short}, `;
					}
					s += `--${option.negate ? 'no-' : ''}${option.long}${option.isFlag ? '' : ('=<' + (option.hint || 'value') + '>')}`;
					>>|  ${style.highlight(s)}  ${option.desc || ''}
				}
			}
			>>
		}
	}
}

if (footer) {
	>>> ${footer}
}
