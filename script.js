/* ==========================
   FIREBASE CONFIG
========================= */
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
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 👉 TU CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyCwBuxmHQgaqJAac_WiMZkpZUMFVzONFkA",
  authDomain: "zero-x-siento-stock.firebaseapp.com",
  projectId: "zero-x-siento-stock",
  storageBucket: "zero-x-siento-stock.firebasestorage.app",
  messagingSenderId: "764048708615",
  appId: "1:764048708615:web:1287e135d38a3588b806a2",
  measurementId: "G-CWKB3TZ9CF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ==========================
   ESTADO
========================= */
let usuarioActual = null;
let vendedores = ["Fito","Andre","Juli","Luli","Valen"];
let emailANombre = {
  "fito@zeroxsiento.com": "Fito",
  "andre@zeroxsiento.com": "Andre",
  "juli@zeroxsiento.com": "Juli",
  "luli@zeroxsiento.com": "Luli",
  "valen@zeroxsiento.com": "Valen"
};

/* ==========================
   LOGIN
========================= */
async function login() {
  const email = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();

  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";

  if (!email || !pass) {
    errorEl.textContent = "Completá los datos";
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const rol = await obtenerRol(cred.user);
    usuarioActual = { user: cred.user.email, rol };
    iniciarApp();
  } catch (error) {
    console.error(error);
    errorEl.textContent = "Usuario o contraseña incorrectos";
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
   DATOS
========================= */
let categorias = ["Textil","Difusor","Aerosol","Sahumerio","Tarjeta","Hornito","Carita","Tecnologia/Varios"];
let productos = [];
let ventas = [];

/* ==========================
   PRODUCTOS
========================= */
function agregarProducto() {
  const codigo = document.getElementById("codigo").value.trim();
  const nombre = document.getElementById("nombre").value.trim();
  const categoria = document.getElementById("categoria").value;
  const cantidad = Number(document.getElementById("cantidad").value);

  if (!codigo || !nombre || !categoria || cantidad <= 0) {
    mostrarMensaje("Completá todos los datos", "error");
    return;
  }

  const ex = productos.find(p => p.codigo === codigo);
  if (ex) ex.cantidad += cantidad;
  else productos.push({ codigo, nombre, categoria, cantidad });

  guardar();
  limpiarStock();
  mostrarMensaje("Producto guardado", "success");
}

function limpiarStock() {
  document.getElementById("codigo").value = "";
  document.getElementById("nombre").value = "";
  document.getElementById("categoria").value = "";
  document.getElementById("cantidad").value = "";
}

/* ==========================
   VENTAS
========================= */
function registrarVenta() {
  const codigo = document.getElementById("ventaCodigo").value.trim();
  const cant = Number(document.getElementById("ventaCantidad").value);
  const prod = productos.find(p => p.codigo === codigo);

  if (!prod) { mostrarMensaje("Producto no encontrado", "error"); return; }
  if (prod.cantidad < cant) { mostrarMensaje("Stock insuficiente", "error"); return; }

  const vendedor = document.getElementById("ventaVendedor").value || usuarioActual.user;
  prod.cantidad -= cant;
  ventas.push({
    codigo,
    nombre: prod.nombre,
    vendedor,
    cantidad: cant,
    fecha: new Date().toLocaleString(),
  });

  guardar();
  actualizarDashboard();
  mostrarMensaje("Venta registrada", "success");
}

/* ==========================
   CATEGORIAS
========================= */
function cargarSelects() {
  const categoriaSel = document.getElementById("categoria");
  categoriaSel.innerHTML = '<option value="">Elige</option>';
  categorias.forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    categoriaSel.appendChild(o);
  });
}

function cargarEliminarCategorias() {
  const catElim = document.getElementById("categoriaEliminar");
  catElim.innerHTML = '<option value="">Seleccionar</option>';
  categorias.forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    catElim.appendChild(o);
  });
}

function agregarCategoria() {
  const n = document.getElementById("nuevaCategoria").value.trim();
  if (!n) return;
  if (categorias.includes(n)) { mostrarMensaje("Ya existe", "error"); return; }
  categorias.push(n);
  cargarSelects();
  cargarEliminarCategorias();
  mostrarMensaje("Categoría agregada", "success");
}

function eliminarCategoria() {
  const cat = document.getElementById("categoriaEliminar").value;
  if (!cat) { mostrarMensaje("Elegí una", "error"); return; }
  categorias = categorias.filter(c => c !== cat);
  cargarSelects();
  cargarEliminarCategorias();
  mostrarMensaje("Categoría eliminada", "success");
}

/* ==========================
   DASHBOARD
========================= */
function actualizarDashboard() {
  const hoy = new Date().toLocaleDateString();
  const ventasHoy = ventas.filter(v => v.fecha.includes(hoy));
  document.getElementById("ventasHoy").textContent = ventasHoy.length;

  let total = productos.reduce((sum,p) => sum + p.cantidad,0);
  document.getElementById("stockTotal").textContent = total;

  const ranking = {};
  ventas.forEach(v => ranking[v.vendedor] = (ranking[v.vendedor] || 0) + v.cantidad);

  let mejor = "-", max=0;
  for (const v in ranking) if(ranking[v]>max){ max=ranking[v]; mejor=v; }

  document.getElementById("mejorVendedor").textContent = emailANombre[mejor] || mejor;

  // stats
  let html = "<h3>Ventas</h3><table><tr><th>Vendedor</th><th>Total</th></tr>";
  for(const v in ranking) html += `<tr><td>${emailANombre[v]||v}</td><td>${ranking[v]}</td></tr>`;
  html += "</table>";
  document.getElementById("statsContent").innerHTML = html;
}

/* ==========================
   USUARIOS / ADMIN
========================= */
const usuariosCol = collection(db,"usuarios");

async function crearUsuario() {
  if(usuarioActual.rol!=="admin"){ mostrarMensaje("No autorizado","error"); return; }

  const email = document.getElementById("nuevoUsuarioEmail").value.trim();
  const pass = document.getElementById("nuevoUsuarioClave").value.trim();
  const rol = document.getElementById("nuevoUsuarioRol").value;

  if(!email||!pass){ mostrarMensaje("Email y clave requeridos","error"); return; }

  try{
    const cred = await createUserWithEmailAndPassword(auth,email,pass);
    await setDoc(doc(db,"usuarios",cred.user.uid),{ rol,email });

    mostrarMensaje(`Usuario ${email} creado`,"success");
    document.getElementById("nuevoUsuarioEmail").value="";
    document.getElementById("nuevoUsuarioClave").value="";
    cargarUsuarios();
  }catch(e){
    console.error(e);
    mostrarMensaje("Error al crear usuario","error");
  }
}

async function cargarUsuarios(){
  const tbody = document.querySelector("#tablaUsuarios tbody");
  tbody.innerHTML="";
  const snap = await getDocs(usuariosCol);
  snap.forEach(docu=>{
    const data = docu.data();
    const email = data.email || docu.id;
    const rol = data.rol || "vendedor";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${email}</td>
      <td>
        <select class="rolSelect">
          <option value="vendedor" ${rol==="vendedor"?"selected":""}>Vendedor</option>
          <option value="admin" ${rol==="admin"?"selected":""}>Admin</option>
        </select>
      </td>
      <td>
        <button class="primary danger btnEliminarUsuario">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);

    tr.querySelector(".rolSelect").addEventListener("change",async e=>{
      const nuevoRol=e.target.value;
      await setDoc(doc(db,"usuarios",docu.id),{rol:nuevoRol,email});
      mostrarMensaje(`Rol de ${email} cambiado a ${nuevoRol}`,"success");
    });

    tr.querySelector(".btnEliminarUsuario").addEventListener("click",async ()=>{
      if(!confirm(`Eliminar usuario ${email}?`)) return;
      await deleteDoc(doc(db,"usuarios",docu.id));
      mostrarMensaje(`Usuario ${email} eliminado`,"info");
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
window.agregarProducto = agregarProducto;
window.registrarVenta = registrarVenta;
window.agregarCategoria = agregarCategoria;
window.eliminarCategoria = eliminarCategoria;
window.crearUsuario = crearUsuario;
