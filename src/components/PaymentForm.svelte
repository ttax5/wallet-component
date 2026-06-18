<script lang="ts">
	import { session } from '../stores/session';
	import { balances } from '../stores/wallet';
	import { SUPPORTED_ASSETS, createPayment } from '../services/stellar';
	import { addNotification } from '../stores/notifications';
	import QRScanner from './QRScanner.svelte';

	let recipient = '';
	let amount: number;
	let selectedAssetCode = 'XLM';
	let memoText = '';
	
	let openScanner = false;
	let txState: 'idle' | 'preparing' | 'submitting' | 'success' | 'error' = 'idle';
	let errorMessage = '';
	let successHash = '';

	// Obtener el balance del activo seleccionado reactivamente
	$: selectedAsset = SUPPORTED_ASSETS.find(a => a.code === selectedAssetCode);
	$: currentAssetBalance = $balances.find(b => b.code === selectedAssetCode)?.balance ?? 0;

	// Capturar el resultado del QR
	function handleScanSuccess(event: CustomEvent) {
		const data = event.detail;
		recipient = data.recipient;
		amount = data.amount > 0 ? data.amount : amount;
		selectedAssetCode = data.assetCode;
		memoText = data.memo || memoText;
		openScanner = false;
		
		addNotification('security', 'QR Aplicado', `Datos de pago cargados para ${data.assetCode}.`);
	}

	async function executeTransfer() {
		// Validaciones preventivas
		if (recipient.length !== 56 || !recipient.startsWith('G')) {
			addNotification('error', 'Destinatario Inválido', 'La dirección Stellar debe iniciar con "G" y tener 56 caracteres.');
			return;
		}

		if (!amount || amount <= 0) {
			addNotification('error', 'Monto Inválido', 'El monto a transferir debe ser mayor a cero.');
			return;
		}

		if (amount > currentAssetBalance) {
			addNotification('error', 'Saldo Insuficiente', `No tienes suficiente saldo de ${selectedAssetCode} (Disponible: ${currentAssetBalance}).`);
			return;
		}

		txState = 'preparing';
		
		try {
			txState = 'submitting';
			const res = await createPayment(
				amount,
				$session.stellarAccount,
				recipient,
				selectedAssetCode,
				selectedAsset?.issuer,
				memoText
			);

			if (res) {
				successHash = res.transactionHash || '';
				txState = 'success';
				
				// Limpiar formulario
				recipient = '';
				amount = 0;
				memoText = '';
			} else {
				txState = 'error';
				errorMessage = 'La transacción fue rechazada por la red. Asegúrate de que el destinatario posea la trustline.';
			}
		} catch (e: any) {
			console.error(e);
			txState = 'error';
			errorMessage = e.message || 'Error desconocido al enviar la transacción.';
		}
	}

	function resetState() {
		txState = 'idle';
		errorMessage = '';
		successHash = '';
	}

	function formatKey(key: string): string {
		if (!key) return '';
		return `${key.slice(0, 10)}...${key.slice(-10)}`;
	}
</script>

<div class="max-w-xl m-auto bg-slate-900/40 border border-slate-800 backdrop-blur-md p-8 rounded-3xl shadow-2xl relative overflow-hidden animate-fadeIn">
	<div class="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

	{#if openScanner}
		<div>
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-sm font-bold text-slate-300 uppercase tracking-wider">Escanear QR de Cobro</h3>
				<button 
					on:click={() => openScanner = false}
					class="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors text-xs font-semibold"
				>
					Cancelar
				</button>
			</div>
			<QRScanner on:scanSuccess={handleScanSuccess} />
		</div>
	{:else if txState === 'idle'}
		<div>
			<div class="flex items-center justify-between mb-6">
				<div>
					<h2 class="text-2xl font-black text-slate-100 tracking-tight">Enviar Pago</h2>
					<p class="text-xs text-slate-400 mt-1">Transfiere fondos de tu cuenta a cualquier dirección Stellar.</p>
				</div>
				<button
					on:click={() => openScanner = true}
					class="px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
				>
					<!-- Scan Icon -->
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					Escanear QR
				</button>
			</div>

			<div class="space-y-5">
				<!-- Destinatario -->
				<div>
					<label for="pay-to" class="text-slate-400 text-xs font-semibold">Dirección de Destino (Public Key G...)</label>
					<input
						type="text"
						id="pay-to"
						class="w-full bg-slate-950 border-slate-800 text-slate-200 px-4 py-3 rounded-xl mt-1.5 focus:border-indigo-500 font-mono text-xs"
						bind:value={recipient}
						placeholder="GD..."
					/>
				</div>

				<!-- Monto y Selector de Token -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<!-- Monto -->
					<div class="sm:col-span-2">
						<label for="pay-amount" class="text-slate-400 text-xs font-semibold">Monto</label>
						<input
							type="number"
							id="pay-amount"
							class="w-full bg-slate-950 border-slate-800 text-slate-150 px-4 py-3 rounded-xl mt-1.5 focus:border-indigo-500 text-base font-bold font-mono"
							bind:value={amount}
							placeholder="0.00"
							min="0"
						/>
					</div>
					
					<!-- Token -->
					<div>
						<label for="pay-asset" class="text-slate-400 text-xs font-semibold">Activo</label>
						<select
							id="pay-asset"
							class="w-full bg-slate-950 border border-slate-800 text-slate-350 px-4 py-3 rounded-xl mt-1.5 focus:border-indigo-500 outline-none text-sm font-semibold"
							bind:value={selectedAssetCode}
						>
							{#each SUPPORTED_ASSETS as sa}
								<option value={sa.code}>{sa.code}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Visualización de Saldo Disponible -->
				<div class="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-between text-xs font-semibold">
					<span class="text-slate-500">Saldo Disponible:</span>
					<span class="text-indigo-400 font-mono">{currentAssetBalance.toFixed(4)} {selectedAssetCode}</span>
				</div>

				<!-- Memo -->
				<div>
					<label for="pay-memo" class="text-slate-400 text-xs font-semibold">Memo / Mensaje de Texto (Opcional)</label>
					<input
						type="text"
						id="pay-memo"
						class="w-full bg-slate-950 border-slate-800 text-slate-200 px-4 py-3 rounded-xl mt-1.5 focus:border-indigo-500 text-xs font-semibold"
						bind:value={memoText}
						placeholder="Ej. Reembolso, Pago Factura"
						maxlength="28"
					/>
				</div>

				<button
					on:click={executeTransfer}
					disabled={!recipient || !amount || amount <= 0}
					class="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed mt-4"
				>
					Confirmar y Enviar Fondos
				</button>
			</div>
		</div>
	{:else if txState === 'preparing' || txState === 'submitting'}
		<!-- Overlay de Transacción -->
		<div class="flex flex-col items-center justify-center py-10 text-center">
			<!-- Spinner Animado -->
			<div class="w-14 h-14 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
			
			<h3 class="text-lg font-bold text-slate-100 tracking-tight">Procesando Transacción</h3>
			<p class="text-xs text-slate-400 max-w-[280px] mt-1.5">
				{#if txState === 'preparing'}
					Cargando datos de la red Stellar y preparando transacción...
				{:else}
					Firmando localmente y enviando bloque a Stellar Horizon Testnet...
				{/if}
			</p>
		</div>
	{:else if txState === 'success'}
		<!-- Pantalla Éxito -->
		<div class="flex flex-col items-center text-center py-6">
			<div class="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mb-6 shadow-lg shadow-emerald-950/20">
				<svg class="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
			</div>

			<h2 class="text-2xl font-black text-slate-100 tracking-tight">¡Envío Exitoso!</h2>
			<p class="text-xs text-slate-400 mt-1.5">Los fondos se han transferido a la cuenta de destino.</p>

			{#if successHash}
				<div class="w-full bg-slate-950/40 border border-slate-850 rounded-2xl p-4 mt-6 space-y-2 text-left text-xs font-mono">
					<div class="flex justify-between">
						<span class="text-slate-500 font-semibold font-sans">Tx Hash:</span>
						<span class="text-slate-300 text-[10px]" title={successHash}>{formatKey(successHash)}</span>
					</div>
					<div class="flex justify-between border-t border-slate-900 pt-2 text-[10px]">
						<span class="text-slate-500 font-semibold font-sans">Explorador:</span>
						<a
							href="https://stellar.expert/explorer/testnet/tx/{successHash}"
							target="_blank"
							rel="noreferrer"
							class="text-indigo-400 hover:text-indigo-300 font-bold font-sans flex items-center gap-1 transition-all"
						>
							Ver en Stellar.expert
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
							</svg>
						</a>
					</div>
				</div>
			{/if}

			<button
				on:click={resetState}
				class="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold rounded-xl transition-all shadow-md mt-6"
			>
				Hacer Otro Pago
			</button>
		</div>
	{:else if txState === 'error'}
		<!-- Pantalla Error -->
		<div class="flex flex-col items-center text-center py-6 animate-fadeIn">
			<div class="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-400 mb-6">
				<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
				</svg>
			</div>

			<h2 class="text-2xl font-black text-slate-100 tracking-tight">Transacción Fallida</h2>
			<p class="text-xs text-slate-400 mt-1.5">No se pudo concretar el envío a la red Stellar.</p>

			<div class="w-full p-4 bg-red-950/20 border border-red-500/20 rounded-2xl mt-6 text-xs text-red-300 font-semibold leading-relaxed text-left">
				{errorMessage}
			</div>

			<div class="w-full flex gap-3 mt-6">
				<button 
					on:click={() => txState = 'idle'}
					class="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
				>
					Modificar Datos
				</button>
				<button 
					on:click={resetState}
					class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
				>
					Volver a Empezar
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Select overrides for styling */
	select {
		background: var(--bg-input) !important;
		border: 1px solid var(--border-subtle) !important;
		color: var(--text-primary) !important;
	}
	select:focus {
		border-color: var(--accent-indigo) !important;
		box-shadow: 0 0 0 3px var(--glow-color) !important;
	}
</style>
