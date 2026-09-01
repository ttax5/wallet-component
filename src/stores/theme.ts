import { writable } from 'svelte/store';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'paxapos-theme';

function getInitialTheme(): ThemeMode {
	if (typeof window === 'undefined') {
		return 'dark';
	}

	const savedTheme = window.localStorage.getItem(STORAGE_KEY);
	if (savedTheme === 'light' || savedTheme === 'dark') {
		return savedTheme;
	}

	return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export const theme = writable<ThemeMode>(getInitialTheme());

export function toggleTheme() {
	theme.update(current => current === 'dark' ? 'light' : 'dark');
}

if (typeof window !== 'undefined') {
	theme.subscribe(value => {
		document.documentElement.dataset.theme = value;
		document.documentElement.classList.toggle('dark', value === 'dark');
		window.localStorage.setItem(STORAGE_KEY, value);
	});
}
