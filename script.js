/* ==========================
   FIREBASE CONFIG
========================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 👉 TU CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyCwBuxmHQgaqJAac_WiMZkpZUMFVzONFkA",
  authDomain: "zero-x-siento-stock.firebaseapp.com",
  projectId: "zero-x-siento-stock",
  storageBucket: "zero-x-siento-stock.firebasestorage.app",
  messagingSenderId: "764048708615",
  appId: "1:764048708615:web:1287e135d38a3588b806a2",
  measurementId: "G-CWKB3TZ9CF",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ==========================
   ESTADO
========================= */
let usuarioActual = null;
let vendedores = ["Fito", "Andre", "Juli", "Luli", "Valen"];

/* ==========================
   OBTENER ROL
========================= */
async function obtenerRol(user) {
  try {
    const uid = user.uid;
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().rol : "vendedor";
  } catch (e) {
    console.error("Error rol:", e);
    return "vendedor";
  }
}

/* ==========================
   LOGIN
========================= */
async function login() {
  const email = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();
  if (!email || !pass) return mostrarMensaje("Completá los datos", "error");

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
  document.getElementById("userName").textContent = usuarioActual.user + " (" + usuarioActual.rol + ")";
  if (usuarioActual.rol !== "admin") document.getElementById("btnAjustes").style.display = "none";

  cargarSelects();
  cargarEliminarCategorias();
  cargarVendedores();
  actualizarDashboard();
}

/* ==========================
   CARGAR VENDEDORES
========================= */
function cargarVendedores() {
  const select = document.getElementById("ventaVendedor");
  select.innerHTML = '<option value="">Elige vendedor</option>';
  vendedores.forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    select.appendChild(o);
  });

  // Seleccionar el usuario actual si está en la lista
  if (vendedores.includes(usuarioActual.user)) select.value = usuarioActual.user;
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
   DATOS
========================= */
let categorias = JSON.parse(localStorage.getItem("categorias")) || [
  "Textil","Difusor","Aerosol","Sahumerio","Tarjeta","Hornito","Carita","Tecnologia/Varios"
];
let productos = JSON.parse(localStorage.getItem("productos")) || [];
let ventas = JSON.parse(localStorage.getItem("ventas")) || [];

/* ==========================
   NAV
========================= */
function showSection(id) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
  event.target.classList.add("active");
  if (id === "stats") cargarStats();
  if (id === "dashboard") actualizarDashboard();
}

/* ==========================
   DASHBOARD
========================= */
function actualizarDashboard() {
  const hoy = new Date().toLocaleDateString();
  const ventasHoy = ventas.filter(v => v.fecha.includes(hoy));
  document.getElementById("ventasHoy").textContent = ventasHoy.length;

  let total = 0;
  productos.forEach(p => total += p.cantidad);
  document.getElementById("stockTotal").textContent = total;

  const ranking = {};
  ventas.forEach(v => ranking[v.vendedor] = (ranking[v.vendedor] || 0) + v.cantidad);

  let mejor = "-", max = 0;
  for (const v in ranking) {
    if (ranking[v] > max) { max = ranking[v]; mejor = v; }
  }
  document.getElementById("mejorVendedor").textContent = mejor;
}

/* ==========================
   ADMIN
========================= */
function soloAdmin() {
  if (usuarioActual.rol !== "admin") { mostrarMensaje("No autorizado", "error"); return false; }
  return true;
}

/* ==========================
   PRODUCTOS
========================= */
function agregarProducto() {
  const codigo = codigoEl().value;
  const nombre = nombreEl().value;
  const categoria = categoriaEl().value;
  const cantidad = Number(cantidadEl().value);
  if (!codigo || !nombre || !categoria || cantidad <= 0) return mostrarMensaje("Completá todos los datos", "error");

  const ex = productos.find(p => p.codigo === codigo);
  if (ex) ex.cantidad += cantidad; else productos.push({ codigo, nombre, categoria, cantidad });

  guardar();
  limpiarStock();
  mostrarMensaje("Producto guardado", "success");
}

/* ==========================
   VENTAS
========================= */
function registrarVenta() {
  const codigo = ventaCodigoEl().value;
  const cant = Number(ventaCantidadEl().value);
  const prod = productos.find(p => p.codigo === codigo);
  if (!prod) return mostrarMensaje("No encontrado", "error");
  if (prod.cantidad < cant) return mostrarMensaje("Stock insuficiente", "error");

  const vendedor = document.getElementById("ventaVendedor").value || usuarioActual.user;
  prod.cantidad -= cant;

  ventas.push({ codigo, nombre: prod.nombre, vendedor, cantidad: cant, fecha: new Date().toLocaleString() });
  guardar();
  actualizarDashboard();
  mostrarMensaje("Venta registrada", "success");

  // limpiar inputs
  ventaCodigo.value = "";
  ventaCantidad.value = 1;
}

/* ==========================
   AJUSTES
========================= */
function resetearTodo() {
  if (!soloAdmin()) return;
  productos = [];
  ventas = [];
  guardar();
  mostrarMensaje("Sistema limpio", "info");
}

function agregarCategoria() {
  if (!soloAdmin()) return;
  const n = nuevaCategoria.value.trim();
  if (!n) return;
  if (categorias.includes(n)) return mostrarMensaje("Ya existe", "error");

  categorias.push(n);
  guardar();
  cargarSelects();
  cargarEliminarCategorias();
  mostrarMensaje("Categoría agregada", "success");
}

function eliminarCategoria() {
  if (!soloAdmin()) return;
  const cat = categoriaEliminar.value;
  if (!cat) return mostrarMensaje("Elegí una", "error");

  categorias = categorias.filter(c => c !== cat);
  guardar();
  cargarSelects();
  cargarEliminarCategorias();
  mostrarMensaje("Eliminada", "success");
}

/* ==========================
   STATS
========================= */
function cargarStats() {
  let html = "<h3>Ventas</h3><table><tr><th>Vendedor</th><th>Total</th></tr>";
  const r = {};
  ventas.forEach(v => r[v.vendedor] = (r[v.vendedor] || 0) + v.cantidad);
  for (const v in r) html += `<tr><td>${v}</td><td>${r[v]}</td></tr>`;
  html += "</table>";
  document.getElementById("statsContent").innerHTML = html;
}

/* ==========================
   HELPERS
========================= */
const codigoEl = () => codigo;
const nombreEl = () => nombre;
const categoriaEl = () => categoria;
const cantidadEl = () => cantidad;
const ventaCodigoEl = () => ventaCodigo;
const ventaCantidadEl = () => ventaCantidad;

function cargarSelects() {
  categoria.innerHTML = '<option value="">Elige</option>';
  categorias.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; categoria.appendChild(o); });
}

function cargarEliminarCategorias() {
  categoriaEliminar.innerHTML = '<option value="">Seleccionar</option>';
  categorias.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; categoriaEliminar.appendChild(o); });
}

function limpiarStock() {
  codigo.value = "";
  nombre.value = "";
  categoria.value = "";
  cantidad.value = "";
}

function guardar() {
  localStorage.setItem("productos", JSON.stringify(productos));
  localStorage.setItem("ventas", JSON.stringify(ventas));
  localStorage.setItem("categorias", JSON.stringify(categorias));
}

/* ==========================
   EXPORT GLOBAL
========================= */
window.login = login;
window.logout = logout;
window.showSection = showSection;
window.agregarProducto = agregarProducto;
window.registrarVenta = registrarVenta;
window.resetearTodo = resetearTodo;
window.agregarCategoria = agregarCategoria;
window.eliminarCategoria = eliminarCategoria;
