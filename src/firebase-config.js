import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider } from "firebase/auth";

// TODO: Reemplaza config con las credenciales de Firebase de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyBk_A5U37Surm-K1PxZnNbzN-htyrnNmVc",
  authDomain: "mex-mapa-bjx.firebaseapp.com",
  projectId: "mex-mapa-bjx",
  storageBucket: "mex-mapa-bjx.firebasestorage.app",
  messagingSenderId: "35913204070",
  appId: "1:35913204070:web:f9326191724b23c7bd08a7"
};

// Inicializar la aplicación principal de Firebase
export const app = initializeApp(firebaseConfig);

// Inicializar y exportar los servicios a usar en el proyecto
export const db = getFirestore(app);
export const auth = getAuth(app);

// Proveedores de Autenticación
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
