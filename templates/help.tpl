if (error) {
	>>> !!!${error}!!!
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
