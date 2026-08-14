<script lang="ts">
	import { Input, Select } from 'flowbite-svelte';
	import { createEventDispatcher } from 'svelte';
	import { AssetCodes } from '../globals';
	import { createPayment } from '../service/blockchains/stellar';

	export let stellarAccount: User;

	let amount: number;
	let recipient: string;
	let monedaSeleccionada: AssetCodes = AssetCodes.XLM;

	let monedasDisponibles = [
		{
			value: AssetCodes.XLM,
			name: 'Stellar Lumens (XLM)',
		},
		{
			value: AssetCodes.USDC,
			name: 'USD Coin (USDC)',
		},
	];

	const dispatcher = createEventDispatcher();

	async function submitForm() {
		console.log(`Amount: ${amount}, Recipient: ${recipient}, Asset: ${monedaSeleccionada}`);
		cargando = true;
		const assetToSend = (monedaSeleccionada || AssetCodes.XLM) as AssetCodes;
		await createPayment(amount, stellarAccount, recipient, assetToSend);
		cargando = false;
		const paymentDone: PaymentDone = {
			amount,
			destination: recipient,
			assetCode: assetToSend,
		};
		dispatcher('paymentDone', paymentDone);
	}
	let cargando = false;
</script>

<div
	class=" items-center bg-white-900 "
>
	<div class="bg-white-200 p-6 rounded-lg ">
		<h2 class="text-black text-2xl font-bold mb-4">Enviar Transacción Stellar</h2>
		<div class="mb-4">
			<label for="amount" class="block text-gray-700 mb-2">Monto</label>
			<Input
				type="number"
				bind:value={amount}
				placeholder="Ingrese el monto a pagar"
				class="border border-gray-400 rounded-md focus:ring-black-500 focus:ring-black-500 focus:border-black-500"
			/>
		</div>

		<div class="mb-4">
			<label for="amount" class="block text-gray-700 mb-2">Activo</label>
			<Select 
				placeholder="Opciones"
				class="mt-2  border-gray-400 rounded-md focus:ring-black-500  focus:border-black-500"
				items={monedasDisponibles}
				bind:value={monedaSeleccionada}
				
			/>	
		</div>

		<div class="mb-4">
			<label for="recipient" class="block text-gray-700 mb-2"
				>Destinatario</label
			>
			<input
				type="text"
				id="recipient"
				bind:value={recipient}
				class="w-full border-gray-400 px-3 py-2 border bg-gray-100 rounded-md"
			/>
		</div>
		<div class=" items-center justify-center space-x-4">
			<button
				class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
				on:click={() => {
					amount = 0;
					recipient = '';
				}}>Cancelar</button
			>
			<button disabled={cargando}
				class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
				on:click={submitForm}>
				{#if cargando}
				Enviando
				{:else}
				Enviar
				{/if}

				</button
			>
		</div>
	</div>
</div>

