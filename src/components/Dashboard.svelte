<script lang="ts">
	import { onMount } from 'svelte';
	import { session } from '../stores/session';
	import { balances, loadingBalances, transactions } from '../stores/wallet';
	import { loadBalances, establishTrustline } from '../services/stellar';
	import type { ViewType } from '../types';
	import { addNotification } from '../stores/notifications';

	export let activeTab: ViewType;

	let totalUsd = 0;
	let salesToday = 0;
	let salesMonth = 0;
	let activeTrustlines = 0;
	let totalTrustlines = 2; // USDC y USDT son los configurados por defecto
	let trustlinePercent = 0;

	// Recalcular métricas cuando cambien balances o transacciones
	$: {
		totalUsd = $balances.reduce((sum, item) => sum + item.usdValue, 0);
		activeTrustlines = $balances.filter(item => item.code !== 'XLM' && item.hasTrustline).length;
		trustlinePercent = (activeTrustlines / totalTrustlines) * 100;
		
		// Simular ventas en base al historial real de Horizon para dar dinamismo
		const receivedTxs = $transactions.filter(tx => tx.type === 'payment' && tx.to === $session.stellarAccount.pubKey);
		const baseToday = receivedTxs.length * 12.5;
		const baseMonth = receivedTxs.length * 240 + 150;
		salesToday = baseToday > 0 ? baseToday : 0;
		salesMonth = baseMonth > 150 ? baseMonth : 150;
	}

	let loadingActionId = '';

	async function reloadData() {
		if ($session.stellarAccount?.pubKey) {
			await loadBalances($session.stellarAccount.pubKey);
		}
	}

	async function handleEnableTrustline(code: string, issuer?: string) {
		if (!issuer) return;
		loadingActionId = code;
		const success = await establishTrustline($session.stellarAccount, code, issuer);
		loadingActionId = '';
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(value);
	}

	function formatKey(key: string): string {
		if (!key) return '';
		return `${key.slice(0, 8)}...${key.slice(-8)}`;
	}

	function copyToClipboard(text: string, type: 'Dirección' | 'Clave Privada') {
		navigator.clipboard.writeText(text);
		addNotification('security', 'Copiado', `La ${type} se ha copiado al portapapeles.`);
	}

	onMount(() => {
		reloadData();
	});

	// Mock datos para el gráfico de volumen semanal
	const chartDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
	const chartPoints = [24, 45, 15, 80, 52, 95, 120];
	const maxPoint = Math.max(...chartPoints);
	const chartHeight = 120;
	const chartWidth = 500;
	
	// Generar puntos SVG del gráfico
	const svgPoints = chartPoints.map((val, i) => {
		const x = (i * (chartWidth / (chartPoints.length - 1)));
		const y = chartHeight - (val / maxPoint) * (chartHeight - 20) - 10;
		return `${x},${y}`;
	}).join(' ');
</script>

<div class="space-y-6 animate-fadeIn">
	<!-- Top Bar / Bienvenida -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
		<div>
			<h1 class="text-2xl font-black text-slate-100 flex items-center gap-2">
				Hola, {$session.googleUser?.name || 'Comercio'} 
				<span class="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
					{$session.method === 'google' ? 'OAuth Activo' : 'Tester'}
				</span>
			</h1>
			<p class="text-xs text-slate-400 mt-1 font-mono flex items-center gap-1.5">
				Wallet: <span class="bg-slate-950 px-2 py-0.5 rounded text-indigo-400 font-semibold select-all">{formatKey($session.stellarAccount.pubKey)}</span>
				<button 
					on:click={() => copyToClipboard($session.stellarAccount.pubKey, 'Dirección')}
					class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
					title="Copiar dirección"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
					</svg>
				</button>
			</p>
		</div>

		<div class="flex items-center gap-2">
			<button 
				on:click={reloadData} 
				disabled={$loadingBalances}
				class="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl transition-all border border-slate-700 disabled:opacity-50 flex items-center gap-1.5"
			>
				{#if $loadingBalances}
					<div class="w-3.5 h-3.5 border-2 border-slate-400 border-t-indigo-500 rounded-full animate-spin"></div>
					Actualizando...
				{:else}
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18"></path>
					</svg>
					Recargar Red
				{/if}
			</button>
			<button 
				on:click={() => activeTab = 'billing'} 
				class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
				</svg>
				Cobrar con QR
			</button>
		</div>
	</div>

	<!-- Grid de Balances y Métricas -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Card de Balance General Consolidad -->
		<div class="lg:col-span-1 bg-gradient-to-br from-indigo-900/60 to-purple-950/60 p-6 rounded-3xl border border-indigo-800/40 relative overflow-hidden flex flex-col justify-between min-h-[200px] shadow-xl shadow-indigo-950/20 backdrop-blur-md">
			<div class="absolute -top-12 -right-12 w-36 h-36 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none"></div>
			<div>
				<span class="text-xs font-bold text-indigo-300 uppercase tracking-widest">Balance Consolidado</span>
				<h2 class="text-4xl font-black text-white tracking-tight mt-2">
					{#if $loadingBalances}
						<div class="h-10 w-44 bg-white/10 rounded animate-pulse"></div>
					{:else}
						{formatCurrency(totalUsd)}
					{/if}
				</h2>
				<span class="text-[10px] text-indigo-200 mt-1 block">Suma estimada de XLM + USDC + USDT</span>
			</div>
			
			<div class="flex items-center gap-3 pt-6 border-t border-indigo-800/30 mt-4">
				<div class="flex-1">
					<div class="flex justify-between text-[10px] font-bold text-indigo-300">
						<span>Habilitación Stellar</span>
						<span>{activeTrustlines}/{totalTrustlines} activos</span>
					</div>
					<div class="w-full bg-slate-950/50 h-1.5 rounded-full mt-1.5 overflow-hidden">
						<div class="bg-gradient-to-r from-cyan-400 to-indigo-400 h-full rounded-full transition-all duration-500" style="width: {trustlinePercent}%"></div>
					</div>
				</div>
			</div>
		</div>

		<!-- Card de Estadísticas Rápidas -->
		<div class="lg:col-span-2 grid grid-cols-2 gap-4">
			<!-- Ventas Hoy -->
			<div class="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm flex flex-col justify-between">
				<div>
					<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cobrado Hoy</span>
					<h3 class="text-2xl font-extrabold text-slate-100 tracking-tight mt-1.5">
						{formatCurrency(salesToday)}
					</h3>
				</div>
				<span class="text-[9px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-4">
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
					</svg>
					Simulación activa
				</span>
			</div>

			<!-- Ventas Mes -->
			<div class="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm flex flex-col justify-between">
				<div>
					<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cobrado este Mes</span>
					<h3 class="text-2xl font-extrabold text-slate-100 tracking-tight mt-1.5">
						{formatCurrency(salesMonth)}
					</h3>
				</div>
				<span class="text-[9px] text-indigo-400 font-semibold flex items-center gap-0.5 mt-4">
					En Stellar Testnet
				</span>
			</div>

			<!-- Transacciones procesadas -->
			<div class="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm flex flex-col justify-between">
				<div>
					<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transacciones</span>
					<h3 class="text-2xl font-extrabold text-slate-100 tracking-tight mt-1.5">
						{$transactions.length}
					</h3>
				</div>
				<span class="text-[9px] text-slate-500 font-medium mt-4">Últimos pagos registrados</span>
			</div>

			<!-- Estado de Cuenta -->
			<div class="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm flex flex-col justify-between">
				<div>
					<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Red Conectada</span>
					<h3 class="text-lg font-bold text-orange-400 tracking-tight mt-1.5">
						Stellar Testnet
					</h3>
				</div>
				<span class="text-[9px] text-slate-500 mt-4 flex items-center gap-1">
					<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
					Horizon activo
				</span>
			</div>
		</div>
	</div>

	<!-- Gráfico de Ventas Semanales -->
	<div class="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
		<h3 class="text-sm font-bold text-slate-300 mb-4 tracking-wide">Volumen de Cobros Semanal ($)</h3>
		
		<div class="w-full overflow-hidden flex items-end">
			<svg class="w-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
				<defs>
					<linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="#6366f1" stop-opacity="0.35"/>
						<stop offset="100%" stop-color="#6366f1" stop-opacity="0.0"/>
					</linearGradient>
				</defs>
				
				<!-- Área Rellena -->
				<path 
					d="M 0 120 L {svgPoints} L 500 120 Z" 
					fill="url(#chartGrad)"
				/>
				
				<!-- Línea de Gráfico -->
				<polyline 
					fill="none" 
					stroke="url(#lineGrad)" 
					stroke-width="3" 
					points={svgPoints}
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				
				<linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stop-color="#6366f1"/>
					<stop offset="50%" stop-color="#8b5cf6"/>
					<stop offset="100%" stop-color="#22d3ee"/>
				</linearGradient>
			</svg>
		</div>
		
		<!-- Eje X -->
		<div class="flex justify-between mt-3 text-[10px] font-bold text-slate-500 px-1">
			{#each chartDays as day}
				<span>{day}</span>
			{/each}
		</div>
	</div>

	<!-- Listado de Activos y Trustlines -->
	<div class="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
		<h3 class="text-sm font-bold text-slate-300 mb-4 tracking-wide">Desglose de Activos</h3>
		
		<div class="flex flex-col gap-3">
			{#if $balances.length > 0}
				{#each $balances as item}
					<div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950/40 border border-slate-850 rounded-xl gap-3">
						<div class="flex items-center gap-3">
							<img src={item.logo} alt={item.code} class="w-8 h-8 rounded-full bg-slate-900" />
							<div>
								<h4 class="text-xs font-bold text-slate-200">{item.name}</h4>
								<span class="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{item.code}</span>
							</div>
						</div>

						<div class="flex items-center justify-between sm:justify-end gap-6">
							<!-- Balances -->
							<div class="text-right">
								<h5 class="text-sm font-extrabold text-slate-250 font-mono">
									{item.balance.toFixed(4)} <span class="text-xs text-slate-500 font-semibold">{item.code}</span>
								</h5>
								<span class="text-[10px] text-slate-500 font-bold block mt-0.5">
									≈ {formatCurrency(item.usdValue)}
								</span>
							</div>

							<!-- Indicador Trustline -->
							<div>
								{#if item.code === 'XLM'}
									<span class="px-2.5 py-1 text-[9px] font-bold bg-slate-800 border border-slate-700 rounded-lg text-slate-400">
										Nativo (Siempre Activo)
									</span>
								{:else if item.hasTrustline}
									<span class="px-2.5 py-1 text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-1">
										<span class="w-1 h-1 rounded-full bg-emerald-400"></span>
										Habilitado
									</span>
								{:else}
									<div class="flex items-center gap-2">
										<span class="px-2.5 py-1 text-[9px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
											Inactivo
										</span>
										<button
											on:click={() => handleEnableTrustline(item.code, item.issuer)}
											disabled={loadingActionId === item.code}
											class="px-2.5 py-1 text-[9px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
										>
											{#if loadingActionId === item.code}
												Habilitando...
											{:else}
												Habilitar (Trustline)
											{/if}
										</button>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			{:else}
				<!-- Skeleton Loader -->
				{#each Array(3) as _}
					<div class="w-full h-16 bg-slate-800/40 rounded-xl animate-pulse"></div>
				{/each}
			{/if}
		</div>
	</div>
</div>
