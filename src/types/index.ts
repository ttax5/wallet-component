export interface GoogleUser {
	email: string;
	name: string;
	picture: string;
	id?: string;
}

export interface StellarAccount {
	pubKey: string;
	privKey: string;
}

export interface UserSession {
	isAuthenticated: boolean;
	method: 'google' | 'developer';
	googleUser?: GoogleUser;
	stellarAccount: StellarAccount;
}

export interface PaymentDone {
	amount: number;
	destination: string;
	assetCode: string;
	assetIssuer?: string;
	memo?: string;
	transactionHash?: string;
}

export interface AssetBalance {
	code: string;
	issuer?: string;
	balance: number;
	name: string;
	logo: string;
	usdValue: number;
	hasTrustline: boolean;
}

export interface AppNotification {
	id: string;
	type: 'payment_received' | 'payment_sent' | 'error' | 'trustline' | 'security';
	title: string;
	message: string;
	timestamp: Date;
	read: boolean;
	amount?: number;
	asset?: string;
}

export type ViewType = 'dashboard' | 'billing' | 'payment' | 'assets' | 'history' | 'settings';
