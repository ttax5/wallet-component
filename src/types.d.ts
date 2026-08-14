interface User {
	pubKey: string;
	privKey: string;
}

interface PaymentDone {
	amount: number;
	destination: string;
	assetCode?: string;
}
