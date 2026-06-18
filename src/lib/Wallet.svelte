<script lang="ts">
	import { ButtonGroup, Button, Modal, Input } from 'flowbite-svelte';
	import { getBalance } from '../service/blockchains/stellar';
	import WalletQR from './WalletQR.svelte';
	import WalletSaldoHistory from './WalletSaldoHistory.svelte';

	import {
		Dropdown,
		DropdownItem,
		DropdownHeader,
		Avatar,
	} from 'flowbite-svelte';
	import { BellSolid, EyeSolid } from 'flowbite-svelte-icons';
	import { eventSourceListener } from '../service/blockchains/stellar';
	//import { getTransactions } from '../service/blockchains/stellar';
	import { horizonEventSource } from '../service/blockchains/stellar';
	import { paymentsdones } from '../service/blockchains/stellar';
	import { paymentRealized } from '../service/blockchains/stellar';
	import { createEventDispatcher } from 'svelte';
	export let address: string;
	export let pasword: string;

	let saldo = 0;
	let saldoFormateado = '';
	$: if (saldo > 0) {
		const formateador = new Intl.NumberFormat('es-AR', {
			style: 'currency',
			currency: 'ARS',
			minimumFractionDigits: 2, // Cantidad mínima de decimales
			maximumFractionDigits: 2, // Cantidad máxima de decimales
		});
		saldoFormateado = formateador.format(saldo);
	}
	$: if (saldo == 0) {
		saldoFormateado = 'Sin saldo';
	}

	let openModalQR = false;
	function generarQr() {
		openModalQR = true;
	}

	let openModalWalletSaldoHistory = false;
	function WalletSaldo() {
		openModalWalletSaldoHistory = true;
	}

	let openModalPagar = false;
	function pagar() {
		openModalPagar = true;
	}
	getBalance(address).then((res) => {
		saldo = res;
	});
	export let listTransactions:object[]=[]
	$: if (address.length == 56) {

		eventSourceListener(
			address,
			async (res: any) => {
				console.info('me llego un mensaje', res);
				listTransactions.push(res)
				saldo = await getBalance(address);
				console.log(listTransactions)
			},
			(msgError: any) => {
				//console.error('me paso algo malisimo', msgError);
			},
		);
		
	}
	$: if (address.length !== 56) {
		listTransactions=[]
		horizonEventSource?.close();
		console.log(saldo);
		saldo = 0;
	}
	const dispatcher = createEventDispatcher();
	$: if (paymentRealized) {
		dispatcher('paymentDone', paymentDone);
		getBalance(address).then((res) => {
			saldo = res;
		});
	}

	/*De esta manera se ejecutaria una transacción en la testnet de stellar*/
	import InputPagar from './InputPagar.svelte';
	import { get } from 'svelte/store';

	let paymentDone: PaymentDone | null = null;

	function manejarPagoRealizado(event: CustomEvent<PaymentDone>) {
		paymentDone = event.detail;
		setTimeout(() => {
			paymentDone = null;
		}, 5000);
		openModalPagar = false;
	}
</script>

<Modal bind:open={openModalQR} autoclose>
	<div class="m-auto flex justify-center">
		<WalletQR value={address} size="500" />
	</div>
</Modal>

<Modal bind:open={openModalWalletSaldoHistory} autoclose>
	<div class="m-auto flex justify-center">
		<WalletSaldoHistory />
	</div>
</Modal>

<Modal bind:open={openModalPagar}>
	<div class="text-center justify-center align-middle">
		<InputPagar
			stellarAccount={{
				pubKey: address,
				privKey: pasword,
			}}
			on:paymentDone={manejarPagoRealizado}
		/>
	</div>
</Modal>

<div class="flex items-center flex-wrap gap-4">

	<h1 class="text-gray-800 text-3xl sixa-max">{saldoFormateado}</h1>
	<ButtonGroup>
		<Button
			class="bg-gray-300"
			outline
			color="light"
			on:click={generarQr}
			disabled={address.length != 56}
		>
			Generar QR
			<svg
				class="w-6 h-6 text-gray-800 dark:text-white"
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke="currentColor"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 4h6v6H4V4Zm10 10h6v6h-6v-6Zm0-10h6v6h-6V4Zm-4 10h.01v.01H10V14Zm0 4h.01v.01H10V18Zm-3 2h.01v.01H7V20Zm0-4h.01v.01H7V16Zm-3 2h.01v.01H4V18Zm0-4h.01v.01H4V14Z"
				/>
				<path
					stroke="currentColor"
					stroke-linejoin="round"
					stroke-width="2"
					d="M7 7h.01v.01H7V7Zm10 10h.01v.01H17V17Z"
				/>
			</svg>
		</Button>
		<Button class="bg-gray-300" outline color="light" on:click={pagar} disabled={address.length != 56 && pasword.length != 56}>
			Pagar
			<svg
				class="w-6 h-6 text-gray-800 dark:text-white"
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				fill="none"
				viewBox="0 0 24 24"
>
				<path
					stroke="currentColor"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8 17.345a4.76 4.76 0 0 0 2.558 1.618c2.274.589 4.512-.446 4.999-2.31.487-1.866-1.273-3.9-3.546-4.49-2.273-.59-4.034-2.623-3.547-4.488.486-1.865 2.724-2.899 4.998-2.31.982.236 1.87.793 2.538 1.592m-3.879 12.171V21m0-18v2.2"
				/>
				
			</svg>
		</Button >
		<Button
			class="bg-gray-300"
			outline
			color="light"
			on:click={WalletSaldo}
			disabled={address.length != 56}
		>
			<svg
				class="w-6 h-6 text-gray-800 dark:text-white"
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				fill="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					d="M17.133 12.632v-1.8a5.406 5.406 0 0 0-4.154-5.262.955.955 0 0 0 .021-.106V3.1a1 1 0 0 0-2 0v2.364a.955.955 0 0 0 .021.106 5.406 5.406 0 0 0-4.154 5.262v1.8C6.867 15.018 5 15.614 5 16.807 5 17.4 5 18 5.538 18h12.924C19 18 19 17.4 19 16.807c0-1.193-1.867-1.789-1.867-4.175ZM8.823 19a3.453 3.453 0 0 0 6.354 0H8.823Z"
				/>
			</svg>
		</Button>
	</ButtonGroup>
	<div class="payRealized ">

		{#if paymentDone}
		{#if paymentRealized=="proceso"}
		<div class="loader"></div>
		{/if}
		{#if paymentRealized=="hecho"}
			<div
				class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative"
				role="alert"
			>
				<strong class="font-bold">Pago realizado!</strong>
				<span class="block sm:inline"
					>Se envió {paymentDone.amount} a {paymentDone.destination}</span
				>
			</div>
		{/if}
		{#if paymentRealized=="fallido" && (paymentDone.amount==undefined || paymentDone.amount<=0)}
			<div
				class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
				role="alert"
			>
				<strong class="font-bold">¡No se pueden enviar montos nulos o negativos!</strong>
			</div>
		{/if}
		{#if paymentRealized=="fallido" && (paymentDone.destination==undefined || paymentDone.destination.length!==56)}
			<div
				class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
				role="alert"
			>
				<strong class="font-bold">¡Cuenta de destino invalida!</strong>
			</div>
		{/if}
		{#if paymentRealized=="fallido" && (paymentDone.amount!==undefined && paymentDone.amount>0 ) && ( paymentDone.destination!==undefined && paymentDone.destination.length==56 )}
			<div
				class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
				role="alert"
			>
				<strong class="font-bold">Pago fallido!</strong>
				<span class="block sm:inline"
					>No se pudo enviar {paymentDone.amount} a {paymentDone.destination}</span
				>
			</div>
		{/if}
		{/if}
	</div>
</div>
