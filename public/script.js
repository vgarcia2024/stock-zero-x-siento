import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyCwBuxmHQgaqJAac_WiMZkpZUMFVzONFkA",
  authDomain: "zero-x-siento-stock.firebaseapp.com",
  projectId: "zero-x-siento-stock",
  storageBucket: "zero-x-siento-stock.firebasestorage.app",
  messagingSenderId: "764048708615",
  appId: "1:764048708615:web:1287e135d38a3588b806a2"
};

let btnUsuarios;
let btnAjustes;
let loginScreen;
let app;
let userName;


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ESTADO */
let usuarioActual = null;
let productos = [];
let carrito = [];

/* LOGIN */
async function login() {
  try {
    const cred = await signInWithEmailAndPassword(auth, loginUser.value, loginPass.value);
    usuarioActual = { email: cred.user.email, rol: await obtenerRol(cred.user.uid) };
    iniciarApp();
  } catch {
    mostrarMensaje("Error de login", "error");
  }
}

async function logout() {
  await signOut(auth);
  location.reload();
}

async function obtenerRol(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? snap.data().rol : "vendedor";
}

/* CREAR USUARIO (ADMIN) */
async function crearUsuario() {
  try {
    const email = nuevoEmail.value;
    const pass = nuevoPass.value;
    const rol = nuevoRol.value;

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "usuarios", cred.user.uid), {
      email,
      rol
    });

    mostrarMensaje("Usuario creado", "success");
  } catch (e) {
    mostrarMensaje("Error al crear usuario", "error");
  }
}

onAuthStateChanged(auth, async user => {
  if (user) {
    usuarioActual = { email: user.email, rol: await obtenerRol(user.uid) };
    iniciarApp();
  }
});

/* INIT */
function iniciarApp() {
  loginScreen = document.getElementById("loginScreen");
  app = document.getElementById("app");
  userName = document.getElementById("userName");
  btnUsuarios = document.getElementById("btnUsuarios");
  btnAjustes = document.getElementById("btnAjustes");

  loginScreen.style.display = "none";
  app.style.display = "block";

  userName.textContent = `${usuarioActual.email} (${usuarioActual.rol})`;

  if (btnUsuarios) {
    btnUsuarios.style.display = usuarioActual.rol === "admin" ? "block" : "none";
  }

  if (btnAjustes) {
    btnAjustes.style.display = usuarioActual.rol === "admin" ? "block" : "none";
  }

  cargarProductos();
}


/* UI */
function showSection(id) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function mostrarMensaje(txt, tipo = "info") {
  toast.textContent = txt;
  toast.className = `show ${tipo}`;
  setTimeout(() => toast.className = "", 3000);
}

/* PRODUCTOS */
const productosCol = collection(db, "productos");

function cargarProductos() {
  onSnapshot(productosCol, snap => {
    productos = [];
    snap.forEach(d => productos.push(d.data()));
    renderCards(productos);
  });
}

/* HOME */
function renderCards(lista) {
  cardsProductos.innerHTML = "";
  lista.forEach(p => {
    cardsProductos.innerHTML += `
      <div class="product-card">
        <h4>${p.nombre}</h4>
        <small>${p.categoria}</small>
        <small>Stock: ${p.cantidad}</small>
        <button onclick="agregarAlCarrito('${p.codigo}')">Agregar</button>
      </div>
    `;
  });
}

function filtrarProductos() {
  const t = buscador.value.toLowerCase();
  renderCards(productos.filter(p =>
    p.nombre.toLowerCase().includes(t) ||
    p.codigo.toLowerCase().includes(t)
  ));
}

function agregarAlCarrito(codigo) {
  const prod = productos.find(p => p.codigo === codigo);
  if (!prod || prod.cantidad <= 0) return;
  carrito.push({ codigo, cantidad: 1 });
  mostrarMensaje("Agregado al carrito", "success");
}

function irACarrito() {
  showSection("ventas");
  ventaCodigo.value = carrito[0]?.codigo || "";
}

/* EXPORT */
window.login = login;
window.logout = logout;
window.crearUsuario = crearUsuario;
window.showSection = showSection;
window.filtrarProductos = filtrarProductos;
window.agregarAlCarrito = agregarAlCarrito;
window.irACarrito = irACarrito;
