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
	import { theme, toggleTheme } from './stores/theme';
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
	<div class="min-h-screen flex items-center justify-center relative z-10 app-shell">
		<AuthPage />
	</div>
{:else}
	<!-- Dashboard del Comercio Completo -->
	<div class="flex min-h-screen relative z-10 app-shell">
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
		<div class="flex-1 flex flex-col min-w-0 app-main">
			<!-- Header Superior (Top Bar) -->
			<header class="topbar h-16 border-b sticky top-0 z-20 flex items-center justify-between px-4 md:px-6">
				<!-- Ruta / Título -->
				<div class="flex items-center gap-2 text-xs font-semibold text-slate-400">
					<!-- Botón Hamburguesa Móvil -->
					<button
						on:click={() => mobileOpen = true}
						class="icon-button -ml-2 mr-1 md:hidden"
						aria-label="Abrir menú"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
						</svg>
					</button>

					<span class="hidden sm:inline">Comercio</span>
					<span>/</span>
					<span class="font-bold secondary-text">{getTitle(activeTab)}</span>
				</div>

				<!-- Acciones del Topbar -->
				<div class="flex items-center gap-4">
					<button
						on:click={toggleTheme}
						class="icon-button theme-toggle text-xs"
						aria-label={$theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
						title={$theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
					>
						{#if $theme === 'dark'}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M7.05 7.05L5.636 5.636M12 8a4 4 0 100 8 4 4 0 000-8z"></path>
							</svg>
							Claro
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a8.973 8.973 0 008.354-5.646z"></path>
							</svg>
							Oscuro
						{/if}
					</button>

					<!-- Campana de Notificaciones con Badge -->
					<button
						on:click={() => notificationCenterOpen = !notificationCenterOpen}
						class="icon-button relative"
						aria-label="Abrir centro de notificaciones"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
						</svg>
						{#if $unreadCount > 0}
							<span class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-600 text-white rounded-full text-[9px] font-black flex items-center justify-center border border-slate-900">
								{$unreadCount}
							</span>
						{/if}
					</button>

					<!-- Separador -->
					<div class="h-6 w-px border-l border-slate-850"></div>

					<!-- Menú Usuario -->
					<div class="flex items-center gap-2.5">
						{#if $session.googleUser?.picture}
							<img
								src={$session.googleUser.picture}
								alt="Google avatar"
								class="w-8 h-8 rounded-full ring-2 ring-indigo-500/20 object-cover"
							/>
						{:else}
							<div class="w-8 h-8 rounded-full subtle-panel flex items-center justify-center font-bold text-xs">
								CO
							</div>
						{/if}
						<span class="text-xs font-bold hidden sm:inline">
							{$session.googleUser?.name || 'Comercio Local'}
						</span>
					</div>
				</div>
			</header>

			<!-- Contenedor de Vistas Intercambiables -->
			<main class="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
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
