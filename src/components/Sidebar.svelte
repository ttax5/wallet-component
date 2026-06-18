<script lang="ts">
	import { session, logout } from '../stores/session';
	import type { ViewType } from '../types';

	export let activeTab: ViewType = 'dashboard';
	let isCollapsed = false;

	const menuItems: { id: ViewType; label: string; iconPath: string }[] = [
		{
			id: 'dashboard',
			label: 'Dashboard',
			// Icon: Home/Grid
			iconPath: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z'
		},
		{
			id: 'billing',
			label: 'Cobrar (QR)',
			// Icon: Cash/QrCode
			iconPath: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z'
		},
		{
			id: 'payment',
			label: 'Enviar Pago',
			// Icon: ArrowUpRight / Send
			iconPath: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
		},
		{
			id: 'assets',
			label: 'Mis Activos',
			// Icon: Database / Coins
			iconPath: 'M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm3 3h12M6 15h12'
		},
		{
			id: 'history',
			label: 'Historial',
			// Icon: Clock / Transactions
			iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
		},
		{
			id: 'settings',
			label: 'Seguridad',
			// Icon: Key / Settings
			iconPath: 'M15 7a2 2 0 012 2m-3.418 3.818l1.414-1.414A3 3 0 1012 7.582l-1.414 1.414m3.418 3.818l-5.657 5.657H5v-2.828l5.657-5.657m3.418 3.818L10 10'
		}
	];

	function toggleSidebar() {
		isCollapsed = !isCollapsed;
	}

	function handleLogout() {
		logout();
	}

	function formatKey(key: string): string {
		if (!key) return '';
		return `${key.slice(0, 4)}...${key.slice(-4)}`;
	}
</script>

<aside 
	class="sidebar flex flex-col justify-between h-screen sticky top-0 bg-slate-900/80 border-r border-slate-800 transition-all duration-300 z-30 backdrop-blur-xl 
	{isCollapsed ? 'w-20' : 'w-64'}"
>
	<div>
		<!-- Logo y Botón Colapsar -->
		<div class="flex items-center justify-between p-5 border-b border-slate-800/80 h-16">
			{#if !isCollapsed}
				<div class="flex items-center gap-2.5 animate-fadeIn">
					<div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md text-sm">
						PX
					</div>
					<span class="font-extrabold text-sm tracking-wide bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
						PAXAPOS
					</span>
				</div>
			{:else}
				<div class="m-auto w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md text-sm">
					PX
				</div>
			{/if}
			
			<button 
				on:click={toggleSidebar} 
				class="p-1.5 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 transition-colors"
				aria-label="Colapsar menú"
			>
				<svg class="w-5 h-5 transform {isCollapsed ? 'rotate-180' : ''} transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
				</svg>
			</button>
		</div>

		<!-- Enlaces de navegación -->
		<nav class="flex-1 py-6 px-3 space-y-1.5">
			{#each menuItems as item}
				<button
					class="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl font-medium text-sm transition-all duration-200 group relative
					{activeTab === item.id 
						? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/10' 
						: 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}"
					on:click={() => activeTab = item.id}
				>
					<svg class="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.iconPath}></path>
					</svg>
					
					{#if !isCollapsed}
						<span class="animate-fadeIn">{item.label}</span>
					{:else}
						<!-- Tooltip flotante al colapsar -->
						<div class="absolute left-16 bg-slate-950 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-slate-800 z-50">
							{item.label}
						</div>
					{/if}
				</button>
			{/each}
		</nav>
	</div>

	<!-- Perfil del Comercio / Cierre de sesión -->
	<div class="p-4 border-t border-slate-850 bg-slate-950/20">
		<div class="flex items-center gap-3 {isCollapsed ? 'justify-center' : ''}">
			<!-- Avatar del usuario -->
			{#if $session.googleUser?.picture}
				<img 
					src={$session.googleUser.picture} 
					alt="Avatar" 
					class="w-9 h-9 rounded-full ring-2 ring-indigo-500/30 object-cover" 
				/>
			{:else}
				<div class="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs shrink-0 ring-2 ring-indigo-500/20">
					CO
				</div>
			{/if}

			<!-- Info extendida si no está colapsado -->
			{#if !isCollapsed}
				<div class="flex-1 min-w-0 animate-fadeIn">
					<h4 class="text-xs font-bold text-slate-200 truncate">
						{$session.googleUser?.name || 'Comercio Local'}
					</h4>
					<p class="text-[10px] text-slate-400 font-mono truncate mt-0.5" title={$session.stellarAccount.pubKey}>
						{formatKey($session.stellarAccount.pubKey)}
					</p>
				</div>
				
				<!-- Botón cerrar sesión -->
				<button 
					on:click={handleLogout} 
					class="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
					title="Cerrar sesión"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
					</svg>
				</button>
			{/if}
		</div>

		<!-- Cerrar sesión colapsado -->
		{#if isCollapsed}
			<button 
				on:click={handleLogout} 
				class="w-full flex justify-center py-2.5 mt-3 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
				title="Cerrar sesión"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
				</svg>
			</button>
		{/if}
	</div>
</aside>
