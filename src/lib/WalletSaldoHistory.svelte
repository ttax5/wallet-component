<script lang="ts">
	export let listTransactions: any[] = [];
	export let address: string = '';

	function formatAddress(addr: string): string {
		if (!addr) return '';
		return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
	}

	function formatDate(dateStr: string): string {
		try {
			const date = new Date(dateStr);
			return new Intl.DateTimeFormat('es-AR', {
				day: '2-digit',
				month: 'short',
				hour: '2-digit',
				minute: '2-digit',
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
		
		const isOutgoing = sender === address;

		return {
			isCreate,
			sender,
			receiver,
			amount,
			asset,
			isOutgoing,
			date: tx.created_at,
			hash: tx.transaction_hash,
		};
	}
</script>

<div class="p-6 w-full max-w-lg bg-slate-900 rounded-2xl shadow-xl border border-slate-800 text-slate-100">
	<div class="text-2xl font-extrabold mb-6 pb-4 border-b border-slate-800 text-center tracking-tight bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
		Actividad de la Cuenta
	</div>
	
	<div class="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
		{#if listTransactions.length > 0}
			<div class="flex flex-col gap-3">
				{#each listTransactions as rawTx}
					{@const details = getTxDetails(rawTx)}
					<div class="flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-750/80 border border-slate-800 hover:border-slate-700/60 rounded-xl transition-all duration-200">
						<div class="flex items-center gap-3">
							<!-- Icono según tipo de transacción -->
							<div class="p-2.5 rounded-lg flex items-center justify-center 
								{details.isCreate ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
								 details.isOutgoing ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
								 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}"
							>
								{#if details.isCreate}
									<!-- Icon: Key/User Plus -->
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
									</svg>
								{:else}
									<!-- Icon: Arrow Up/Down -->
									<svg class="w-5 h-5 transform {details.isOutgoing ? 'rotate-45' : '-rotate-135'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19V5m0 0l-7 7m7-7l7 7"></path>
									</svg>
								{/if}
							</div>

							<!-- Detalles principales -->
							<div>
								<div class="font-semibold text-sm">
									{#if details.isCreate}
										Creación de Cuenta
									{:else if details.isOutgoing}
										Pago Enviado
									{:else}
										Pago Recibido
									{/if}
								</div>
								<div class="text-xs text-slate-400 mt-0.5">
									{#if details.isOutgoing}
										A: <span class="font-mono bg-black/20 px-1 py-0.5 rounded text-slate-300" title={details.receiver}>{formatAddress(details.receiver)}</span>
									{:else}
										De: <span class="font-mono bg-black/20 px-1 py-0.5 rounded text-slate-300" title={details.sender}>{formatAddress(details.sender)}</span>
									{/if}
								</div>
								<div class="text-[10px] text-slate-500 mt-1">
									{formatDate(details.date)}
								</div>
							</div>
						</div>

						<!-- Monto y link -->
						<div class="text-right flex flex-col items-end gap-1.5">
							<span class="font-bold font-mono text-sm 
								{details.isCreate ? 'text-blue-400' : 
								 details.isOutgoing ? 'text-rose-400' : 'text-emerald-400'}"
							>
								{details.isOutgoing ? '-' : details.isCreate ? '' : '+'}{parseFloat(details.amount).toFixed(2)} {details.asset}
							</span>
							
							{#if details.hash}
								<a 
									href="https://stellar.expert/explorer/testnet/tx/{details.hash}" 
									target="_blank" 
									rel="noopener noreferrer"
									class="inline-flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-orange-400 border border-slate-700 bg-slate-800/40 hover:bg-slate-800 px-1.5 py-0.5 rounded transition-all"
								>
									<span>Explorer</span>
									<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
									</svg>
								</a>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center py-12 text-slate-400">
				<!-- Icono vacío -->
				<svg class="w-12 h-12 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
				</svg>
				<span class="text-sm font-medium">No hay transacciones registradas</span>
				<span class="text-xs text-slate-500 mt-1">Los movimientos de la Testnet aparecerán aquí.</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.02);
		border-radius: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
