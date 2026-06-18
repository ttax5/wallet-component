<script lang="ts">
	import { session } from '../stores/session';
	import { balances } from '../stores/wallet';
	import { SUPPORTED_ASSETS, establishTrustline, loadBalances } from '../services/stellar';
	import { addNotification } from '../stores/notifications';

	let customCode = '';
	let customIssuer = '';
	let addingAsset = false;

	let showPrivateKey = false;
	let loadingActionCode = '';

	async function handleAddCustomAsset() {
		// Validar entradas
		if (customCode.length < 2 || customCode.length > 12) {
			addNotification('error', 'Código Inválido', 'El código del token debe tener entre 2 y 12 caracteres alfanuméricos.');
			return;
		}

		if (customIssuer.length !== 56 || !customIssuer.startsWith('G')) {
			addNotification('error', 'Emisor Inválido', 'La clave pública del emisor debe iniciar con "G" y tener 56 caracteres.');
			return;
		}

		addingAsset = true;
		
		try {
			addNotification('security', 'Creando Trustline', `Estableciendo canal de confianza para ${customCode}...`);
			const success = await establishTrustline(
				$session.stellarAccount,
				customCode.toUpperCase().trim(),
				customIssuer.trim()
			);

			if (success) {
				customCode = '';
				customIssuer = '';
				addNotification('trustline', 'Activo Registrado', `Se habilitó el token personalizado ${customCode.toUpperCase()} en tu cuenta.`);
				await loadBalances($session.stellarAccount.pubKey);
			}
		} catch (e) {
			console.error(e);
			addNotification('error', 'Fallo al Habilitar', 'Ocurrió un error al enviar la transacción a Stellar.');
		} finally {
			addingAsset = false;
		}
	}

	async function handleEnableTrustline(code: string, issuer?: string) {
		if (!issuer) return;
		loadingActionCode = code;
		await establishTrustline($session.stellarAccount, code, issuer);
		loadingActionCode = '';
	}

	function copyToClipboard(text: string, label: string) {
		navigator.clipboard.writeText(text);
		addNotification('security', 'Copiado', `La ${label} se copió al portapapeles.`);
	}
</script>

<div class="space-y-6 animate-fadeIn">
	<!-- Panel de Seguridad y Resguardo de Claves -->
	<div class="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md relative overflow-hidden">
		<div class="absolute -top-12 -right-12 w-28 h-28 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>
		
		<div class="flex items-start gap-3">
			<!-- Shield Check Icon -->
			<div class="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl shrink-0 mt-0.5">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
				</svg>
			</div>
			<div class="flex-1">
				<h3 class="text-sm font-extrabold text-slate-200 tracking-wide">Copia de Seguridad y Llaves Criptográficas</h3>
				<p class="text-xs text-slate-400 mt-1 leading-relaxed">
					En el ecosistema Stellar, tú eres el dueño absoluto de tus fondos. Guarda esta Clave Privada en un lugar seguro. Si pierdes el navegador o borras la caché, necesitarás esta clave para recuperar el acceso a tus saldos.
				</p>
			</div>
		</div>

		<div class="bg-slate-950/40 border border-slate-850 p-4 rounded-xl mt-5 space-y-4">
			<div>
				<span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Dirección Pública (Public Key)</span>
				<div class="flex items-center justify-between gap-3 mt-1 text-xs font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-900 text-slate-300">
					<span class="truncate pr-4 select-all">{$session.stellarAccount.pubKey}</span>
					<button 
						on:click={() => copyToClipboard($session.stellarAccount.pubKey, 'Dirección Pública')}
						class="text-indigo-400 hover:text-indigo-300 font-bold font-sans shrink-0 hover:scale-102 transition-transform"
					>
						Copiar
					</button>
				</div>
			</div>

			<div>
				<span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Clave Privada (Secret Key)</span>
				{#if showPrivateKey}
					<div class="flex items-center justify-between gap-3 mt-1 text-xs font-mono bg-red-950/20 border border-red-500/20 p-2.5 rounded-lg text-red-300">
						<span class="truncate pr-4 select-all">{$session.stellarAccount.privKey}</span>
						<div class="flex gap-2 shrink-0 font-sans font-bold">
							<button 
								on:click={() => copyToClipboard($session.stellarAccount.privKey, 'Clave Privada')}
								class="text-red-400 hover:text-red-300"
							>
								Copiar
							</button>
							<button 
								on:click={() => showPrivateKey = false}
								class="text-slate-400 hover:text-slate-300"
							>
								Ocultar
							</button>
						</div>
					</div>
				{:else}
					<button
						on:click={() => showPrivateKey = true}
						class="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-350 text-xs font-bold rounded-xl transition-all mt-1 flex items-center gap-1.5"
					>
						Mostrar Clave Privada Secreta
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Listado de Activos del Comercio -->
	<div class="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
		<h3 class="text-sm font-bold text-slate-300 mb-4 tracking-wide">Administrar Canales de Confianza (Trustlines)</h3>

		<div class="flex flex-col gap-3.5">
			{#if $balances.length > 0}
				{#each $balances as item}
					<div class="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
						<div class="flex items-center gap-3">
							<img src={item.logo} alt={item.code} class="w-8 h-8 rounded-full bg-slate-900" />
							<div>
								<h4 class="text-xs font-bold text-slate-200">{item.name}</h4>
								<span class="text-[9px] text-slate-500 font-semibold truncate block max-w-[140px] font-mono sm:max-w-none" title={item.issuer}>
									{item.code} {#if item.issuer}(Emisor: {item.issuer.slice(0, 6)}...{item.issuer.slice(-6)}){/if}
								</span>
							</div>
						</div>

						<div class="flex items-center gap-4">
							{#if item.code === 'XLM'}
								<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
									Nativo
								</span>
							{:else if item.hasTrustline}
								<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
									<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
									Activo
								</span>
							{:else}
								<button
									on:click={() => handleEnableTrustline(item.code, item.issuer)}
									disabled={loadingActionCode === item.code}
									class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
								>
									{#if loadingActionCode === item.code}
										Habilitando...
									{:else}
										Habilitar Activo
									{/if}
								</button>
							{/if}
						</div>
					</div>
				{/each}
			{:else}
				{#each Array(3) as _}
					<div class="w-full h-14 bg-slate-800/40 rounded-xl animate-pulse"></div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Formulario para Activo Personalizado -->
	<div class="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
		<h3 class="text-sm font-bold text-slate-300 mb-2 tracking-wide">Añadir Activo Personalizado de Stellar</h3>
		<p class="text-xs text-slate-400 mb-5">Habilita cualquier token (activo) compatible con Stellar ingresando su código de activo y emisor.</p>
		
		<div class="space-y-4">
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div class="sm:col-span-1">
					<label for="custom-code" class="text-slate-400 text-xs font-semibold">Código del Activo</label>
					<input
						type="text"
						id="custom-code"
						class="w-full bg-slate-950 border-slate-800 text-slate-200 px-3 py-2.5 rounded-xl mt-1.5 focus:border-indigo-500 uppercase font-semibold text-xs"
						bind:value={customCode}
						placeholder="Ej. ARS, EURT"
						maxlength="12"
					/>
				</div>

				<div class="sm:col-span-2">
					<label for="custom-issuer" class="text-slate-400 text-xs font-semibold">Dirección del Emisor (Issuer Key)</label>
					<input
						type="text"
						id="custom-issuer"
						class="w-full bg-slate-950 border-slate-800 text-slate-200 px-3 py-2.5 rounded-xl mt-1.5 focus:border-indigo-500 font-mono text-xs"
						bind:value={customIssuer}
						placeholder="G..."
					/>
				</div>
			</div>

			<button
				on:click={handleAddCustomAsset}
				disabled={addingAsset || !customCode || !customIssuer}
				class="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed mt-2"
			>
				{#if addingAsset}
					Enviando trustline a Stellar...
				{:else}
					Habilitar y Registrar Activo Personalizado
				{/if}
			</button>
		</div>
	</div>
</div>
