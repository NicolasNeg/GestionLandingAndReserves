import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

// TODO: Para ejecutar este script necesitas colocar tus credenciales temporalmente aquí,
// o configurar firebase-admin. Como es para front-end testing, usaremos el SDK cliente.
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const delay = ms => new Promise(res => setTimeout(res, ms));

async function seedMesas() {
  console.log("Iniciando inyección de 10 mesas mock...");
  const mesasRef = collection(db, "mesas");
  
  for (let i = 1; i <= 10; i++) {
    const mesaId = `M-${i.toString().padStart(2, '0')}`;
    
    // Coordenadas X, Y aleatorias para probar el layout en el contenedor del mapa
    const x = Math.floor(Math.random() * 80) + 10; // representaremos en porcentaje (10% a 90%)
    const y = Math.floor(Math.random() * 80) + 10; 

    const data = {
      id_mesa: mesaId,
      capacidad: Math.random() > 0.5 ? 4 : 8,
      posicion: { x, y },
      estado: 0 // 0 = Disponible
    };

    try {
      await setDoc(doc(mesasRef, mesaId), data);
      console.log(`✅ Mesa ${mesaId} creada exitosamente en {x: ${x}%, y: ${y}%}.`);
    } catch (error) {
      console.error(`❌ Error creando mesa ${mesaId}:`, error);
    }
    
    await delay(100);
  }
  
  console.log("🎉 Seed completado.");
  process.exit(0);
}

// Ejecutar si hay config
if (firebaseConfig.projectId !== "") {
    seedMesas();
} else {
    console.error("⚠️ ERROR: Debes añadir tu firebaseConfig en el archivo seed-mesas.js antes de ejecutarlo.");
    process.exit(1);
}
