import * as StellarSdk from '@stellar/stellar-sdk';
import { stellarNetwork } from '../../stellar_account';
import { AssetCodes } from '../../globals';
import { Asset, Networks, Operation } from '@stellar/stellar-sdk';
import { writable } from 'svelte/store';

const server = new StellarSdk.Horizon.Server(stellarNetwork);

/**
 * Network con la que voy a trabajar
 * TESTNET es la red de pruebas de stellar
 * PUBLIC es la red principal de stellar
 *
 */
const network = Networks.TESTNET;
export let horizonEventSource: EventSource | null = null;

export async function eventSourceListener(
	account: string,
	cb: Function,
	errCb: Function,
) {
	if (horizonEventSource) {
		horizonEventSource.close();
	}
	const baseUrl = stellarNetwork.endsWith('/') ? stellarNetwork.slice(0, -1) : stellarNetwork;
	horizonEventSource = new EventSource(
		`${baseUrl}/accounts/${account}/payments`,
	);
	console.info('me levantoi OK el event source', horizonEventSource);
	horizonEventSource.onmessage = function (message) {
		cb(message);
	};

	horizonEventSource.onerror = function (error) {
		errCb(error);
	};
}

export async function getBalance(
	addr: string,
	assetCode: AssetCodes = AssetCodes.XLM,
): Promise<number> {
	const accountId = addr;

	const accountResult = await server.accounts().accountId(accountId).call();

	const balanceNativo = accountResult.balances.filter((balance) => {
		return balance.asset_type == 'native';
	});
	console.info('los balances son', accountResult.balances);
	console.info('el balance nativo es', balanceNativo);

	return balanceNativo.length > 0 ? parseFloat(balanceNativo[0].balance) : 0;
}

/**
 * Stores para el manejo de estados de la transacción de forma reactiva
 */
export const paymentDone = writable<PaymentDone | null>(null);
export const paymentRealized = writable<'idle' | 'proceso' | 'hecho' | 'fallido'>('idle');

/**
 *
 * @param monto el monto a pagar
 * @param payer el User es la claeve public y privada del user
 * @param beneficiary el string de la clave public
 * @param assetCode el codigo del activo que se quiere enviar
 */
export async function createPayment(
	monto: number,
	payer: User,
	beneficiary: string,
	assetCode: AssetCodes = AssetCodes.XLM,
) {
	paymentRealized.set("proceso");
	paymentDone.set(null);
	
	try {
		const sourceKeys = await StellarSdk.Keypair.fromSecret(payer.privKey);
		const sourceAcount = await server.loadAccount(payer.pubKey);

		// Verificar si la cuenta destino existe
		let destinationExists = true;
		try {
			await server.accounts().accountId(beneficiary).call();
		} catch (error: any) {
			if (error.response && error.response.status === 404) {
				destinationExists = false;
			} else {
				throw error;
			}
		}

		const transaction = new StellarSdk.TransactionBuilder(sourceAcount, {
			fee: StellarSdk.BASE_FEE,
			networkPassphrase: network,
		});

		if (destinationExists) {
			// Si la cuenta existe, se realiza un pago normal
			transaction.addOperation(
				Operation.payment({
					destination: beneficiary,
					amount: String(monto),
					asset: Asset.native(),
				}),
			);
		} else {
			// Si la cuenta no existe, se usa createAccount para activarla en la red
			transaction.addOperation(
				Operation.createAccount({
					destination: beneficiary,
					startingBalance: String(monto),
				}),
			);
		}

		const operation2 = transaction.setTimeout(100);
		const pruebaArmada = operation2.build();
		console.log(pruebaArmada);

		pruebaArmada.sign(sourceKeys);
		const pruebaTerminada = await server.submitTransaction(pruebaArmada);
		console.log(pruebaTerminada);
		
		paymentDone.set({
			amount: monto,
			destination: beneficiary,
		});
		paymentRealized.set("hecho");
	} catch (err) {
		console.log("Error en createPayment:", err);
		paymentDone.set({
			amount: monto,
			destination: beneficiary,
		});
		paymentRealized.set("fallido");
	}
}

/**
 * Obtiene el historial de pagos de una cuenta desde la red Stellar (Horizon)
 * @param accountId Dirección pública de la cuenta
 */
export async function getTransactionsHistory(accountId: string): Promise<any[]> {
	try {
		const response = await server
			.payments()
			.forAccount(accountId)
			.order('desc')
			.limit(20)
			.call();
		return response.records;
	} catch (error) {
		console.error('Error fetching transactions history:', error);
		return [];
	}
}

export async function crearYFondearWalletTestnet() {
	const keypair = StellarSdk.Keypair.random();
	const publicKey = keypair.publicKey();
	const secretKey = keypair.secret();

	const response = await fetch(
		`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
	);
	if (!response.ok) {
		throw new Error('Error al fondear la cuenta con Friendbot');
	}
	await response.json();
	return {
		publicKey,
		secretKey,
	};
}


