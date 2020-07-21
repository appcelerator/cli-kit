import snooplogg from 'snooplogg';

const { chalk } = snooplogg;

export const logger = snooplogg
	.config({
		inspectOptions: {
			colors: true,
			depth: 7
		},
		maxBrightness: 210,
		minBrightness: 80,
		theme: 'detailed'
	})
	.style('heading', s => String(s).toUpperCase())
	.style('subheading', s => chalk.gray(s));

export default logger;
