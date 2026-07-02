import { writable, derived } from 'svelte/store';
import type { AppNotification } from '../types';
import { session } from './session';

export const notifications = writable<AppNotification[]>([]);

let currentPubKey = '';

// Suscribirse al store de sesión para cargar/limpiar notificaciones reactivamente por usuario
session.subscribe($session => {
	const pubKey = $session.isAuthenticated && $session.stellarAccount?.pubKey 
		? $session.stellarAccount.pubKey 
		: '';

	if (pubKey !== currentPubKey) {
		currentPubKey = pubKey;
		if (pubKey) {
			try {
				const stored = localStorage.getItem(`paxapos_notifications_${pubKey}`);
				if (stored) {
					const parsed = JSON.parse(stored);
					notifications.set(parsed.map((n: any) => ({
						...n,
						timestamp: new Date(n.timestamp)
					})));
				} else {
					notifications.set([]);
				}
			} catch (e) {
				console.error('Error al cargar notificaciones para el usuario', e);
				notifications.set([]);
			}
		} else {
			notifications.set([]);
		}
	}
});

// Guardar notificaciones automáticamente al cambiar
notifications.subscribe(value => {
	if (currentPubKey) {
		try {
			localStorage.setItem(`paxapos_notifications_${currentPubKey}`, JSON.stringify(value));
		} catch (e) {
			console.error('Error al guardar notificaciones', e);
		}
	}
});

// Toast actualmente activo para mostrar alerta emergente
export const activeToast = writable<AppNotification | null>(null);

export function addNotification(
	type: AppNotification['type'],
	title: string,
	message: string,
	amount?: number,
	asset?: string
) {
	const newNotification: AppNotification = {
		id: Math.random().toString(36).substring(2, 9),
		type,
		title,
		message,
		timestamp: new Date(),
		read: false,
		amount,
		asset
	};

	notifications.update(list => [newNotification, ...list]);
	activeToast.set(newNotification);

	// Cerrar automáticamente el toast después de 5 segundos
	setTimeout(() => {
		activeToast.update(current => (current?.id === newNotification.id ? null : current));
	}, 5000);
}

export function markAsRead(id: string) {
	notifications.update(list =>
		list.map(n => (n.id === id ? { ...n, read: true } : n))
	);
}

export function markAllAsRead() {
	notifications.update(list => list.map(n => ({ ...n, read: true })));
}

export function removeNotification(id: string) {
	notifications.update(list => list.filter(n => n.id !== id));
}

export function clearAll() {
	notifications.set([]);
}

// Contador reactivo de notificaciones no leídas
export const unreadCount = derived(notifications, $notifications =>
	$notifications.filter(n => !n.read).length
);
