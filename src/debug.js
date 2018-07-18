import snooplogg from 'snooplogg';

export const logger = snooplogg.config({
	minBrightness: 80,
	maxBrightness: 210,
	theme: 'detailed'
});

export default logger;

export const { pluralize } = snooplogg;
