import { loginGoogle, loginDeveloper, logout as sessionLogout } from '../stores/session';
import { addNotification } from '../stores/notifications';
import { crearYFondearWalletTestnet } from './stellar';
import type { GoogleUser, StellarAccount } from '../types';

const GOOGLE_CLIENT_ID = '912634358485-mockclientid12345.apps.googleusercontent.com'; // ID Cliente de ejemplo

// Carga e inicializa el script de Google Identity Services
export function initGoogleAuth(onSuccess: (user: GoogleUser) => void) {
	if (typeof window === 'undefined') return;

	const handleCredentialResponse = (response: any) => {
		const payload = parseJwt(response.credential);
		if (payload) {
			const googleUser: GoogleUser = {
				email: payload.email,
				name: payload.name,
				picture: payload.picture,
				id: payload.sub
			};
			onSuccess(googleUser);
		} else {
			addNotification('error', 'Error de Autenticación', 'No se pudo verificar la firma del token de Google.');
		}
	};

	if (!document.getElementById('google-gsi-client')) {
		const script = document.createElement('script');
		script.id = 'google-gsi-client';
		script.src = 'https://accounts.google.com/gsi/client';
		script.async = true;
		script.defer = true;
		script.onload = () => {
			setupGoogleButton(handleCredentialResponse);
		};
		document.head.appendChild(script);
	} else {
		setupGoogleButton(handleCredentialResponse);
	}
}

function setupGoogleButton(callback: (res: any) => void) {
	// @ts-ignore
	if (window.google) {
		// @ts-ignore
		window.google.accounts.id.initialize({
			client_id: GOOGLE_CLIENT_ID,
			callback: callback,
			auto_select: false
		});
	}
}

export function renderGoogleSignInButton(containerId: string) {
	// @ts-ignore
	if (window.google && document.getElementById(containerId)) {
		// @ts-ignore
		window.google.accounts.id.renderButton(
			document.getElementById(containerId),
			{
				theme: 'filled_blue',
				size: 'large',
				shape: 'pill',
				width: '100%',
				locale: 'es'
			}
		);
	}
}

export function parseJwt(token: string) {
	try {
		const base64Url = token.split('.')[1];
		const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
		const jsonPayload = decodeURIComponent(
			window
				.atob(base64)
				.split('')
				.map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
				.join('')
		);
		return JSON.parse(jsonPayload);
	} catch (error) {
		console.error('Error al decodificar token JWT de Google:', error);
		return null;
	}
}

// Obtener o crear llaves de Stellar para un ID de Google
export async function getOrCreateStellarKeys(userId: string): Promise<StellarAccount> {
	const key = `paxapos_stellar_keys_${userId}`;
	const stored = localStorage.getItem(key);
	if (stored) {
		return JSON.parse(stored);
	}

	// Si no existe, crear y fondear una nueva cuenta de prueba en la Stellar Testnet
	addNotification('security', 'Creando Cuenta Web3', 'Generando nuevas llaves criptográficas no custodias...');
	const account = await crearYFondearWalletTestnet();
	const stellarAccount: StellarAccount = {
		pubKey: account.publicKey,
		privKey: account.secretKey
	};
	localStorage.setItem(key, JSON.stringify(stellarAccount));
	addNotification('trustline', 'Cuenta Creada', 'Tus llaves de Stellar se generaron con éxito y se fondearon con 10,000 XLM.');
	return stellarAccount;
}

// Iniciar sesión con Google
export async function authenticateWithGoogle(googleUser: GoogleUser) {
	try {
		const userId = googleUser.id || googleUser.email;
		const stellarAccount = await getOrCreateStellarKeys(userId);
		loginGoogle(googleUser, stellarAccount);
		addNotification('security', 'Sesión Iniciada', `Bienvenido al panel, ${googleUser.name}`);
	} catch (e) {
		console.error('Error durante autenticación con Google:', e);
		addNotification('error', 'Error al Iniciar Sesión', 'No se pudieron crear o recuperar las credenciales Stellar.');
	}
}

// Iniciar sesión en modo Desarrollador
export async function authenticateDeveloper(pubKey: string, privKey: string) {
	if (pubKey.length !== 56 || privKey.length !== 56) {
		addNotification('error', 'Llaves Inválidas', 'Las claves de Stellar deben tener exactamente 56 caracteres.');
		return false;
	}
	const stellarAccount: StellarAccount = { pubKey, privKey };
	loginDeveloper(stellarAccount);
	addNotification('security', 'Modo Desarrollador Activo', 'Has ingresado con tus llaves manuales.');
	return true;
}

// Recuperar acceso importando una llave privada
export async function recoverAccount(privKey: string, googleUser?: GoogleUser): Promise<boolean> {
	try {
		// Validar que la clave sea un seed válido de Stellar
		const keypair = await import('@stellar/stellar-sdk').then(m => m.Keypair.fromSecret(privKey));
		const pubKey = keypair.publicKey();
		const stellarAccount: StellarAccount = { pubKey, privKey };

		if (googleUser && googleUser.id) {
			// Asociar a su cuenta de Google actual
			localStorage.setItem(`paxapos_stellar_keys_${googleUser.id}`, JSON.stringify(stellarAccount));
			loginGoogle(googleUser, stellarAccount);
		} else {
			// Desarrollador
			loginDeveloper(stellarAccount);
		}
		addNotification('security', 'Cuenta Recuperada', 'Acceso restablecido exitosamente usando tu clave privada.');
		return true;
	} catch (e) {
		addNotification('error', 'Fallo al Recuperar', 'La clave privada ingresada no es válida.');
		return false;
	}
}

// Cierre de sesión
export function logout() {
	sessionLogout();
	addNotification('security', 'Sesión Cerrada', 'Has cerrado tu sesión de forma segura.');
}
