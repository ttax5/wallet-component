<script lang="ts">
	import { notifications, activeToast, markAsRead, markAllAsRead, removeNotification, clearAll } from '../stores/notifications';
	import type { AppNotification } from '../types';

	export let isOpen = false;
	let filterType: 'all' | 'unread' = 'all';

	// Filtrar notificaciones según pestaña seleccionada
	$: filteredNotifications = $notifications.filter(n => {
		if (filterType === 'unread') return !n.read;
		return true;
	});

	function formatDate(date: Date): string {
		try {
			return new Intl.DateTimeFormat('es-AR', {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			}).format(date);
		} catch (e) {
			return '';
		}
	}

	function getNotificationIcon(type: AppNotification['type']): string {
		switch (type) {
			case 'payment_received':
				// Arrow Down Credit
				return 'M19 13l-7 7-7-7m14-6l-7 7-7-7';
			case 'payment_sent':
				// Arrow Up Debit
				return 'M5 11l7-7 7 7M5 19l7-7 7 7';
			case 'trustline':
				// Key/Link
				return 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1';
			case 'security':
				// Shield
				return 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z';
			case 'error':
				// Exclamation
				return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
		}
		return '';
	}

	function getNotificationColors(type: AppNotification['type']): string {
		switch (type) {
			case 'payment_received':
				return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
			case 'payment_sent':
				return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
			case 'trustline':
				return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
			case 'security':
				return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
			case 'error':
				return 'bg-red-500/10 text-red-400 border-red-500/20';
		}
		return '';
	}
</script>

<!-- TOAST OVERLAY (Esquina Superior Derecha) -->
{#if $activeToast}
	<div 
		class="fixed top-5 right-5 z-50 flex items-start gap-3.5 p-4 rounded-2xl border bg-slate-900/90 shadow-2xl backdrop-blur-md max-w-sm w-full animate-toastSlideIn
		{getNotificationColors($activeToast.type)}"
	>
		<!-- Icono -->
		<div class="p-2 rounded-xl bg-slate-950/40 border border-current/10 shrink-0">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getNotificationIcon($activeToast.type)}></path>
			</svg>
		</div>

		<!-- Texto -->
		<div class="flex-1 min-w-0">
			<h5 class="text-sm font-bold text-slate-100">{$activeToast.title}</h5>
			<p class="text-xs text-slate-300 mt-1 font-medium leading-relaxed">{$activeToast.message}</p>
		</div>

		<!-- Botón Cerrar -->
		<button 
			on:click={() => activeToast.set(null)} 
			class="text-slate-400 hover:text-slate-200 transition-colors self-start p-0.5"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
			</svg>
		</button>
	</div>
{/if}

<!-- DRAWER LATERAL DE HISTORIAL -->
{#if isOpen}
	<!-- Fondo Opaco -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div 
		on:click={() => isOpen = false} 
		class="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 transition-opacity duration-300"
	></div>

	<!-- Drawer Container -->
	<div 
		class="fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 flex flex-col shadow-2xl animate-drawerSlideIn"
	>
		<!-- Cabecera -->
		<div class="p-5 border-b border-slate-800/80 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<h3 class="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
					Notificaciones
				</h3>
				{#if $notifications.filter(n => !n.read).length > 0}
					<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white animate-pulse">
						{$notifications.filter(n => !n.read).length} nuevas
					</span>
				{/if}
			</div>

			<!-- Botones de Acción Rápida -->
			<div class="flex items-center gap-1.5">
				{#if $notifications.length > 0}
					<button 
						on:click={markAllAsRead} 
						class="text-xs text-slate-400 hover:text-indigo-400 font-semibold px-2 py-1.5 rounded-lg hover:bg-slate-850 transition-colors"
					>
						Marcar leídas
					</button>
					<button 
						on:click={clearAll} 
						class="text-xs text-slate-400 hover:text-red-400 font-semibold px-2 py-1.5 rounded-lg hover:bg-slate-850 transition-colors"
					>
						Limpiar
					</button>
				{/if}
				<button 
					on:click={() => isOpen = false} 
					class="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-850 rounded-lg transition-colors ml-1"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>
		</div>

		<!-- Filtros -->
		<div class="px-5 py-3 border-b border-slate-800/50 bg-slate-950/20 flex gap-2">
			<button
				class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors {filterType === 'all' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-300'}"
				on:click={() => filterType = 'all'}
			>
				Todas
			</button>
			<button
				class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors {filterType === 'unread' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-300'}"
				on:click={() => filterType = 'unread'}
			>
				No Leídas
			</button>
		</div>

		<!-- Historial Listado -->
		<div class="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
			{#if filteredNotifications.length > 0}
				{#each filteredNotifications as notification (notification.id)}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<div 
						class="flex gap-3.5 p-4 rounded-xl border bg-slate-850/40 transition-all duration-200 relative group 
						{notification.read ? 'border-slate-800/60 opacity-70' : 'border-slate-700/60 shadow-lg shadow-indigo-600/[0.02]'}"
						on:click={() => markAsRead(notification.id)}
					>
						<!-- Punto azul de no leído -->
						{#if !notification.read}
							<span class="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-500"></span>
						{/if}

						<!-- Icono -->
						<div class="p-2.5 rounded-xl border self-start shrink-0 {getNotificationColors(notification.type)}">
							<svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getNotificationIcon(notification.type)}></path>
							</svg>
						</div>

						<!-- Detalle -->
						<div class="flex-1 min-w-0 pr-4">
							<h5 class="text-xs font-bold text-slate-100">{notification.title}</h5>
							<p class="text-xs text-slate-400 mt-1 font-medium leading-relaxed">{notification.message}</p>
							<span class="text-[9px] text-slate-500 font-semibold mt-2 block">
								{formatDate(notification.timestamp)}
							</span>
						</div>

						<!-- Botón borrar individual -->
						<button 
							on:click|stopPropagation={() => removeNotification(notification.id)}
							class="absolute bottom-4 right-4 p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
							title="Eliminar notificación"
						>
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
							</svg>
						</button>
					</div>
				{/each}
			{:else}
				<div class="flex flex-col items-center justify-center py-20 text-slate-500">
					<!-- Bell off icon -->
					<svg class="w-12 h-12 text-slate-750 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
					</svg>
					<p class="text-xs font-semibold">Bandeja de entrada vacía</p>
					<p class="text-[10px] text-slate-600 mt-1">Aquí verás tu historial de movimientos.</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	@keyframes toastSlideIn {
		from {
			opacity: 0;
			transform: translate3d(50px, 0, 0);
		}
		to {
			opacity: 1;
			transform: translate3d(0, 0, 0);
		}
	}

	@keyframes drawerSlideIn {
		from {
			transform: translate3d(100%, 0, 0);
		}
		to {
			transform: translate3d(0, 0, 0);
		}
	}

	.animate-toastSlideIn {
		animation: toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	.animate-drawerSlideIn {
		animation: drawerSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}
</style>
