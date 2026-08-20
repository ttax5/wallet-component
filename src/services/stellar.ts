import * as StellarSdk from '@stellar/stellar-sdk';
import { Asset, Networks, Operation } from '@stellar/stellar-sdk';
import { stellarNetwork } from '../stellar_account';
import type { AssetBalance, StellarAccount, PaymentDone } from '../types';
import { addNotification } from '../stores/notifications';
import { balances as balancesStore, loadingBalances, transactions as transactionsStore, loadingTransactions } from '../stores/wallet';
import { db, auth } from './firebase';
import { saveTransactionRecord, fetchUserTransactions } from './firestore';

const server = new StellarSdk.Horizon.Server(stellarNetwork);
const network = Networks.TESTNET;

export let horizonEventSource: EventSource | null = null;

// Faucet / Emisor central de USDC y USDT en Testnet para pruebas
const FAUCET_PUB = 'GAZTQJBGXOXT5C34JH3RDHYLMFAANXMQLBKJKOEMVBBEAVOB3HHSSAUD';
const FAUCET_PRIV = 'SBYVPORGBKBYGLGHPDZ7BIFZR5LL666I25YXXLS3GP3ZEU4BOCONXYY2';

// Lista de activos admitidos por defecto en nuestra interfaz
export const SUPPORTED_ASSETS = [
	{
		code: 'XLM',
		name: 'Stellar Lumens',
		logo: 'https://cryptologos.cc/logos/stellar-xlm-logo.png',
		issuer: undefined,
		type: 'native'
	},
	{
		code: 'USDC',
		name: 'USD Coin',
		logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
		issuer: FAUCET_PUB,
		type: 'credit_alphanum4'
	},
	{
		code: 'USDT',
		name: 'Tether USD',
		logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
		issuer: FAUCET_PUB,
		type: 'credit_alphanum4'
	}
];

// Helper para sincronizar transacciones en Firestore
export async function syncTransactionToFirestore(uid: string, record: any) {
	const txHash = record.transaction_hash || record.hash;
	if (!txHash) return;
	
	await saveTransactionRecord(uid, {
		id: record.id || txHash,
		type: record.type || 'payment',
		created_at: record.created_at || new Date().toISOString(),
		transaction_hash: txHash,
		from: record.from || '',
		to: record.to || '',
		amount: record.amount || '0',
		asset_code: record.asset_code || 'XLM',
		asset_issuer: record.asset_issuer || '',
		funder: record.funder || '',
		account: record.account || '',
		starting_balance: record.starting_balance || ''
	});
}

// Faucet automático para activos secundarios
export async function fundWithFaucet(userPubKey: string, assetCode: string, assetIssuer: string) {
	try {
		console.log(`Fondeando 1000 ${assetCode} al usuario desde Faucet...`);
		const faucetKeys = StellarSdk.Keypair.fromSecret(FAUCET_PRIV);
		const faucetAccount = await server.loadAccount(FAUCET_PUB);

		const asset = new Asset(assetCode, assetIssuer);
		const transaction = new StellarSdk.TransactionBuilder(faucetAccount, {
			fee: StellarSdk.BASE_FEE,
			networkPassphrase: network,
		})
		.addOperation(
			Operation.payment({
				destination: userPubKey,
				asset: asset,
				amount: '1000.0000000'
			})
		)
		.setTimeout(180)
		.build();

		transaction.sign(faucetKeys);
		await server.submitTransaction(transaction);
		
		addNotification(
			'payment_received',
			'Saldo Inicial Recibido',
			`¡El Faucet te ha enviado 1000 ${assetCode} de prueba!`,
			1000,
			assetCode
		);
	} catch (err) {
		console.error(`Error al fondear ${assetCode} con Faucet:`, err);
	}
}

// Cargar saldos de la cuenta e integrar metadatos y conversión a USD
export async function loadBalances(address: string) {
	if (!address || address.length !== 56) {
		balancesStore.set([]);
		return;
	}
	loadingBalances.set(true);
	try {
		const accountInfo = await server.accounts().accountId(address).call();
		const horizonBalances = accountInfo.balances;

		const activeBalances: AssetBalance[] = SUPPORTED_ASSETS.map(supported => {
			const found = horizonBalances.find(hb => {
				if (supported.type === 'native') {
					return hb.asset_type === 'native';
				} else {
					const b = hb as { asset_code?: string; asset_issuer?: string };
					return b.asset_code === supported.code && b.asset_issuer === supported.issuer;
				}
			});

			const balanceVal = found ? parseFloat(found.balance) : 0;
			const rate = supported.code === 'XLM' ? 0.12 : 1.0;
			const usdValue = balanceVal * rate;

			return {
				code: supported.code,
				name: supported.name,
				logo: supported.logo,
				issuer: supported.issuer,
				balance: balanceVal,
				usdValue: usdValue,
				hasTrustline: found ? true : false
			};
		});

		horizonBalances.forEach(hb => {
			if (hb.asset_type === 'native') return;
			const b = hb as { asset_code?: string; asset_issuer?: string; balance: string };
			const isSupported = SUPPORTED_ASSETS.some(sa => sa.code === b.asset_code && sa.issuer === b.asset_issuer);
			if (!isSupported) {
				const balanceVal = parseFloat(b.balance);
				activeBalances.push({
					code: b.asset_code || 'TOKEN',
					name: `${b.asset_code} Token`,
					logo: 'https://raw.githubusercontent.com/stellar/stellar-protocol/master/ecosystem/stellar-logo.png',
					issuer: b.asset_issuer,
					balance: balanceVal,
					usdValue: balanceVal,
					hasTrustline: true
				});
			}
		});

		balancesStore.set(activeBalances);
	} catch (error: any) {
		console.error('Error al cargar balances:', error);
		if (error.response && error.response.status === 404) {
			const unactivatedBalances: AssetBalance[] = SUPPORTED_ASSETS.map(supported => ({
				code: supported.code,
				name: supported.name,
				logo: supported.logo,
				issuer: supported.issuer,
				balance: 0,
				usdValue: 0,
				hasTrustline: supported.code === 'XLM'
			}));
			balancesStore.set(unactivatedBalances);
		} else {
			addNotification('error', 'Error de Red', 'No se pudieron leer los balances desde Horizon.');
		}
	} finally {
		loadingBalances.set(false);
	}
}

// Cargar el historial de transacciones (pagos)
export async function loadTransactionsHistory(address: string) {
	if (!address || address.length !== 56) {
		transactionsStore.set([]);
		return;
	}
	loadingTransactions.set(true);
	try {
		// 1. Consultar de Horizon directamente (Blockchain real)
		const response = await server
			.payments()
			.forAccount(address)
			.order('desc')
			.limit(15)
			.call();
		
		// 2. Si el usuario está en Firebase, sincronizar transacciones en Firestore
		const firebaseUser = auth.currentUser;
		if (firebaseUser) {
			for (const record of response.records) {
				await syncTransactionToFirestore(firebaseUser.uid, record);
			}

			// 3. Consultar y ordenar desde Firestore usando el servicio centralizado
			const localRecords = await fetchUserTransactions(firebaseUser.uid, 15);
			transactionsStore.set(localRecords.length > 0 ? localRecords : response.records);
		} else {
			transactionsStore.set(response.records);
		}
	} catch (error) {
		console.error('Error al cargar historial de pagos:', error);
		transactionsStore.set([]);
	} finally {
		loadingTransactions.set(false);
	}
}

// Establecer trustline para USDC, USDT o activos personalizados
export async function establishTrustline(payer: StellarAccount, assetCode: string, assetIssuer: string): Promise<boolean> {
	try {
		const sourceKeys = StellarSdk.Keypair.fromSecret(payer.privKey);
		const sourceAccount = await server.loadAccount(payer.pubKey);

		const asset = new Asset(assetCode, assetIssuer);
		const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
			fee: StellarSdk.BASE_FEE,
			networkPassphrase: network,
		})
		.addOperation(
			Operation.changeTrust({
				asset: asset,
				limit: '922337203685.4775807'
			})
		)
		.setTimeout(180)
		.build();

		transaction.sign(sourceKeys);
		await server.submitTransaction(transaction);
		
		addNotification('trustline', 'Activo Habilitado', `Has establecido la confianza (trustline) para ${assetCode}.`);
		
		// Si es USDC o USDT y usa nuestro Faucet, enviar saldo inicial automáticamente
		if (assetIssuer === FAUCET_PUB) {
			setTimeout(async () => {
				await fundWithFaucet(payer.pubKey, assetCode, assetIssuer);
				await loadBalances(payer.pubKey);
			}, 2000);
		} else {
			await loadBalances(payer.pubKey);
		}
		
		return true;
	} catch (e) {
		console.error('Error al establecer trustline:', e);
		addNotification('error', 'Fallo de Trustline', `No se pudo habilitar el activo ${assetCode}. Verifica tu saldo XLM para la reserva.`);
		return false;
	}
}

// Crear pago en Stellar (soportando XLM o tokens personalizados y Memos)
export async function createPayment(
	monto: number,
	payer: StellarAccount,
	beneficiary: string,
	assetCode: string,
	assetIssuer?: string,
	memoText?: string
): Promise<PaymentDone | null> {
	try {
		const sourceKeys = StellarSdk.Keypair.fromSecret(payer.privKey);
		const sourceAccount = await server.loadAccount(payer.pubKey);

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

		let paymentAsset = Asset.native();
		if (assetCode !== 'XLM' && assetIssuer) {
			paymentAsset = new Asset(assetCode, assetIssuer);
		}

		const transactionBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
			fee: StellarSdk.BASE_FEE,
			networkPassphrase: network,
		});

		if (assetCode === 'XLM' && !destinationExists) {
			transactionBuilder.addOperation(
				Operation.createAccount({
					destination: beneficiary,
					startingBalance: String(monto),
				})
			);
		} else {
			if (!destinationExists) {
				addNotification('error', 'Destinatario No Existe', 'La cuenta de destino no está fondeada y no puede recibir tokens.');
				return null;
			}

			if (assetCode !== 'XLM' && assetIssuer) {
				const destInfo = await server.accounts().accountId(beneficiary).call();
				const hasTrust = destInfo.balances.some(b => {
					if (b.asset_type === 'native') return false;
					const tokenBalance = b as { asset_code?: string; asset_issuer?: string };
					return tokenBalance.asset_code === assetCode && tokenBalance.asset_issuer === assetIssuer;
				});
				if (!hasTrust) {
					addNotification('error', 'Destinatario sin Trustline', `El destinatario no ha habilitado el activo ${assetCode}.`);
					return null;
				}
			}

			transactionBuilder.addOperation(
				Operation.payment({
					destination: beneficiary,
					amount: String(monto),
					asset: paymentAsset,
				})
			);
		}

		if (memoText && memoText.trim() !== '') {
			transactionBuilder.addMemo(StellarSdk.Memo.text(memoText));
		}

		const transaction = transactionBuilder.setTimeout(180).build();
		transaction.sign(sourceKeys);
		const result = await server.submitTransaction(transaction);

		const paymentDetails: PaymentDone = {
			amount: monto,
			destination: beneficiary,
			assetCode: assetCode,
			assetIssuer: assetIssuer,
			memo: memoText,
			transactionHash: result.hash
		};

		addNotification(
			'payment_sent',
			'Pago Enviado',
			`Enviaste ${monto} ${assetCode} a ${beneficiary.slice(0, 6)}...${beneficiary.slice(-6)}`,
			monto,
			assetCode
		);

		// Sincronizar en Firestore
		const firebaseUser = auth.currentUser;
		if (firebaseUser) {
			const mockRecord = {
				id: result.hash,
				type: 'payment',
				created_at: new Date().toISOString(),
				transaction_hash: result.hash,
				from: payer.pubKey,
				to: beneficiary,
				amount: String(monto),
				asset_code: assetCode,
				asset_issuer: assetIssuer || '',
				funder: '',
				account: '',
				starting_balance: '0'
			};
			await syncTransactionToFirestore(firebaseUser.uid, mockRecord);
		}

		// Recargar estados de forma inmediata
		await loadBalances(payer.pubKey);
		await loadTransactionsHistory(payer.pubKey);

		return paymentDetails;
	} catch (error) {
		console.error('Error en transferencia Stellar:', error);
		addNotification('error', 'Transacción Fallida', 'La transacción fue rechazada. Revisa el saldo o el destinatario.');
		return null;
	}
}

// Suscripción EventSource en tiempo real para cobros y transacciones entrantes
export function subscribeToPayments(account: string) {
	if (horizonEventSource) {
		horizonEventSource.close();
	}

	const baseUrl = stellarNetwork.endsWith('/') ? stellarNetwork.slice(0, -1) : stellarNetwork;
	horizonEventSource = new EventSource(`${baseUrl}/accounts/${account}/payments?cursor=now`);
	
	horizonEventSource.onmessage = async (message) => {
		try {
			const record = JSON.parse(message.data);
			
			const isIncomingPayment = record.type === 'payment' && record.to === account && record.from !== account;
			const isIncomingCreation = record.type === 'create_account' && record.account === account && record.funder !== account;

			if (isIncomingPayment || isIncomingCreation) {
				const amount = isIncomingPayment ? parseFloat(record.amount) : parseFloat(record.starting_balance);
				const code = isIncomingPayment ? (record.asset_code || 'XLM') : 'XLM';
				const sender = isIncomingPayment ? record.from : record.funder;

				addNotification(
					'payment_received',
					'Cobro Recibido',
					`¡Has recibido un pago de ${amount} ${code} de ${sender.slice(0, 6)}...${sender.slice(-6)}!`,
					amount,
					code
				);

				// Sincronizar en Firestore
				const firebaseUser = auth.currentUser;
				if (firebaseUser) {
					await syncTransactionToFirestore(firebaseUser.uid, record);
				}

				// Actualizar balances e historial en segundo plano
				await loadBalances(account);
				await loadTransactionsHistory(account);
			}
		} catch (e) {
			console.error('Error al procesar mensaje de Horizon EventSource:', e);
		}
	};

	horizonEventSource.onerror = (err) => {
		console.error('Error en Horizon EventSource, reiniciando...', err);
	};
}

export function unsubscribeFromPayments() {
	if (horizonEventSource) {
		horizonEventSource.close();
		horizonEventSource = null;
	}
}

// Crear y fondear cuenta de pruebas (Testnet) usando Friendbot
export async function crearYFondearWalletTestnet() {
	const keypair = StellarSdk.Keypair.random();
	const publicKey = keypair.publicKey();
	const secretKey = keypair.secret();

	const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
	if (!response.ok) {
		throw new Error('Error al fondear la cuenta con Friendbot');
	}
	await response.json();
	return {
		publicKey,
		secretKey,
	};
}

