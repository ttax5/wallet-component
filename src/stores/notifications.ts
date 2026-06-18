import { writable, derived } from 'svelte/store';
import type { AppNotification } from '../types';

const getStoredNotifications = (): AppNotification[] => {
	try {
		const stored = localStorage.getItem('paxapos_notifications');
		if (stored) {
			const parsed = JSON.parse(stored);
			return parsed.map((n: any) => ({
				...n,
				timestamp: new Date(n.timestamp)
			}));
		}
	} catch (e) {
		console.error('Error al cargar notificaciones', e);
	}
	return [];
};

export const notifications = writable<AppNotification[]>(getStoredNotifications());

notifications.subscribe(value => {
	try {
		localStorage.setItem('paxapos_notifications', JSON.stringify(value));
	} catch (e) {
		console.error('Error al guardar notificaciones', e);
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
