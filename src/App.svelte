<script lang="ts">
	import Wallet from './lib/Wallet.svelte';
	import {
		Alert,
		Card,
		Heading,
		Hr,
		Input,
		Label,
		Span,
	} from 'flowbite-svelte';

	//PROBANDO WALLET KIT
	//npm i @reown/walletkit @walletconnect/utils @walletconnect/core

	import { Core } from '@walletconnect/core'
	import { WalletKit } from '@reown/walletkit'
	import { crearYFondearWalletTestnet } from './service/blockchains/stellar';

	const core = new Core({
	projectId: '718db8dd3bdd8a270d49ea62522c0805'
	})

	const metadata = {
	name: 'Wallet Paxapos',
	description: 'AppKit Example',
	url: 'http://localhost:5173/', // origin must match your domain & subdomain
	icons: ['https://assets.reown.com/reown-profile-pic.png']
	}

	const walletKit = WalletKit.init({
	core, // <- pass the shared 'core' instance
	metadata
	})



	async function connectWallet() {
    try {
        const session = await walletKit;
        console.log('Conectado:', session);
        // Aquí puedes almacenar la dirección de la wallet o cualquier otra información necesaria
    } catch (error) {
        console.error('Error al conectar:', error);
    }
}

	// cargar pubKey de stellar
	let addr: string = localStorage.getItem('addr') || '';

	let priv: string = localStorage.getItem('priv') || '';

	function storeAddr(event: any) {
		addr = event.target.value;
		localStorage.setItem('addr', addr);
	}

	function storePriv(event: any) {
		priv = event.target.value;
		localStorage.setItem('priv', priv);
	}

	let loadingTestnet = false;
	let testnetError = '';
	let testnetSuccess = false;
	let showPrivateKey = false;

	async function generarCuentaTestnet() {
		loadingTestnet = true;
		testnetError = '';
		testnetSuccess = false;
		try {
			const res = await crearYFondearWalletTestnet();
			addr = res.publicKey;
			priv = res.secretKey;
			localStorage.setItem('addr', addr);
			localStorage.setItem('priv', priv);
			testnetSuccess = true;
		} catch (error: any) {
			console.error(error);
			testnetError = 'No se pudo crear o fondear la cuenta de pruebas. Inténtalo de nuevo.';
		} finally {
			loadingTestnet = false;
		}
	}
</script>

<main class="flex flex-col max-w-max m-auto p-10">
	<Heading
		tag="h1"
		class="mb-4 text-center"
		customSize="text-3xl font-extrabold  md:text-5xl lg:text-6xl"
	>
		<h1><Span gradient>Proyecto Wallet</Span></h1>
	</Heading>

	<Heading
		tag="h2"
		class="mb-4  text-orange-300 text-center"
		customSize="text-lg font-extrabold  md:text-5xl lg:text-6xl"
		>web-component</Heading
	>

	<p class="text-lg">
		Usaremos <code>Svelte, flownbite-svelte y tailwind</code> para armar nuestros
		componentes
	</p>

	<div class="flex flex-col gap-8 my-10">
		<div>
			<Label class="text-slate-300 text-xl font-bold ">Pub key</Label>
			<Input
				class="bg-slate-800 text-slate-200 border-slate-600"
				bind:value={addr}
				on:change={storeAddr}
			/>

			<Label class="text-slate-300 text-xl font-bold ">Priv key</Label>
			<div class="relative mb-4">
				<Input
					type={showPrivateKey ? 'text' : 'password'}
					class="bg-slate-800 text-slate-200 border-slate-600 pr-10 w-full"
					bind:value={priv}
					on:change={storePriv}
				/>
				<button
					type="button"
					on:click={() => showPrivateKey = !showPrivateKey}
					class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
					style="background: transparent; border: none; box-shadow: none; margin: 0; padding: 0 0.75rem;"
				>
					{#if showPrivateKey}
						<!-- Eye Off Icon -->
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3.5 3.5 0 114.83 4.83m-2.83-2.83l.008-.008m3.562-3.243a10.05 10.05 0 00-4.947-1.243c-3.18 0-6.07 1.48-8 3.83m19.833 3.83a9.97 9.97 0 01-1.883 3.556m-3.277-1.357a8.959 8.959 0 01-4.08 1.157M3 3l18 18" />
						</svg>
					{:else}
						<!-- Eye Icon -->
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
						</svg>
					{/if}
				</button>
			</div>

			{#if !addr || !priv}
				<Alert color="red" class="mt-4">
					Deberá completar su clavr public y privada
				</Alert>
			{/if}

			<div class="flex flex-col gap-4 mt-6">
				<button 
					on:click={generarCuentaTestnet} 
					class="btn w-full"
					disabled={loadingTestnet}
				>
					{#if loadingTestnet}
						<div class="flex items-center justify-center gap-2">
							<div class="loader" style="width: 20px; height: 20px; border-width: 2px;"></div>
							Generando y fondeando cuenta...
						</div>
					{:else}
						Generar Cuenta de Pruebas (Testnet + 10k XLM)
					{/if}
				</button>

				{#if testnetSuccess}
					<Alert color="green">
						¡Cuenta creada con éxito! Se cargaron 10,000 XLM de prueba en tu saldo.
					</Alert>
				{/if}

				{#if testnetError}
					<Alert color="red">
						{testnetError}
					</Alert>
				{/if}
			</div>
		</div>

		<Card
			padding="xl"
			size="md"
			class="rounded-3xl border-slate-700 items-center bg-slate-800/60 m-auto"
		>
			<Wallet address={addr} pasword={priv} />
		</Card>
		<button on:click={connectWallet} class="btn">
			Conectar Wallet connect
		</button>
	</div>
</main>
