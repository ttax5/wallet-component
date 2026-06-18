<script lang="ts">
	import { onMount } from 'svelte';
	import { initGoogleAuth, authenticateWithGoogle, authenticateDeveloper, recoverAccount } from '../services/auth';
	import { crearYFondearWalletTestnet } from '../services/stellar';
	import { addNotification } from '../stores/notifications';

	let activeTab: 'google' | 'developer' | 'recovery' = 'google';
	
	// Para login de desarrollador
	let devPubKey = 'GAISBLYYRGUC5E4BOLOJSEGTJCRAMFEMUX6JK42NMVR3UAL567GDD7ML';
	let devPrivKey = 'SCATEAOCBWHTOGVS6TWC6HE36YX5XCHOETNWL3OISKESUVL3OR7ZQMPT';
	
	// Para recuperación
	let recoveryKey = '';
	let loadingRecovery = false;

	let loadingDev = false;
	let showDevPasswords = false;

	onMount(() => {
		// Inicializar la API de Google con callback de éxito
		initGoogleAuth(async (googleUser) => {
			await authenticateWithGoogle(googleUser);
		});
		
		// Renderizar botón si estamos en la pestaña google
		renderButton();
	});

	function renderButton() {
		setTimeout(() => {
			// @ts-ignore
			if (window.google && document.getElementById('googleBtnContainer')) {
				// @ts-ignore
				window.google.accounts.id.renderButton(
					document.getElementById('googleBtnContainer'),
					{
						theme: 'filled_blue',
						size: 'large',
						shape: 'pill',
						width: 340,
						locale: 'es'
					}
				);
			}
		}, 100);
	}

	$: if (activeTab === 'google') {
		renderButton();
	}

	async function handleDeveloperLogin() {
		loadingDev = true;
		try {
			const success = await authenticateDeveloper(devPubKey, devPrivKey);
			if (!success) {
				loadingDev = false;
			}
		} catch (e) {
			loadingDev = false;
			addNotification('error', 'Error', 'No se pudo iniciar sesión en modo desarrollador.');
		}
	}

	async function generateDemoAccount() {
		loadingDev = true;
		try {
			addNotification('security', 'Generando Cuenta Demo', 'Solicitando fondos a Stellar Friendbot...');
			const account = await crearYFondearWalletTestnet();
			devPubKey = account.publicKey;
			devPrivKey = account.secretKey;
			loadingDev = false;
			addNotification('trustline', 'Cuenta Fondeada', 'Se ha generado una nueva clave con 10,000 XLM.');
		} catch (error) {
			loadingDev = false;
			addNotification('error', 'Error Friendbot', 'El bot de testnet está lento. Reintenta o usa las llaves predeterminadas.');
		}
	}

	async function handleRecoverySubmit() {
		if (recoveryKey.length !== 56 || !recoveryKey.startsWith('S')) {
			addNotification('error', 'Clave Secreta Inválida', 'La clave privada de Stellar debe iniciar con "S" y tener 56 caracteres.');
			return;
		}
		loadingRecovery = true;
		const success = await recoverAccount(recoveryKey);
		loadingRecovery = false;
		if (success) {
			recoveryKey = '';
		}
	}
</script>

<div class="auth-wrapper flex items-center justify-center min-h-[90vh] px-4">
	<div class="auth-card w-full max-w-md p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl relative overflow-hidden">
		<!-- Decoraciones de Brillo -->
		<div class="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
		<div class="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

		<!-- Cabecera de Logo -->
		<div class="text-center mb-8">
			<div class="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-lg mb-4 text-white">
				<!-- Icono Escudo/Wallet -->
				<svg class="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
				</svg>
			</div>
			<h2 class="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
				PAXAPOS COMERCIO
			</h2>
			<p class="text-sm text-slate-400 mt-2 font-medium">Pasarela de pagos Stellar lista para producción</p>
		</div>

		<!-- Selector de Pestañas -->
		<div class="flex bg-slate-950/60 p-1 rounded-xl mb-6 border border-slate-850">
			<button
				class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 {activeTab === 'google' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}"
				on:click={() => activeTab = 'google'}
			>
				Google Login
			</button>
			<button
				class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 {activeTab === 'developer' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}"
				on:click={() => activeTab = 'developer'}
			>
				Desarrollador
			</button>
			<button
				class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 {activeTab === 'recovery' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}"
				on:click={() => activeTab = 'recovery'}
			>
				Recuperación
			</button>
		</div>

		<!-- Contenido de Pestañas -->
		{#if activeTab === 'google'}
			<div class="flex flex-col items-center py-4 text-center">
				<p class="text-xs text-slate-400 mb-6 max-w-[320px]">
					Inicia sesión de forma segura usando tu cuenta de Google. Tu billetera Stellar no custodia se generará o recuperará a partir de tu identidad.
				</p>
				
				<!-- Google Button Container -->
				<div class="w-full flex justify-center py-2 min-h-[50px]">
					<div id="googleBtnContainer" class="hover:scale-102 transition-transform duration-200"></div>
				</div>

				<div class="flex items-center gap-2 mt-6 text-[10px] text-slate-500">
					<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M2.166 4.9L10 9.554L17.834 4.9a2 2 0 00-2.333-.19L10 7.848L4.5 4.71a2 2 0 00-2.333.19zM18 6.943v6.07a2 2 0 01-1.096 1.78L10 18.577l-6.904-3.784A2 2 0 012 13.013V6.943l8 4.708l8-4.708z" clip-rule="evenodd" />
					</svg>
					OAuth 2.0 gestionado directamente por Google
				</div>
			</div>
		{:else if activeTab === 'developer'}
			<div class="flex flex-col gap-4">
				<p class="text-xs text-slate-400 text-center">
					Ingresa con llaves Stellar manuales de Testnet o genera una cuenta nueva con saldo ficticio de inmediato.
				</p>
				
				<div>
					<label for="dev-pub" class="text-slate-400 text-xs font-semibold">Dirección Pública (G...)</label>
					<input
						type="text"
						id="dev-pub"
						class="w-full bg-slate-950 border-slate-800 text-slate-200 text-xs px-3 py-2.5 rounded-xl mt-1 font-mono focus:border-indigo-500"
						bind:value={devPubKey}
						placeholder="GD..."
					/>
				</div>

				<div>
					<label for="dev-priv" class="text-slate-400 text-xs font-semibold flex justify-between">
						Clave Privada (S...)
						<button 
							type="button" 
							class="text-[10px] text-indigo-400 hover:text-indigo-300 normal-case font-medium tracking-normal"
							on:click={() => showDevPasswords = !showDevPasswords}
						>
							{showDevPasswords ? 'Ocultar' : 'Mostrar'}
						</button>
					</label>
					{#if showDevPasswords}
						<input
							type="text"
							id="dev-priv"
							class="w-full bg-slate-950 border-slate-800 text-slate-200 text-xs px-3 py-2.5 rounded-xl mt-1 font-mono focus:border-indigo-500"
							bind:value={devPrivKey}
							placeholder="SC..."
						/>
					{:else}
						<input
							type="password"
							id="dev-priv"
							class="w-full bg-slate-950 border-slate-800 text-slate-200 text-xs px-3 py-2.5 rounded-xl mt-1 font-mono focus:border-indigo-500"
							bind:value={devPrivKey}
							placeholder="SC..."
						/>
					{/if}
				</div>

				<div class="flex flex-col gap-3 mt-4">
					<button
						on:click={handleDeveloperLogin}
						disabled={loadingDev}
						class="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all shadow-md"
					>
						{#if loadingDev}
							Cargando...
						{:else}
							Ingresar a la Plataforma
						{/if}
					</button>

					<button
						on:click={generateDemoAccount}
						disabled={loadingDev}
						class="w-full py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-700 transition-colors border border-slate-750"
					>
						Generar Cuenta Nueva (Testnet + 10k XLM)
					</button>
				</div>
			</div>
		{:else if activeTab === 'recovery'}
			<div class="flex flex-col gap-4">
				<p class="text-xs text-slate-400 text-center">
					¿Cerraste sesión o perdiste acceso? Ingresa tu clave privada secreta Stellar para restaurar tu panel de control local.
				</p>

				<div>
					<label for="recovery-key" class="text-slate-400 text-xs font-semibold">Clave Secreta de Recuperación (S...)</label>
					<textarea
						id="recovery-key"
						rows="3"
						class="w-full bg-slate-950 border-slate-800 text-slate-200 text-xs px-3 py-2.5 rounded-xl mt-1 font-mono focus:border-indigo-500 resize-none outline-none border transition-all"
						bind:value={recoveryKey}
						placeholder="SCATEAOCBW..."
					></textarea>
				</div>

				<button
					on:click={handleRecoverySubmit}
					disabled={loadingRecovery || !recoveryKey}
					class="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all shadow-md mt-2"
				>
					{#if loadingRecovery}
						Verificando y Recuperando...
					{:else}
						Importar y Recuperar Acceso
					{/if}
				</button>
				
				<div class="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl mt-2 flex items-start gap-2">
					<svg class="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<p class="text-[10px] text-indigo-300 leading-relaxed">
						Tu clave secreta se procesa localmente en tu navegador y nunca se envía a ningún servidor. Mantén esta clave bajo resguardo estricto.
					</p>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.auth-card {
		box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
		animation: cardFadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes cardFadeUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	/* Reset extra styles for textareas to prevent Tailwind overrides */
	textarea {
		background: var(--bg-input) !important;
		border: 1px solid var(--border-subtle) !important;
		color: var(--text-primary) !important;
		border-radius: 12px !important;
	}
	textarea:focus {
		border-color: var(--accent-indigo) !important;
		box-shadow: 0 0 0 3px var(--glow-color) !important;
	}
</style>
