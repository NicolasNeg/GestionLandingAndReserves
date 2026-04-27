import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Reemplaza config con las credenciales de Firebase de tu proyecto
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Inicializar la aplicación principal de Firebase
export const app = initializeApp(firebaseConfig);

// Inicializar y exportar los servicios a usar en el proyecto
export const db = getFirestore(app);
export const auth = getAuth(app);
