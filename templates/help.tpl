if (error) {
	>> ${error}
}

if (usage) {
	>> ${usage.title}: ${usage.text}
}

>>?desc

if (commands.count) {
	>> Commands:
}
