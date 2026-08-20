import { doc, getDoc, setDoc, collection, query, orderBy, limit as firestoreLimit, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { StellarAccount } from '../types';

export interface UserProfileData {
	uid: string;
	name: string;
	email: string;
	photoURL?: string;
	stellarAccount: StellarAccount;
	createdAt?: string;
	updatedAt?: any;
}

export interface TransactionRecord {
	id: string;
	type: string;
	created_at: string;
	transaction_hash: string;
	from: string;
	to: string;
	amount: string;
	asset_code: string;
	asset_issuer?: string;
	funder?: string;
	account?: string;
	starting_balance?: string;
	memo?: string;
}

/**
 * Servicio centralizado y escalable para interactuar con Cloud Firestore.
 * Organiza las colecciones en una arquitectura modular no relacional (NoSQL).
 */

// 1. Perfil del Usuario (/users/{uid})
export async function fetchUserProfile(uid: string): Promise<UserProfileData | null> {
	try {
		const userDocRef = doc(db, 'users', uid);
		const docSnap = await getDoc(userDocRef);
		if (docSnap.exists()) {
			return docSnap.data() as UserProfileData;
		}
		return null;
	} catch (error) {
		console.error(`[FirestoreService] Error al obtener el perfil para ${uid}:`, error);
		throw error;
	}
}

export async function saveUserProfile(profile: UserProfileData): Promise<void> {
	try {
		const userDocRef = doc(db, 'users', profile.uid);
		const dataToSave = {
			...profile,
			updatedAt: serverTimestamp()
		};
		await setDoc(userDocRef, dataToSave, { merge: true });
	} catch (error) {
		console.error(`[FirestoreService] Error al guardar el perfil para ${profile.uid}:`, error);
		throw error;
	}
}

// 2. Historial de Transacciones (/users/{uid}/transactions/{txHash})
export async function saveTransactionRecord(uid: string, record: TransactionRecord): Promise<void> {
	try {
		const txHash = record.transaction_hash || record.id;
		if (!txHash) return;

		const txRef = doc(db, 'users', uid, 'transactions', txHash);
		const dataToSave = {
			...record,
			id: record.id || txHash,
			transaction_hash: txHash,
			updatedAt: serverTimestamp()
		};

		await setDoc(txRef, dataToSave, { merge: true });
	} catch (error) {
		console.error(`[FirestoreService] Error al guardar transacción para ${uid}:`, error);
	}
}

export async function fetchUserTransactions(uid: string, limitCount = 20): Promise<TransactionRecord[]> {
	try {
		const txCollectionRef = collection(db, 'users', uid, 'transactions');
		const q = query(txCollectionRef, orderBy('created_at', 'desc'), firestoreLimit(limitCount));
		const snap = await getDocs(q);

		return snap.docs.map(doc => doc.data() as TransactionRecord);
	} catch (error) {
		console.error(`[FirestoreService] Error al consultar transacciones para ${uid}:`, error);
		return [];
	}
}

// 3. Extensión Futura: Cobros / Facturas del Comercio (/users/{uid}/invoices/{invoiceId})
export async function saveMerchantInvoice(uid: string, invoiceData: any): Promise<void> {
	try {
		const invoiceRef = doc(collection(db, 'users', uid, 'invoices'));
		await setDoc(invoiceRef, {
			...invoiceData,
			createdAt: new Date().toISOString(),
			updatedAt: serverTimestamp()
		});
	} catch (error) {
		console.error(`[FirestoreService] Error al guardar factura comercial para ${uid}:`, error);
	}
}
