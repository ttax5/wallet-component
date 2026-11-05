import { loginGoogle, loginDeveloper, logout as sessionLogout, session } from '../stores/session';
import { addNotification } from '../stores/notifications';
import { crearYFondearWalletTestnet, establishTrustline, SUPPORTED_ASSETS } from './stellar';
import type { GoogleUser, StellarAccount } from '../types';
import { auth, db } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Keypair } from '@stellar/stellar-sdk';

import { fetchUserProfile, saveUserProfile } from './firestore';

// Traduce los errores de Firestore a mensajes accionables y conserva el código
// original para poder diagnosticar problemas reales (red, reglas, sesión, etc.).
function buildFirestoreErrorMessage(error: any): string {
	const code: string = error?.code || 'desconocido';
	const detail: string = error?.message || String(error);
	const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'no configurado';

	const hints: Record<string, string> = {
		'permission-denied':
			'Firestore rechazó la operación. Verifica que las reglas permitan al usuario autenticado leer su propio documento en /users/{uid}.',
		unauthenticated:
			'La sesión de Firebase no es válida. Cierra sesión y vuelve a intentarlo.',
		unavailable:
			'No se pudo alcanzar el servidor de Firestore. Revisa tu conexión, desactiva bloqueadores de anuncios o prueba en una ventana privada.',
		'failed-precondition':
			'Firestore no está completamente inicializado. Comprueba que la base de datos (default) exista en Firebase Console.',
		'not-found': 'La base de datos de Firestore no existe en el proyecto configurado.'
	};

	const hint =
		hints[code] || 'Revisa la consola del navegador para ver el detalle técnico.';
	return `No se pudo conectar a Cloud Firestore (${code}). ${hint} Proyecto: ${projectId}. Detalle: ${detail}`;
}

// La sesión recién creada puede tardar unos instantes en propagarse a Firestore.
// Si el primer intento falla por autenticación, renovamos el token y reintentamos.
async function fetchProfileWithRetry(uid: string) {
	try {
		return await fetchUserProfile(uid);
	} catch (error: any) {
		if (error?.code === 'unauthenticated' || error?.code === 'permission-denied') {
			try {
				await auth.currentUser?.getIdToken(true);
			} catch (refreshError) {
				console.error('No se pudo renovar el token de Firebase:', refreshError);
			}
			await new Promise((resolve) => setTimeout(resolve, 600));
			return await fetchUserProfile(uid);
		}
		throw error;
	}
}

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

// Iniciar sesión con Google a través de Firebase.
// Usamos signInWithPopup para que el origen de OAuth sea el dominio de Firebase
// (authDomain) y no el puerto local, evitando errores origin_mismatch.
export async function authenticateWithGooglePopup() {
	try {
		addNotification('security', 'Verificando con Firebase', 'Iniciando sesión en Firebase Authentication...');

		const provider = new GoogleAuthProvider();
		provider.setCustomParameters({ prompt: 'select_account' });
		const userCredential = await signInWithPopup(auth, provider);
		const firebaseUser = userCredential.user;

		const googleUser: GoogleUser = {
			email: firebaseUser.email || '',
			name: firebaseUser.displayName || '',
			picture: firebaseUser.photoURL || '',
			id: firebaseUser.uid
		};

		await completeGoogleLogin(firebaseUser, googleUser);
	} catch (e: any) {
		console.error('Error durante autenticación con Google/Firebase:', e);
		addNotification('error', 'Error al Iniciar Sesión', buildGoogleLoginErrorMessage(e));
	}
}

function buildGoogleLoginErrorMessage(error: any): string {
	switch (error?.code) {
		case 'auth/popup-blocked':
			return 'El navegador bloqueó la ventana emergente de Google. Permite las ventanas emergentes para este sitio e inténtalo de nuevo.';
		case 'auth/popup-closed-by-user':
		case 'auth/cancelled-popup-request':
			return 'Se cerró la ventana de inicio de sesión de Google. Inténtalo de nuevo.';
		case 'auth/account-exists-with-different-credential':
			return 'Ya existe una cuenta con ese correo usando otro método de inicio de sesión.';
		case 'auth/unauthorized-domain':
			return `El dominio ${window.location.hostname} no está autorizado en Firebase Authentication. Agrégalo en Firebase Console → Authentication → Settings → Authorized domains.`;
		default:
			return error?.message || 'No se pudo completar el inicio de sesión con Firebase.';
	}
}

// Lógica común tras autenticar con Google: recuperar o crear el perfil y la wallet.
async function completeGoogleLogin(firebaseUser: User, googleUser: GoogleUser) {
	let profile;
	try {
		profile = await fetchProfileWithRetry(firebaseUser.uid);
	} catch (firestoreErr: any) {
		console.error('Firestore Error:', {
			code: firestoreErr?.code,
			message: firestoreErr?.message,
			name: firestoreErr?.name,
			projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
			uid: firebaseUser.uid
		});
		throw new Error(buildFirestoreErrorMessage(firestoreErr));
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

