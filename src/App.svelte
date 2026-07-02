<script lang="ts">
	import { onMount } from 'svelte';
	import Sidebar from './components/Sidebar.svelte';
	import Dashboard from './components/Dashboard.svelte';
	import BillingForm from './components/BillingForm.svelte';
	import PaymentForm from './components/PaymentForm.svelte';
	import AssetsManager from './components/AssetsManager.svelte';
	import HistoryList from './components/HistoryList.svelte';
	import AuthPage from './components/AuthPage.svelte';
	import NotificationCenter from './components/NotificationCenter.svelte';

	import { session } from './stores/session';
	import { unreadCount } from './stores/notifications';
	import { subscribeToPayments, unsubscribeFromPayments, loadBalances, loadTransactionsHistory } from './services/stellar';
	import type { ViewType } from './types';
	import { fade } from 'svelte/transition';

	let activeTab: ViewType = 'dashboard';
	let notificationCenterOpen = false;
	let mobileOpen = false;

	$: if (typeof document !== 'undefined') {
		if (mobileOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	}

	// Iniciar o detener la escucha de la testnet de Stellar reactivamente
	$: if ($session.isAuthenticated && $session.stellarAccount?.pubKey) {
		subscribeToPayments($session.stellarAccount.pubKey);
		loadBalances($session.stellarAccount.pubKey);
		loadTransactionsHistory($session.stellarAccount.pubKey);
	} else {
		unsubscribeFromPayments();
	}

	function getTitle(tab: ViewType): string {
		switch (tab) {
			case 'dashboard': return 'Resumen';
			case 'billing': return 'Facturación (QR)';
			case 'payment': return 'Enviar Pago';
			case 'assets': return 'Mis Activos';
			case 'history': return 'Historial';
			case 'settings': return 'Seguridad';
			default: return 'Comercio';
		}
	}
</script>

<!-- Notificaciones Emergentes Toast siempre cargadas -->
<NotificationCenter bind:isOpen={notificationCenterOpen} />

{#if !$session.isAuthenticated}
	<!-- Pantalla de Login -->
	<div class="min-h-screen flex items-center justify-center relative z-10">
		<AuthPage />
	</div>
{:else}
	<!-- Dashboard del Comercio Completo -->
	<div class="flex min-h-screen text-slate-100 relative z-10">
		<!-- Sidebar Lateral -->
		<Sidebar bind:activeTab bind:mobileOpen />

		<!-- Backdrop overlay para cerrar sidebar móvil -->
		{#if mobileOpen}
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div 
				on:click={() => mobileOpen = false} 
				transition:fade={{ duration: 200 }}
				class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 md:hidden"
			></div>
		{/if}

		<!-- Contenido Principal -->
		<div class="flex-1 flex flex-col min-w-0 bg-slate-950/20">
			<!-- Header Superior (Top Bar) -->
			<header class="h-16 border-b border-slate-850 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6">
				<!-- Ruta / Título -->
				<div class="flex items-center gap-2 text-xs font-semibold text-slate-400">
					<!-- Botón Hamburguesa Móvil -->
					<button
						on:click={() => mobileOpen = true}
						class="p-2 -ml-2 mr-1 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-150 transition-all md:hidden flex items-center justify-center"
						aria-label="Abrir menú"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
						</svg>
					</button>

					<span>Comercio</span>
					<span>/</span>
					<span class="text-indigo-400 font-bold">{getTitle(activeTab)}</span>
				</div>

				<!-- Acciones del Topbar -->
				<div class="flex items-center gap-4">
					<!-- Campana de Notificaciones con Badge -->
					<button
						on:click={() => notificationCenterOpen = !notificationCenterOpen}
						class="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-150 relative transition-all"
						aria-label="Abrir centro de notificaciones"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
						</svg>
						{#if $unreadCount > 0}
							<span class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-600 text-white rounded-full text-[9px] font-black flex items-center justify-center border border-slate-900 animate-bounce">
								{$unreadCount}
							</span>
						{/if}
					</button>

					<!-- Separador -->
					<div class="h-6 w-px bg-slate-850"></div>

					<!-- Menú Usuario -->
					<div class="flex items-center gap-2.5">
						{#if $session.googleUser?.picture}
							<img
								src={$session.googleUser.picture}
								alt="Google avatar"
								class="w-8 h-8 rounded-full ring-2 ring-indigo-500/20 object-cover"
							/>
						{:else}
							<div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
								CO
							</div>
						{/if}
						<span class="text-xs font-bold text-slate-300 hidden sm:inline">
							{$session.googleUser?.name || 'Comercio Local'}
						</span>
					</div>
				</div>
			</header>

			<!-- Contenedor de Vistas Intercambiables -->
			<main class="flex-1 p-6 md:p-8 max-w-6xl w-full m-auto">
				{#if activeTab === 'dashboard'}
					<Dashboard bind:activeTab />
				{:else if activeTab === 'billing'}
					<BillingForm />
				{:else if activeTab === 'payment'}
					<PaymentForm />
				{:else if activeTab === 'assets'}
					<AssetsManager />
				{:else if activeTab === 'history'}
					<HistoryList />
				{:else if activeTab === 'settings'}
					<AssetsManager />
				{/if}
			</main>
		</div>
	</div>
{/if}

<style>
	/* Animaciones globales en las transiciones de vistas */
	main {
		animation: viewFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes viewFadeIn {
		from {
			opacity: 0;
			transform: scale(0.995) translateY(4px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}
</style>
