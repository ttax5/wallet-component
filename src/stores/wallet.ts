import { writable } from 'svelte/store';
import type { AssetBalance } from '../types';

export const balances = writable<AssetBalance[]>([]);
export const loadingBalances = writable<boolean>(false);
export const transactions = writable<any[]>([]);
export const loadingTransactions = writable<boolean>(false);
export const selectedAssetCode = writable<string>('XLM');
