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
			<Label class="text-black text-xl font-bold ">Pub key</Label>
			<Input
				class="bg-slate-300"
				bind:value={addr}
				on:change={storeAddr}
			/>

			<Label class="text-black text-xl font-bold ">Priv key</Label>
			<Input
				class="bg-slate-300"
				bind:value={priv}
				on:change={storePriv}
			/>

			{#if !addr || !priv}
				<Alert color="red">
					Deberá completar su clavr public y privada
				</Alert>
			{/if}
		</div>

		<Card
			padding="xl"
			size="md"
			class="rounded-3xl border-gray-300 items-center  bg-gray-400 m-auto"
		>
			<Wallet address={addr} pasword={priv} />
		</Card>
		<button on:click={connectWallet} class="btn">
			Conectar Wallet connect
		</button>
	</div>
</main>
