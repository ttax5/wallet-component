<script lang="ts">
	import { onMount } from 'svelte';
	import { session } from '../stores/session';
	import { transactions, loadingTransactions } from '../stores/wallet';
	import { loadTransactionsHistory } from '../services/stellar';

	let filterType: 'all' | 'credit' | 'debit' = 'all';
	let filterAsset = 'all';

	$: currentAddress = $session.stellarAccount?.pubKey || '';

	function reloadHistory() {
		if (currentAddress) {
			loadTransactionsHistory(currentAddress);
		}
	}

	onMount(() => {
		reloadHistory();
	});

	function formatAddress(addr: string): string {
		if (!addr) return '';
		return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
	}

	function formatDate(dateStr: string): string {
		try {
			const date = new Date(dateStr);
			return new Intl.DateTimeFormat('es-AR', {
				day: '2-digit',
				month: 'short',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			}).format(date);
		} catch (e) {
			return dateStr;
		}
	}

	function getTxDetails(tx: any) {
		const isCreate = tx.type === 'create_account';
		const sender = isCreate ? tx.funder : tx.from;
		const receiver = isCreate ? tx.account : tx.to;
		const amount = isCreate ? tx.starting_balance : tx.amount;
		const asset = isCreate ? 'XLM' : (tx.asset_code || 'XLM');
		const isOutgoing = sender === currentAddress;

		return {
			isCreate,
			sender,
			receiver,
			amount: parseFloat(amount || '0'),
			asset,
			isOutgoing,
			date: tx.created_at,
			hash: tx.transaction_hash
		};
	}

	// Filtrar reactivamente la lista de Horizon
	$: filteredTxs = $transactions
		.map(tx => getTxDetails(tx))
		.filter(details => {
			// Filtro de Tipo
			if (filterType === 'credit' && details.isOutgoing) return false;
			if (filterType === 'debit' && !details.isOutgoing && !details.isCreate) return false;
			
			// Filtro de Activo
			if (filterAsset !== 'all' && details.asset !== filterAsset) return false;
			
			return true;
		});

	// Obtener lista de activos únicos en el historial para rellenar el filtro
	$: uniqueAssets = Array.from(new Set($transactions.map(tx => {
		return tx.type === 'create_account' ? 'XLM' : (tx.asset_code || 'XLM');
	})));
</script>

<div class="space-y-6 animate-fadeIn">
	<!-- Panel de Filtros -->
	<div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
		<div class="flex flex-wrap items-center gap-2">
			<button
				class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors {filterType === 'all' ? 'bg-slate-800 text-indigo-400 border border-indigo-500/10' : 'text-slate-400 hover:text-slate-200'}"
				on:click={() => filterType = 'all'}
			>
				Todos
			</button>
			<button
				class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors {filterType === 'credit' ? 'bg-slate-800 text-emerald-400 border border-emerald-500/10' : 'text-slate-400 hover:text-slate-200'}"
				on:click={() => filterType = 'credit'}
			>
				Ingresos
			</button>
			<button
				class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors {filterType === 'debit' ? 'bg-slate-800 text-rose-400 border border-rose-500/10' : 'text-slate-400 hover:text-slate-200'}"
				on:click={() => filterType = 'debit'}
			>
				Egresos
			</button>
		</div>

		<div class="flex items-center gap-2 w-full sm:w-auto">
			<select
				class="bg-slate-950 border border-slate-800 text-slate-350 px-3.5 py-1.5 rounded-lg text-xs outline-none focus:border-indigo-500 w-full sm:w-40 font-semibold"
				bind:value={filterAsset}
			>
				<option value="all">Cualquier Activo</option>
				{#each uniqueAssets as asset}
					<option value={asset}>{asset}</option>
				{/each}
			</select>
			
			<button 
				on:click={reloadHistory}
				disabled={$loadingTransactions}
				class="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-slate-100 rounded-lg border border-slate-700 transition-colors disabled:opacity-50 shrink-0"
				title="Refrescar historial"
			>
				<svg class="w-4 h-4 {$loadingTransactions ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18"></path>
				</svg>
			</button>
		</div>
	</div>

	<!-- Listado Histórico -->
	<div class="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
		<h3 class="text-sm font-bold text-slate-300 mb-4 tracking-wide">Registro de Actividad</h3>

		<div class="space-y-3">
			{#if $loadingTransactions}
				{#each Array(4) as _}
					<div class="w-full h-16 bg-slate-800/40 rounded-xl animate-pulse"></div>
				{/each}
			{:else if filteredTxs.length > 0}
				{#each filteredTxs as details}
					<div class="flex items-center justify-between p-4 bg-slate-950/30 hover:bg-slate-950/60 border border-slate-850 rounded-xl transition-all duration-200 group">
						<div class="flex items-center gap-3.5">
							<!-- Icono del Estado de Transacción -->
							<div class="p-2.5 rounded-xl flex items-center justify-center shrink-0 border
								{details.isCreate ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
								 details.isOutgoing ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
								 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}"
							>
								{#if details.isCreate}
									<!-- Key/Plus Icon -->
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m-2 4h.01M5.071 19a9 9 0 1112.728 0m-12.728 0L3 21h4.071M12 7V4m0 3a3 3 0 100 6 3 3 0 000-6z"></path>
									</svg>
								{:else}
									<!-- Transfer Arrow Icon -->
									<svg class="w-4 h-4 transform {details.isOutgoing ? 'rotate-45' : '-rotate-135'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19V5m0 0l-7 7m7-7l7 7"></path>
									</svg>
								{/if}
							</div>

							<!-- Detalle Central -->
							<div>
								<h4 class="text-xs font-bold text-slate-200">
									{#if details.isCreate}
										Creación de Cuenta
									{:else if details.isOutgoing}
										Pago Enviado
									{:else}
										Pago Recibido
									{/if}
								</h4>
								<span class="text-[10px] text-slate-500 font-semibold font-mono mt-0.5 block">
									{#if details.isOutgoing}
										A: <span class="text-slate-400 bg-slate-950 px-1 py-0.5 rounded font-mono select-all" title={details.receiver}>{formatAddress(details.receiver)}</span>
									{:else}
										De: <span class="text-slate-400 bg-slate-950 px-1 py-0.5 rounded font-mono select-all" title={details.sender}>{formatAddress(details.sender)}</span>
									{/if}
								</span>
								<span class="text-[9px] text-slate-600 font-bold block mt-1.5">
									{formatDate(details.date)}
								</span>
							</div>
						</div>

						<!-- Detalle de Importe y Enlace -->
						<div class="text-right flex flex-col items-end gap-1.5">
							<span class="font-extrabold font-mono text-sm tracking-tight
								{details.isCreate ? 'text-blue-400' : 
								 details.isOutgoing ? 'text-rose-450' : 'text-emerald-450'}"
							>
								{details.isOutgoing ? '-' : details.isCreate ? '' : '+'}{details.amount.toFixed(2)} {details.asset}
							</span>
							
							{#if details.hash}
								<a
									href="https://stellar.expert/explorer/testnet/tx/{details.hash}"
									target="_blank"
									rel="noreferrer"
									class="inline-flex items-center gap-0.5 text-[9px] text-slate-500 hover:text-indigo-400 font-bold border border-slate-800 bg-slate-900/40 px-2 py-0.5 rounded transition-all"
								>
									Explorer
									<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
									</svg>
								</a>
							{/if}
						</div>
					</div>
				{/each}
			{:else}
				<div class="flex flex-col items-center justify-center py-16 text-slate-500">
					<!-- Inbox empty icon -->
					<svg class="w-12 h-12 text-slate-850 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
					</svg>
					<p class="text-xs font-semibold">Sin transacciones registradas</p>
					<p class="text-[10px] text-slate-600 mt-1">Los movimientos de la Testnet se mostrarán aquí.</p>
				</div>
			{/if}
		</div>
	</div>
</div>
