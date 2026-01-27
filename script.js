/* ==========================
   FIREBASE CONFIG
========================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 👉 TU CONFIG */
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_ID",
  appId: "TU_APP_ID",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ==========================
   ESTADO
========================= */
let usuarioActual = null;
let vendedores = [];
let emailANombre = {};

/* ==========================
   LOGIN
========================= */
async function login() {
  const email = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();

  if (!email || !pass) {
    mostrarMensaje("Completá los datos", "error");
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const rol = await obtenerRol(cred.user);
    usuarioActual = { user: cred.user.email, rol };
    iniciarApp();
  } catch (error) {
    console.error(error);
    mostrarMensaje("Usuario o contraseña incorrectos", "error");
  }
}

/* ==========================
   LOGOUT
========================= */
async function logout() {
  await signOut(auth);
  location.reload();
}

/* ==========================
   OBTENER ROL
========================= */
async function obtenerRol(user) {
  try {
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (snap.exists()) return snap.data().rol;
    return "vendedor";
  } catch (e) {
    console.error("Error rol:", e);
    return "vendedor";
  }
}

/* ==========================
   SESIÓN AUTOMÁTICA
========================= */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const rol = await obtenerRol(user);
    usuarioActual = { user: user.email, rol };
    iniciarApp();
  }
});

/* ==========================
   INICIAR APP
========================= */
function iniciarApp() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").style.display = "block";

  document.getElementById("userName").textContent =
    usuarioActual.user + " (" + usuarioActual.rol + ")";

  document.getElementById("btnAjustes").style.display =
    usuarioActual.rol === "admin" ? "block" : "none";

  cargarSelects();
  cargarEliminarCategorias();
  cargarVendedores();
  actualizarDashboard();

  if (usuarioActual.rol === "admin") cargarUsuarios();
}

/* ==========================
   TOAST
========================= */
function mostrarMensaje(t, tipo = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = t;
  toast.className = "";
  toast.classList.add("show", tipo);
  setTimeout(() => toast.classList.remove("show"), 3500);
}

/* ==========================
   NAV
========================= */
function showSection(id) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
  event.target.classList.add("active");
}

/* ==========================
   DASHBOARD
========================= */
let categorias = [];
let productos = [];
let ventas = [];

function actualizarDashboard() {
  const hoy = new Date().toLocaleDateString();
  const ventasHoy = ventas.filter(v => v.fecha.includes(hoy));
  document.getElementById("ventasHoy").textContent = ventasHoy.length;

  let total = productos.reduce((sum, p) => sum + p.cantidad, 0);
  document.getElementById("stockTotal").textContent = total;

  const ranking = {};
  ventas.forEach(v => ranking[v.vendedor] = (ranking[v.vendedor] || 0) + v.cantidad);

  let mejor = "-", max = 0;
  for (const v in ranking) if (ranking[v] > max) { max = ranking[v]; mejor = v; }

  document.getElementById("mejorVendedor").textContent = emailANombre[mejor] || mejor;
}

/* ==========================
   ADMIN / ROLES
========================= */
const usuariosCol = collection(db, "usuarios");

async function crearUsuario() {
  if (usuarioActual.rol !== "admin") { mostrarMensaje("No autorizado", "error"); return; }

  const email = document.getElementById("nuevoUsuarioEmail").value.trim();
  const pass = document.getElementById("nuevoUsuarioClave").value.trim();
  const rol = document.getElementById("nuevoUsuarioRol").value;

  if (!email || !pass) { mostrarMensaje("Email y clave requeridos", "error"); return; }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "usuarios", cred.user.uid), { rol });

    mostrarMensaje(`Usuario ${email} creado`, "success");
    document.getElementById("nuevoUsuarioEmail").value = "";
    document.getElementById("nuevoUsuarioClave").value = "";
    cargarUsuarios();
  } catch (e) {
    console.error(e);
    mostrarMensaje("Error al crear usuario", "error");
  }
}

async function cargarUsuarios() {
  const tbody = document.querySelector("#tablaUsuarios tbody");
  tbody.innerHTML = "";

  const snap = await getDocs(usuariosCol);
  snap.forEach(async (docu) => {
    const data = docu.data();
    const email = data.email || docu.id;
    const rol = data.rol || "vendedor";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${email}</td>
      <td>
        <select class="rolSelect">
          <option value="vendedor" ${rol === "vendedor" ? "selected" : ""}>Vendedor</option>
          <option value="admin" ${rol === "admin" ? "selected" : ""}>Admin</option>
        </select>
      </td>
      <td>
        <button class="primary danger btnEliminarUsuario">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);

    tr.querySelector(".rolSelect").addEventListener("change", async e => {
      const nuevoRol = e.target.value;
      await setDoc(doc(db, "usuarios", docu.id), { rol: nuevoRol });
      mostrarMensaje(`Rol de ${email} cambiado a ${nuevoRol}`, "success");
    });

    tr.querySelector(".btnEliminarUsuario").addEventListener("click", async () => {
      if (!confirm(`Eliminar usuario ${email}?`)) return;
      await deleteDoc(doc(db, "usuarios", docu.id));
      mostrarMensaje(`Usuario ${email} eliminado`, "info");
      cargarUsuarios();
    });
  });
}

/* ==========================
   EXPORT GLOBAL
========================= */
window.login = login;
window.logout = logout;
window.showSection = showSection;
window.crearUsuario = crearUsuario;
