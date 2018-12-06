if (error) {
	>> ${error.message}
	if (error.code === 'ERR_MISSING_REQUIRED_OPTION') {
		for (const option of error.meta.required) {
			>>|  ${option.format}  ${option.desc}
		}
	}
	>>
}

if (suggestions.length) {
	>> Did you mean?
	for (const s of suggestions) {
		>>|  ${s.name}  ${s.desc ? ' - ' + s.desc : ''}
	}
	>>
}

if (Array.isArray(warnings) && warnings.length) {
	for (const warning of warnings) {
		>>> ${warning.message}
	}
}

if (usage) {
	>>> ${usage.title.toUpperCase()}: ${usage.text}
}

>>>? ${desc || ''}

if (commands.count) {
	>> ${commands.title.toUpperCase()}:
	for (const cmd of commands.entries) {
		>>|  ${cmd.name}  ${cmd.desc || ''}
	}
	>>
}

if (arguments.count) {
	>> ${arguments.title.toUpperCase()}:
	for (const arg of arguments.entries) {
		>>|  ${arg.name}${arg.multiple ? '...' : ''}  ${arg.desc || ''}
	}
	>>
}

if (options.count) {
	for (const scope of options.scopes) {
		if (scope.count) {
			>> ${scope.title.toUpperCase()}:
			for (const [ group, options ] of Object.entries(scope.groups)) {
				if (group) {
					>> ${group}
				}
				for (const option of options) {
					let s = '';
					if (option.short) {
						s += `-${option.short},`;
					}
					>>|  ${s}--${option.long}${option.isFlag ? '' : ('=<' + (option.hint || 'value') + '>')}  ${option.desc || ''}
				}
			}
			>>
		}
	}
}
