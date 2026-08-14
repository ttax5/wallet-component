import * as StellarSdk from '@stellar/stellar-sdk';
import { stellarNetwork } from '../../stellar_account';
import { AssetCodes } from '../../globals';
import { Asset, Networks, Operation } from '@stellar/stellar-sdk';

/**
 * Emisores de activos en la Testnet de Stellar.
 * USDC en Testnet está emitido por Centre (Circle).
 */
const ASSET_ISSUERS: Partial<Record<AssetCodes, string>> = {
	[AssetCodes.USDC]: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
};

/**
 * Resuelve el objeto Asset de Stellar según el código de activo.
 */
function resolveAsset(assetCode: AssetCodes): Asset {
	if (assetCode === AssetCodes.XLM) {
		return Asset.native();
	}
	const issuer = ASSET_ISSUERS[assetCode];
	if (!issuer) {
		throw new Error(`Activo no soportado: ${assetCode}. Falta el emisor (issuer).`);
	}
	return new Asset(assetCode, issuer);
}

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

	if (assetCode === AssetCodes.XLM) {
		const balanceNativo = accountResult.balances.find((balance) => balance.asset_type === 'native');
		return balanceNativo ? parseFloat(balanceNativo.balance) : 0;
	} else {
		const customBalance = accountResult.balances.find(
			(balance: any) => balance.asset_code === assetCode,
		);
		return customBalance ? parseFloat(customBalance.balance) : 0;
	}
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

		const asset = resolveAsset(assetCode);
		const operation1 = transaction.addOperation(
			Operation.payment({
				destination: beneficiary,
				amount: String(monto),
				asset,
			}),
		);
		const operation2 = operation1.setTimeout(100);

		const pruebaArmada = operation2.build();
		console.log(pruebaArmada);

		pruebaArmada.sign(sourceKeys);
		const pruebaTerminada = await server.submitTransaction(pruebaArmada);
		console.log(pruebaTerminada);
		paymentRealized="hecho"
		paymentDone = {
			amount: monto,
			destination: beneficiary,
			assetCode: assetCode,
		};
	} catch (err) {
		console.log(err);
		paymentRealized="fallido"
	}
}

// TODO agregar parametro a la funcion con la stellar account asi no se hardcodea en el codigo la pubkey
export async function paymentsdones(accountId = "GDNHIOSGUNBCZ7PNU7TLE4MPMUUHNDECZ7534MNI2BHRGLDIXDQTL3PG") {
	const payments = await server.payments().forAccount(accountId).call();
	console.log(payments);
	return payments;
}
