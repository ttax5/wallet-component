// Cuentas demo de Stellar Testnet.
// Las claves privadas NO se versionan: se cargan desde .env (ignorado por git).
// Ver .env.example para las variables esperadas.
const env = import.meta.env;

export const stellarAccount1 = {
	pubKey: env.VITE_DEMO_ACCOUNT_1_PUBLIC_KEY || '',
	privKey: env.VITE_DEMO_ACCOUNT_1_PRIVATE_KEY || ''
};

export const stellarAccount2 = {
	pubKey: env.VITE_DEMO_ACCOUNT_2_PUBLIC_KEY || '',
	privKey: env.VITE_DEMO_ACCOUNT_2_PRIVATE_KEY || ''
};

export const stellarNetwork = 'https://horizon-testnet.stellar.org/';
