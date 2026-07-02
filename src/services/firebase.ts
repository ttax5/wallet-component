import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuración de Firebase alimentada desde variables de entorno de Vite (.env)
// Si no están configuradas, se utilizan valores por defecto basados en .firebaserc
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForDevelopmentPurposesOnly",
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "paxapos-stellar-wallet.firebaseapp.com",
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "paxapos-stellar-wallet",
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "paxapos-stellar-wallet.appspot.com",
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "912634358485",
	appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:912634358485:web:dummyappid12345"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Auth y Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
