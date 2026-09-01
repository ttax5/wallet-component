export function getRequiredEnv(name: string): string {
	const value = import.meta.env[name];

	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

export function getOptionalEnv(name: string): string | undefined {
	const value = import.meta.env[name];

	if (typeof value !== 'string' || value.trim() === '') {
		return undefined;
	}

	return value;
}
