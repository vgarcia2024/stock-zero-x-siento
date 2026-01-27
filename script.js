/* ==========================
   FIREBASE CONFIG
========================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* 👉 REEMPLAZÁ CON TU CONFIG */
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

/* ==========================
   ESTADO
========================== */

let usuarioActual = null;

/* ==========================
   LOGIN
========================== */

async function login() {
  const email = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();

  if (!email || !pass) {
    mostrarMensaje("Completá los datos", "error");
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);

    usuarioActual = {
      user: cred.user.email,
      rol: email === "admin@local.com" ? "admin" : "vendedor",
    };

    iniciarApp();
  } catch (error) {
    mostrarMensaje("Usuario o contraseña incorrectos", "error");
  }
}

/* ==========================
   LOGOUT
========================== */

async function logout() {
  await signOut(auth);
  location.reload();
}

/* ==========================
   SESIÓN AUTOMÁTICA
========================== */

onAuthStateChanged(auth, (user) => {
  if (user) {
    usuarioActual = {
      user: user.email,
      rol: user.email === "admin@local.com" ? "admin" : "vendedor",
    };

    iniciarApp();
  }
});

/* ==========================
   INICIAR APP
========================== */

function iniciarApp() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").style.display = "block";

  document.getElementById("userName").textContent =
    usuarioActual.user + " (" + usuarioActual.rol + ")";

  if (usuarioActual.rol !== "admin") {
    document.getElementById("btnAjustes").style.display = "none";
  }

  cargarSelects();
  cargarEliminarCategorias();
  actualizarDashboard();
}

/* ==========================
   TOAST
========================== */

function mostrarMensaje(t, tipo = "info") {
  const toast = document.getElementById("toast");

  toast.textContent = t;

  toast.className = "";
  toast.classList.add("show", tipo);

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

/* ==========================
   DATOS
========================== */

let categorias = JSON.parse(localStorage.getItem("categorias")) || [
  "Textil",
  "Difusor",
  "Aerosol",
  "Sahumerio",
  "Tarjeta",
  "Hornito",
  "Carita",
  "Tecnologia/Varios",
];

let productos = JSON.parse(localStorage.getItem("productos")) || [];
let ventas = JSON.parse(localStorage.getItem("ventas")) || [];

/* ==========================
   NAV
========================== */

function showSection(id) {
  document
    .querySelectorAll("section")
    .forEach((s) => s.classList.remove("active"));

  document.getElementById(id).classList.add("active");

  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.remove("active"));

  event.target.classList.add("active");

  if (id === "stats") cargarStats();
  if (id === "dashboard") actualizarDashboard();
}

/* ==========================
   DASHBOARD
========================== */

function actualizarDashboard() {
  let hoy = new Date().toLocaleDateString();

  let ventasHoy = ventas.filter((v) => v.fecha.includes(hoy));

  document.getElementById("ventasHoy").textContent = ventasHoy.length;

  let total = 0;

  productos.forEach((p) => (total += p.cantidad));

  document.getElementById("stockTotal").textContent = total;

  let ranking = {};

  ventas.forEach((v) => {
    ranking[v.vendedor] = (ranking[v.vendedor] || 0) + v.cantidad;
  });

  let mejor = "-";
  let max = 0;

  for (let v in ranking) {
    if (ranking[v] > max) {
      max = ranking[v];
      mejor = v;
    }
  }

  document.getElementById("mejorVendedor").textContent = mejor;
}

/* ==========================
   ADMIN
========================== */

function soloAdmin() {
  if (usuarioActual.rol !== "admin") {
    mostrarMensaje("No autorizado", "error");
    return false;
  }

  return true;
}

/* ==========================
   PRODUCTOS
========================== */

function agregarProducto() {
  const codigo = codigoEl().value;
  const nombre = nombreEl().value;
  const categoria = categoriaEl().value;
  const cantidad = Number(cantidadEl().value);

  if (!codigo || !nombre || !categoria || cantidad <= 0) {
    mostrarMensaje("Completá todos los datos", "error");
    return;
  }

  let ex = productos.find((p) => p.codigo === codigo);

  if (ex) ex.cantidad += cantidad;
  else productos.push({ codigo, nombre, categoria, cantidad });

  guardar();

  limpiarStock();

  mostrarMensaje("Producto guardado", "success");
}

/* ==========================
   VENTAS
========================== */

function registrarVenta() {
  const codigo = ventaCodigoEl().value;
  const cant = Number(ventaCantidadEl().value);

  let prod = productos.find((p) => p.codigo === codigo);

  if (!prod) {
    mostrarMensaje("No encontrado", "error");
    return;
  }

  if (prod.cantidad < cant) {
    mostrarMensaje("Stock insuficiente", "error");
    return;
  }

  prod.cantidad -= cant;

  ventas.push({
    codigo,
    nombre: prod.nombre,
    vendedor: usuarioActual.user,
    cantidad: cant,
    fecha: new Date().toLocaleString(),
  });

  guardar();

  actualizarDashboard();

  mostrarMensaje("Venta registrada", "success");
}

/* ==========================
   AJUSTES
========================== */

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

  if (categorias.includes(n)) {
    mostrarMensaje("Ya existe", "error");
    return;
  }

  categorias.push(n);

  guardar();

  cargarSelects();
  cargarEliminarCategorias();

  mostrarMensaje("Categoría agregada", "success");
}

function eliminarCategoria() {
  if (!soloAdmin()) return;

  const cat = categoriaEliminar.value;

  if (!cat) {
    mostrarMensaje("Elegí una", "error");
    return;
  }

  categorias = categorias.filter((c) => c !== cat);

  guardar();

  cargarSelects();
  cargarEliminarCategorias();

  mostrarMensaje("Eliminada", "success");
}

/* ==========================
   STATS
========================== */

function cargarStats() {
  let html = "<h3>Ventas</h3>";

  html += "<table><tr><th>Vendedor</th><th>Total</th></tr>";

  let r = {};

  ventas.forEach((v) => {
    r[v.vendedor] = (r[v.vendedor] || 0) + v.cantidad;
  });

  for (let v in r) {
    html += `<tr><td>${v}</td><td>${r[v]}</td></tr>`;
  }

  html += "</table>";

  document.getElementById("statsContent").innerHTML = html;
}

/* ==========================
   HELPERS
========================== */

const codigoEl = () => codigo;
const nombreEl = () => nombre;
const categoriaEl = () => categoria;
const cantidadEl = () => cantidad;

const ventaCodigoEl = () => ventaCodigo;
const ventaCantidadEl = () => ventaCantidad;

function cargarSelects() {
  categoria.innerHTML = '<option value="">Elige</option>';

  categorias.forEach((c) => {
    let o = document.createElement("option");

    o.value = c;
    o.textContent = c;

    categoria.appendChild(o);
  });
}

function cargarEliminarCategorias() {
  categoriaEliminar.innerHTML = '<option value="">Seleccionar</option>';

  categorias.forEach((c) => {
    let o = document.createElement("option");

    o.value = c;
    o.textContent = c;

    categoriaEliminar.appendChild(o);
  });
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
