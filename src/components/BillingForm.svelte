<script lang="ts">
	import { session } from '../stores/session';
	import { balances } from '../stores/wallet';
	import { SUPPORTED_ASSETS, createPayment, establishTrustline } from '../services/stellar';
	import { addNotification, notifications } from '../stores/notifications';
	import WalletQR from '../lib/WalletQR.svelte';

	let amount: number;
	let selectedAssetCode = 'XLM';
	let memoText = '';
	let generatedQrValue = '';
	let orderState: 'input' | 'waiting' | 'success' = 'input';
	let isSimulating = false;
	let enablingTrustline = false;

	// Verificar si el comercio tiene habilitado el activo seleccionado
	$: selectedAsset = SUPPORTED_ASSETS.find(a => a.code === selectedAssetCode);
	$: hasTrustline = selectedAssetCode === 'XLM' || 
		($balances.find(b => b.code === selectedAssetCode)?.hasTrustline ?? false);

	async function handleEnableTrustline() {
		if (!selectedAsset?.issuer) return;
		enablingTrustline = true;
		const success = await establishTrustline($session.stellarAccount, selectedAssetCode, selectedAsset.issuer);
		enablingTrustline = false;
	}

	function generateBilling() {
		if (!amount || amount <= 0) {
			addNotification('error', 'Monto Inválido', 'Por favor ingresa un monto mayor a cero.');
			return;
		}

		// Armamos el payload estructurado
		const qrPayload = {
			address: $session.stellarAccount.pubKey,
			amount: amount,
			assetCode: selectedAssetCode,
			assetIssuer: selectedAsset?.issuer || '',
			memo: memoText || ''
		};

		generatedQrValue = `paxapos:pay?address=${qrPayload.address}&amount=${qrPayload.amount}&asset=${qrPayload.assetCode}&issuer=${qrPayload.assetIssuer}&memo=${encodeURIComponent(qrPayload.memo)}`;
		orderState = 'waiting';
		addNotification('security', 'Esperando Pago', `Se ha generado un cobro de ${amount} ${selectedAssetCode}.`);
	}

	// Escuchar el store de notificaciones para detectar si nos llegó el pago
	$: {
		if (orderState === 'waiting') {
			// Buscar en las notificaciones no leídas si hay un pago recibido que coincida con el cobro actual
			const match = $notifications.find(n => 
				!n.read &&
				n.type === 'payment_received' &&
				n.amount === amount &&
				n.asset === selectedAssetCode
			);
			
			if (match) {
				orderState = 'success';
				addNotification('security', 'Cobro Confirmado', `¡El pago de ${amount} ${selectedAssetCode} se ha acreditado!`);
			}
		}
	}

	// Simulación del pago del cliente en la red Stellar Testnet
	async function simulateClientPayment() {
		isSimulating = true;
		addNotification('security', 'Simulador Cliente', 'Creando transacción Stellar del cliente...');
		
		// Generar un pagador de prueba (Usamos stellarAccount2 como cliente de pruebas)
		// Si es el mismo que el del comercio, usaremos las llaves estáticas 2
		const clientAccount = {
			pubKey: 'GAMWGOJMSHBEQXO2SFI2YEDCH6FLC56XB5GKWC6JHTXLI5B4EJZGBVBL',
			privKey: 'SDDF5OKB6E6A3DZB3ZWRKUZ2PQ4KDNLEX2Q2RDFPPRXR3HNJNP4N3SCB'
		};

		try {
			const payment = await createPayment(
				amount,
				clientAccount,
				$session.stellarAccount.pubKey,
				selectedAssetCode,
				selectedAsset?.issuer,
				memoText
			);
			
			if (!payment) {
				addNotification('error', 'Fallo Simulación', 'La billetera del cliente no tiene suficientes fondos o no está habilitada.');
			}
		} catch (e) {
			console.error(e);
			addNotification('error', 'Fallo Simulación', 'Error de red Stellar en el simulador.');
		} finally {
			isSimulating = false;
		}
	}

	function formatKey(key: string): string {
		if (!key) return '';
		return `${key.slice(0, 8)}...${key.slice(-8)}`;
	}

	function resetForm() {
		amount = 0;
		memoText = '';
		generatedQrValue = '';
		orderState = 'input';
	}
</script>

<div class="max-w-xl m-auto bg-slate-900/40 border border-slate-800 backdrop-blur-md p-8 rounded-3xl shadow-2xl relative overflow-hidden animate-fadeIn">
	<div class="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

	{#if orderState === 'input'}
		<div>
			<h2 class="text-2xl font-black text-slate-100 tracking-tight mb-2">Generar Cobro</h2>
			<p class="text-xs text-slate-400 mb-6">Especifica el monto, activo y memo para crear un código QR dinámico de cobro.</p>
			
			<div class="space-y-5">
				<!-- Monto -->
				<div>
					<label for="bill-amount" class="text-slate-400 text-xs font-semibold">Monto a Cobrar</label>
					<input
						type="number"
						id="bill-amount"
						class="w-full bg-slate-950 border-slate-800 text-slate-150 px-4 py-3 rounded-xl mt-1.5 focus:border-indigo-500 text-lg font-bold"
						bind:value={amount}
						placeholder="0.00"
						min="0"
					/>
				</div>

				<!-- Activo -->
				<div>
					<label for="bill-asset" class="text-slate-400 text-xs font-semibold">Seleccionar Criptomoneda</label>
					<select
						id="bill-asset"
						class="w-full bg-slate-950 border border-slate-800 text-slate-350 px-4 py-3 rounded-xl mt-1.5 focus:border-indigo-500 outline-none transition-colors"
						bind:value={selectedAssetCode}
					>
						{#each SUPPORTED_ASSETS as sa}
							<option value={sa.code}>{sa.name} ({sa.code})</option>
						{/each}
					</select>
				</div>

				<!-- Memo -->
				<div>
					<label for="bill-memo" class="text-slate-400 text-xs font-semibold">Concepto / Memo (Texto Opcional)</label>
					<input
						type="text"
						id="bill-memo"
						class="w-full bg-slate-950 border-slate-800 text-slate-200 px-4 py-3 rounded-xl mt-1.5 focus:border-indigo-500 text-sm font-semibold"
						bind:value={memoText}
						placeholder="Ej. Mesa 4, Pedido #12"
						maxlength="28"
					/>
				</div>

				<!-- Trustline Warning -->
				{#if !hasTrustline}
					<div class="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl flex flex-col gap-2.5">
						<div class="flex items-start gap-2 text-red-400">
							<svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
							</svg>
							<div>
								<h5 class="text-xs font-bold">Trustline Requerida</h5>
								<p class="text-[10px] text-red-300 leading-relaxed mt-0.5">
									Aún no has habilitado {selectedAssetCode} en tu cuenta de comercio. Debes crear un canal de confianza para recibir este token.
								</p>
							</div>
						</div>
						<button 
							on:click={handleEnableTrustline}
							disabled={enablingTrustline}
							class="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-xl border border-red-500/30 transition-colors disabled:opacity-50"
						>
							{#if enablingTrustline}
								Estableciendo confianza...
							{:else}
								Habilitar {selectedAssetCode} ahora
							{/if}
						</button>
					</div>
				{/if}

				<!-- Botón de Envío -->
				<button
					on:click={generateBilling}
					disabled={!hasTrustline || !amount || amount <= 0}
					class="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed mt-4"
				>
					Generar Código QR de Cobro
				</button>
			</div>
		</div>
	{:else if orderState === 'waiting'}
		<div class="flex flex-col items-center text-center">
			<h2 class="text-xl font-black text-slate-100 tracking-tight mb-1">Esperando Pago</h2>
			<p class="text-xs text-slate-400 mb-6">Muestra el código QR al cliente para realizar el pago.</p>

			<!-- QR Code display -->
			<div class="p-6 bg-white rounded-3xl shadow-xl inline-block border border-slate-200 hover:scale-[1.01] transition-transform duration-300">
				<WalletQR value={generatedQrValue} size="240" />
			</div>

			<!-- Detalle de la Orden -->
			<div class="w-full bg-slate-950/40 border border-slate-850 rounded-2xl p-4 mt-6 space-y-2.5 text-left text-xs">
				<div class="flex justify-between">
					<span class="text-slate-500 font-semibold">Monto:</span>
					<span class="text-slate-200 font-extrabold font-mono">{amount} {selectedAssetCode}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-500 font-semibold">Activo:</span>
					<span class="text-slate-200 font-bold">{selectedAsset?.name} ({selectedAssetCode})</span>
				</div>
				{#if memoText}
					<div class="flex justify-between">
						<span class="text-slate-500 font-semibold">Memo:</span>
						<span class="text-slate-200 font-mono">{memoText}</span>
					</div>
				{/if}
				<div class="flex justify-between border-t border-slate-900 pt-2.5">
					<span class="text-slate-500 font-semibold">Destinatario:</span>
					<span class="text-indigo-400 font-mono font-medium">{formatKey($session.stellarAccount.pubKey)}</span>
				</div>
			</div>

			<!-- Loading Indicator -->
			<div class="flex items-center gap-2 mt-6 text-xs text-indigo-400 font-semibold bg-indigo-500/5 px-4 py-2.5 rounded-full border border-indigo-500/10">
				<div class="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
				Escuchando pagos entrantes en Stellar...
			</div>

			<!-- Simulador de pago del cliente -->
			<div class="w-full flex gap-3 mt-6">
				<button 
					on:click={resetForm}
					class="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-250 text-xs font-bold rounded-xl transition-all border border-slate-700"
				>
					Cancelar
				</button>
				<button
					on:click={simulateClientPayment}
					disabled={isSimulating}
					class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
				>
					{#if isSimulating}
						<div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Simulando...
					{:else}
						Simular Pago Cliente
					{/if}
				</button>
			</div>
		</div>
	{:else if orderState === 'success'}
		<div class="flex flex-col items-center text-center py-6">
			<!-- Checkmark Animation -->
			<div class="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mb-6 shadow-lg shadow-emerald-950/20">
				<svg class="w-8 h-8 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
				</svg>
			</div>

			<h2 class="text-2xl font-black text-slate-100 tracking-tight">Cobro Recibido</h2>
			<p class="text-xs text-slate-400 mt-1.5">La transacción se ha confirmado y los fondos están disponibles.</p>

			<div class="w-full bg-slate-950/40 border border-slate-850 rounded-2xl p-5 mt-6 space-y-3 text-sm">
				<div class="flex justify-between">
					<span class="text-slate-500 font-semibold">Monto Acreditado:</span>
					<span class="text-emerald-400 font-extrabold font-mono text-base">+{amount} {selectedAssetCode}</span>
				</div>
				{#if memoText}
					<div class="flex justify-between text-xs">
						<span class="text-slate-500 font-semibold">Memo:</span>
						<span class="text-slate-200 font-mono">{memoText}</span>
					</div>
				{/if}
				<div class="flex justify-between border-t border-slate-900 pt-3 text-xs">
					<span class="text-slate-500 font-semibold">Estado:</span>
					<span class="text-emerald-400 font-bold flex items-center gap-1">
						<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
						Liquidado
					</span>
				</div>
			</div>

			<button
				on:click={resetForm}
				class="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold rounded-xl transition-all shadow-md mt-6"
			>
				Generar Nuevo Cobro
			</button>
		</div>
	{/if}
</div>

<style>
	/* Select overrides for design consistency */
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
