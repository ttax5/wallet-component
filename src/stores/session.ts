import { writable } from 'svelte/store';
import type { UserSession, GoogleUser, StellarAccount } from '../types';

const defaultSession: UserSession = {
	isAuthenticated: false,
	method: 'developer',
	stellarAccount: { pubKey: '', privKey: '' }
};

const getStoredSession = (): UserSession => {
	try {
		const stored = localStorage.getItem('paxapos_session');
		if (stored) {
			const parsed = JSON.parse(stored);
			// Asegurar que coincida con las claves globales de Stellar de la app original
			if (parsed.stellarAccount?.pubKey) {
				localStorage.setItem('addr', parsed.stellarAccount.pubKey);
			}
			if (parsed.stellarAccount?.privKey) {
				localStorage.setItem('priv', parsed.stellarAccount.privKey);
			}
			return parsed;
		}
	} catch (e) {
		console.error("Error al cargar la sesión", e);
	}
	
	// Fallback a las variables globales tradicionales si existen
	const addr = localStorage.getItem('addr') || '';
	const priv = localStorage.getItem('priv') || '';
	if (addr && priv) {
		return {
			isAuthenticated: true,
			method: 'developer',
			stellarAccount: { pubKey: addr, privKey: priv }
		};
	}
	
	return defaultSession;
};

export const session = writable<UserSession>(getStoredSession());

// Guardar en localStorage al cambiar
session.subscribe(value => {
	try {
		localStorage.setItem('paxapos_session', JSON.stringify(value));
		if (value.isAuthenticated && value.stellarAccount) {
			localStorage.setItem('addr', value.stellarAccount.pubKey);
			localStorage.setItem('priv', value.stellarAccount.privKey);
		} else {
			localStorage.removeItem('paxapos_session');
			localStorage.removeItem('addr');
			localStorage.removeItem('priv');
		}
	} catch (e) {
		console.error("Error al persistir sesión", e);
	}
});

export function loginGoogle(googleUser: GoogleUser, stellarAccount: StellarAccount) {
	session.set({
		isAuthenticated: true,
		method: 'google',
		googleUser,
		stellarAccount
	});
}

export function loginDeveloper(stellarAccount: StellarAccount) {
	session.set({
		isAuthenticated: true,
		method: 'developer',
		stellarAccount
	});
}

export function logout() {
	session.set(defaultSession);
}
