import { getOptionalEnv } from './services/env';

export const stellarNetwork = getOptionalEnv('VITE_STELLAR_NETWORK_URL') ?? 'https://horizon-testnet.stellar.org/';

