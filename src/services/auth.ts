import { loginGoogle, loginDeveloper, logout as sessionLogout, session } from '../stores/session';
import { addNotification } from '../stores/notifications';
import { crearYFondearWalletTestnet, establishTrustline, SUPPORTED_ASSETS } from './stellar';
import type { GoogleUser, StellarAccount } from '../types';
import { auth, db } from './firebase';
import { GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Keypair } from '@stellar/stellar-sdk';

import { fetchUserProfile, saveUserProfile } from './firestore';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '912634358485-mockclientid12345.apps.googleusercontent.com';

// Escuchar cambios de estado de autenticación en Firebase
onAuthStateChanged(auth, async (firebaseUser) => {
	if (firebaseUser) {
		try {
			const profile = await fetchUserProfile(firebaseUser.uid);
			if (profile && profile.stellarAccount) {
				const googleUser: GoogleUser = {
					email: firebaseUser.email || profile.email || '',
					name: firebaseUser.displayName || profile.name || '',
					picture: firebaseUser.photoURL || profile.photoURL || '',
					id: firebaseUser.uid
				};
				loginGoogle(googleUser, profile.stellarAccount);
			}
		} catch (error) {
			console.error("Error al restaurar sesión de Firebase:", error);
		}
	} else {
		// Si se desautentica de Firebase, desautenticar la sesión de Google local
		let isGoogle = false;
		const unsubscribe = session.subscribe(curr => {
			isGoogle = curr.isAuthenticated && curr.method === 'google';
		});
		unsubscribe();
		if (isGoogle) {
			sessionLogout();
		}
	}
});

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
				id: payload.sub,
				credentialToken: response.credential
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

// Iniciar sesión con Google a través de Firebase
export async function authenticateWithGoogle(googleUser: GoogleUser) {
	try {
		if (!googleUser.credentialToken) {
			throw new Error("No se proporcionó el token de credenciales de Google.");
		}

		addNotification('security', 'Verificando con Firebase', 'Iniciando sesión en Firebase Authentication...');
		const credential = GoogleAuthProvider.credential(googleUser.credentialToken);
		const userCredential = await signInWithCredential(auth, credential);
		const firebaseUser = userCredential.user;

		let profile;
		try {
			profile = await fetchUserProfile(firebaseUser.uid);
		} catch (firestoreErr: any) {
			console.error("Firestore Error:", firestoreErr);
			throw new Error("No se pudo conectar a Cloud Firestore. Debes activar la base de datos Firestore en Firebase Console.");
		}

		let stellarAccount: StellarAccount;
		let isNewUser = false;

		if (profile && profile.stellarAccount) {
			// Usuario ya registrado, recuperar sus llaves Stellar
			stellarAccount = profile.stellarAccount;
			addNotification('security', 'Cuenta Recuperada', 'Wallet Stellar cargada desde Cloud Firestore.');
		} else {
			// Usuario nuevo, generar llaves Stellar reales
			isNewUser = true;
			addNotification('security', 'Creando Cuenta Web3', 'Generando llaves Stellar no custodias para nuevo usuario...');
			const account = await crearYFondearWalletTestnet();
			stellarAccount = {
				pubKey: account.publicKey,
				privKey: account.secretKey
			};

			// Guardar el nuevo usuario en Firestore
			await saveUserProfile({
				uid: firebaseUser.uid,
				name: firebaseUser.displayName || googleUser.name,
				email: firebaseUser.email || googleUser.email,
				photoURL: firebaseUser.photoURL || googleUser.picture,
				createdAt: new Date().toISOString(),
				stellarAccount: stellarAccount
			});

			addNotification('trustline', 'Cuenta Registrada en Cloud', 'Tus llaves de Stellar se guardaron exitosamente en Firestore.');
		}

		// Loguear al usuario
		loginGoogle(googleUser, stellarAccount);
		addNotification('security', 'Sesión Iniciada', `Bienvenido al panel, ${firebaseUser.displayName || googleUser.name}`);

		// Si era nuevo usuario, inicializar USDC/USDT en segundo plano
		if (isNewUser) {
			(async () => {
				try {
					const usdcIssuer = SUPPORTED_ASSETS.find(a => a.code === 'USDC')?.issuer;
					const usdtIssuer = SUPPORTED_ASSETS.find(a => a.code === 'USDT')?.issuer;
					if (usdcIssuer) await establishTrustline(stellarAccount, 'USDC', usdcIssuer);
					if (usdtIssuer) await establishTrustline(stellarAccount, 'USDT', usdtIssuer);
				} catch (err) {
					console.error("Error en trustlines secundarias en segundo plano:", err);
				}
			})();
		}
	} catch (e: any) {
		console.error('Error durante autenticación con Google/Firebase:', e);
		addNotification('error', 'Error al Iniciar Sesión', e?.message || 'No se pudo completar el inicio de sesión con Firebase.');
	}
}

// Iniciar sesión en modo Desarrollador
export async function authenticateDeveloper(pubKey: string, privKey: string) {
	const cleanPubKey = pubKey.trim().toUpperCase();
	const cleanPrivKey = privKey.trim().toUpperCase();

	// 1. Validar longitud y prefijos estándar de Stellar
	if (!cleanPubKey.startsWith('G') || cleanPubKey.length !== 56) {
		addNotification('error', 'Llave Pública Inválida', 'La dirección pública Stellar debe comenzar con "G" y tener 56 caracteres.');
		return false;
	}
	if (!cleanPrivKey.startsWith('S') || cleanPrivKey.length !== 56) {
		addNotification('error', 'Llave Privada Inválida', 'La clave privada Stellar debe comenzar con "S" y tener 56 caracteres.');
		return false;
	}

	try {
		// 2. Intentar inicializar el par de claves desde la clave secreta
		const keypair = Keypair.fromSecret(cleanPrivKey);
		
		// 3. Derivar la clave pública y compararla con la ingresada
		const derivedPubKey = keypair.publicKey();
		
		if (derivedPubKey !== cleanPubKey) {
			addNotification(
				'error',
				'Llaves No Coinciden',
				'La clave privada ingresada no corresponde a la dirección pública proporcionada.'
			);
			return false;
		}

		const stellarAccount: StellarAccount = { pubKey: cleanPubKey, privKey: cleanPrivKey };
		loginDeveloper(stellarAccount);
		addNotification('security', 'Modo Desarrollador Activo', 'Has ingresado con tus llaves manuales.');
		return true;
	} catch (error) {
		console.error('Error al validar las claves de desarrollador:', error);
		addNotification('error', 'Autenticación Fallida', 'La clave secreta ingresada no es una clave privada de Stellar válida.');
		return false;
	}
}

// Recuperar acceso importando una llave privada
export async function recoverAccount(privKey: string, googleUser?: GoogleUser): Promise<boolean> {
	try {
		const cleanPrivKey = privKey.trim().toUpperCase();
		const keypair = Keypair.fromSecret(cleanPrivKey);
		const pubKey = keypair.publicKey();
		const stellarAccount: StellarAccount = { pubKey, privKey: cleanPrivKey };

		// Si hay un usuario autenticado en Firebase, guardar las llaves recuperadas en Firestore
		if (auth.currentUser) {
			const userDocRef = doc(db, 'users', auth.currentUser.uid);
			await setDoc(userDocRef, {
				stellarAccount: stellarAccount
			}, { merge: true });
			
			const updatedGoogleUser: GoogleUser = {
				email: auth.currentUser.email || '',
				name: auth.currentUser.displayName || '',
				picture: auth.currentUser.photoURL || '',
				id: auth.currentUser.uid
			};
			loginGoogle(updatedGoogleUser, stellarAccount);
		} else if (googleUser && googleUser.id) {
			loginGoogle(googleUser, stellarAccount);
		} else {
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
export async function logout() {
	try {
		await signOut(auth);
	} catch (e) {
		console.error("Error al cerrar sesión de Firebase:", e);
	}
	sessionLogout();
	addNotification('security', 'Sesión Cerrada', 'Has cerrado tu sesión de forma segura.');
}

