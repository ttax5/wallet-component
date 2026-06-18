import * as StellarSdk from '@stellar/stellar-sdk';
import { stellarNetwork } from '../../stellar_account';
import { AssetCodes } from '../../globals';
import { Asset, Networks, Operation } from '@stellar/stellar-sdk';

const server = new StellarSdk.Horizon.Server(stellarNetwork);

/**
 * Network con la que voy a trabajar
 * TESTNET es la red de pruebas de stellar
 * PUBLIC es la red principal de stellar
 *
 */
const network = Networks.TESTNET;
export let horizonEventSource: EventSource | null = null
export async function eventSourceListener(
	account: string,
	cb: Function,
	errCb: Function,
) {
		horizonEventSource = new EventSource(
			`https://horizon-testnet.stellar.org/accounts/${account}/payments`,
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

	// Create an API call to query payments involving the account.

	const accountResult = await server.accounts().accountId(accountId).call();

	const balanceNativo = accountResult.balances.filter((balance) => {
//		console.log('Type:', balance.asset_type, ', Balance:', balance.balance)

		return balance.asset_type == 'native';
		//return balance.asset_code === assetCode;
	});
	console.info('los balances son', accountResult.balances);

	console.info('el balance nativo es', balanceNativo);

	return parseFloat(accountResult.balances[0].balance);
}

/**
 *
 * @param monto el monto a pagar
 * @param payer el User es la claeve public y privada del user
 * @param beneficiary el string de la clave public
 * @param assetCode el codigo del activo que se quiere enviar
 */

export let paymentDone: PaymentDone
export let paymentRealized:string
export async function createPayment(
	monto: number,
	payer: User,
	beneficiary: string,
	assetCode: AssetCodes = AssetCodes.XLM,
) {
	paymentRealized="proceso"
	try {
		const sourceKeys = await StellarSdk.Keypair.fromSecret(payer.privKey);
		const sourceAcount = await server.loadAccount(payer.pubKey);

		const transaction = new StellarSdk.TransactionBuilder(sourceAcount, {
			fee: StellarSdk.BASE_FEE,
			networkPassphrase: network,
		});

		const operation1 = transaction.addOperation(
			Operation.payment({
				destination: beneficiary,
				amount: String(monto),
				asset: Asset.native(),
			}),
		);
		const operation2 = operation1.setTimeout(100);

		const pruebaArmada = operation2.build();
		console.log(pruebaArmada);

		pruebaArmada.sign(sourceKeys);
		const pruebaTerminada = await server.submitTransaction(pruebaArmada);
		console.log(pruebaTerminada);
		paymentRealized="hecho"
		paymentDone ={
			amount:monto,
			destination: beneficiary,
		};
	} catch (err) {
		console.log(err);
		paymentRealized="fallido"
	}
}

// TODO agregar parametro a la funcion con la stellar account asi no se hardcodea en el codigo la pubkey
export async function paymentsdones() {
	const payments = await server.payments().forAccount("GDNHIOSGUNBCZ7PNU7TLE4MPMUUHNDECZ7534MNI2BHRGLDIXDQTL3PG").call();

	console.log(payments);
}

paymentsdones();
