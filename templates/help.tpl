if (error) {
	>> ::: error
	>> ${error.message}
	>>> :::
}

if (suggestions.length) {
	>> Did you mean?
	for (const s of suggestions) {
		>>|  ==${s.name}== - ${s.desc}
	}
	>>
}

if (Array.isArray(warnings) && warnings.length) {
	for (const warning of warnings) {
		>> ::: warning
		>> ${warning.message}
		>>> :::
	}
}

if (usage) {
	>>> # ==${usage.title}:== ${usage.text}
}

>>>? ${desc}

if (commands.count) {
	>> # ==${commands.title}:==
	for (const cmd of commands.entries) {
		>>|| ${cmd.name} | ${cmd.desc} |
	}
	>>
}

if (arguments.count) {
	>> # ==${arguments.title}:==
	for (const arg of arguments.entries) {
		>>|| ${arg.name}${arg.multiple ? '...' : ''} | ${arg.desc} |
	}
	>>
}

if (options.count) {
	for (const scope of options.scopes) {
		if (scope.count) {
			>> # ==${scope.title}:==
			for (const [ group, options ] of Object.entries(scope.groups)) {
				if (group) {
					>> ## ${group}
				}
				for (const option of options) {
					if (option.short) {
						> | -${option.short},
					} else {
						> |
					}
					>>| | --${option.long} | ${option.desc} |
				}
			}
			>>
		}
	}
}
