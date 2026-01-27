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
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 👉 CONFIG */
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
   ESTADO GLOBAL
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

let categorias = JSON.parse(localStorage.getItem("categorias")) || [
  "Textil","Difusor","Aerosol","Sahumerio","Tarjeta","Hornito","Carita","Tecnologia/Varios"
];
let productos = JSON.parse(localStorage.getItem("productos")) || [];
let ventas = JSON.parse(localStorage.getItem("ventas")) || [];

/* ==========================
   LOGIN
========================= */
async function login() {
  const email = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();
  if(!email || !pass){ mostrarMensaje("Completá los datos","error"); return; }

  try {
    const cred = await signInWithEmailAndPassword(auth,email,pass);
    usuarioActual = { uid: cred.user.uid, user: cred.user.email, rol: await obtenerRol(cred.user.uid) };
    iniciarApp();
  } catch(e){
    console.error(e);
    mostrarMensaje("Usuario o contraseña incorrectos","error");
  }
}

/* ==========================
   LOGOUT
========================= */
async function logout(){ await signOut(auth); location.reload(); }

/* ==========================
   SESIÓN AUTOMÁTICA
========================= */
onAuthStateChanged(auth, async(user)=>{
  if(user){
    usuarioActual = { uid: user.uid, user: user.email, rol: await obtenerRol(user.uid) };
    iniciarApp();
  }
});

/* ==========================
   OBTENER ROL
========================= */
async function obtenerRol(uid){
  try{
    const snap = await getDoc(doc(db,"usuarios",uid));
    if(snap.exists()) return snap.data().rol;
    return "vendedor";
  }catch(e){ console.error(e); return "vendedor"; }
}

/* ==========================
   INICIAR APP
========================= */
function iniciarApp(){
  document.getElementById("loginScreen").style.display="none";
  document.getElementById("app").style.display="block";
  document.getElementById("userName").textContent = `${usuarioActual.user} (${usuarioActual.rol})`;

  if(usuarioActual.rol!=="admin"){
    document.getElementById("btnAjustes").style.display="none";
    document.getElementById("btnUsuarios").style.display="none";
  }

  cargarSelects();
  cargarEliminarCategorias();
  cargarVendedores();
  actualizarDashboard();

  if(usuarioActual.rol==="admin"){ cargarUsuarios(); }
}

/* ==========================
   NAV
========================= */
function showSection(id){
  document.querySelectorAll("section").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll("nav button").forEach(b=>b.classList.remove("active"));
  if(event) event.target.classList.add("active");

  if(id==="stats") cargarStats();
  if(id==="dashboard") actualizarDashboard();
}

/* ==========================
   TOAST
========================= */
function mostrarMensaje(t,tipo="info"){
  const toast = document.getElementById("toast");
  toast.textContent=t;
  toast.className="";
  toast.classList.add("show",tipo);
  setTimeout(()=>toast.classList.remove("show"),3500);
}

/* ==========================
   PRODUCTOS
========================= */
function agregarProducto(){
  const codigo=codigoEl().value;
  const nombre=nombreEl().value;
  const categoria=categoriaEl().value;
  const cantidad=Number(cantidadEl().value);
  if(!codigo||!nombre||!categoria||cantidad<=0){ mostrarMensaje("Completá todos los datos","error"); return; }

  const ex=productos.find(p=>p.codigo===codigo);
  if(ex) ex.cantidad+=cantidad;
  else productos.push({codigo,nombre,categoria,cantidad});

  guardar(); limpiarStock(); mostrarMensaje("Producto guardado","success");
}

/* ==========================
   VENTAS
========================= */
function registrarVenta(){
  const codigo=ventaCodigoEl().value;
  const cant=Number(ventaCantidadEl().value);
  const prod=productos.find(p=>p.codigo===codigo);
  if(!prod){ mostrarMensaje("No encontrado","error"); return; }
  if(prod.cantidad<cant){ mostrarMensaje("Stock insuficiente","error"); return; }

  const vendedor = document.getElementById("ventaVendedor").value || usuarioActual.user;
  prod.cantidad -= cant;
  ventas.push({codigo,nombre:prod.nombre,vendedor,cantidad:cant,fecha:new Date().toLocaleString()});
  guardar(); actualizarDashboard(); mostrarMensaje("Venta registrada","success");
}

/* ==========================
   DASHBOARD
========================= */
function actualizarDashboard(){
  const hoy=new Date().toLocaleDateString();
  const ventasHoy=ventas.filter(v=>v.fecha.includes(hoy));
  document.getElementById("ventasHoy").textContent=ventasHoy.length;

  let total=0; productos.forEach(p=>total+=p.cantidad);
  document.getElementById("stockTotal").textContent=total;

  const ranking={};
  ventas.forEach(v=>ranking[v.vendedor]=(ranking[v.vendedor]||0)+v.cantidad);

  let mejor="-", max=0;
  for(const v in ranking){ if(ranking[v]>max){ max=ranking[v]; mejor=v; } }
  document.getElementById("mejorVendedor").textContent=emailANombre[mejor]||mejor;
}

/* ==========================
   STATS
========================= */
function cargarStats(){
  let html="<h3>Ventas</h3><table><tr><th>Vendedor</th><th>Total</th></tr>";
  const r={}; ventas.forEach(v=>r[v.vendedor]=(r[v.vendedor]||0)+v.cantidad);
  for(const v in r) html+=`<tr><td>${emailANombre[v]||v}</td><td>${r[v]}</td></tr>`;
  html+="</table>"; document.getElementById("statsContent").innerHTML=html;
}

/* ==========================
   AJUSTES
========================= */
function resetearTodo(){ if(!soloAdmin()) return; productos=[]; ventas=[]; guardar(); mostrarMensaje("Sistema limpio","info"); }
function agregarCategoria(){ if(!soloAdmin()) return; const n=nuevaCategoria.value.trim(); if(!n||categorias.includes(n)){ mostrarMensaje("Ya existe","error"); return; } categorias.push(n); guardar(); cargarSelects(); cargarEliminarCategorias(); mostrarMensaje("Categoría agregada","success"); }
function eliminarCategoria(){ if(!soloAdmin()) return; const cat=categoriaEliminar.value; if(!cat){ mostrarMensaje("Elegí una","error"); return; } categorias=categorias.filter(c=>c!==cat); guardar(); cargarSelects(); cargarEliminarCategorias(); mostrarMensaje("Eliminada","success"); }

/* ==========================
   HELPERS
========================= */
const codigoEl=()=>codigo; const nombreEl=()=>nombre; const categoriaEl=()=>categoria; const cantidadEl=()=>cantidad;
const ventaCodigoEl=()=>ventaCodigo; const ventaCantidadEl=()=>ventaCantidad;
function cargarSelects(){ categoria.innerHTML='<option value="">Elige</option>'; categorias.forEach(c=>{ const o=document.createElement("option"); o.value=c; o.textContent=c; categoria.appendChild(o); }); }
function cargarEliminarCategorias(){ categoriaEliminar.innerHTML='<option value="">Seleccionar</option>'; categorias.forEach(c=>{ const o=document.createElement("option"); o.value=c; o.textContent=c; categoriaEliminar.appendChild(o); }); }
function limpiarStock(){ codigo.value=""; nombre.value=""; categoria.value=""; cantidad.value=""; }
function guardar(){ localStorage.setItem("productos",JSON.stringify(productos)); localStorage.setItem("ventas",JSON.stringify(ventas)); localStorage.setItem("categorias",JSON.stringify(categorias)); }

/* ==========================
   ADMIN
========================= */
function soloAdmin(){ if(usuarioActual.rol!=="admin"){ mostrarMensaje("No autorizado","error"); return false; } return true; }

/* ==========================
   VENDEDORES
========================= */
function cargarVendedores(){
  const select=document.getElementById("ventaVendedor");
  select.innerHTML='<option value="">Elige vendedor</option>';
  vendedores.forEach(v=>{ const o=document.createElement("option"); o.value=v; o.textContent=v; select.appendChild(o); });
}

/* ==========================
   USUARIOS FIRESTORE + AUTH
========================= */
const usuariosCol = collection(db,"usuarios");

/* CREAR USUARIO */
async function crearUsuario(){
  if(!soloAdmin()) return;
  const email=document.getElementById("nuevoUsuarioEmail").value.trim();
  const clave=document.getElementById("nuevoUsuarioClave").value.trim();
  const rol=document.getElementById("nuevoUsuarioRol").value;
  if(!email||!clave){ mostrarMensaje("Completa email y clave","error"); return; }

  try{
    const cred = await createUserWithEmailAndPassword(auth,email,clave);
    await setDoc(doc(db,"usuarios",cred.user.uid),{email,rol});
    mostrarMensaje(`Usuario ${email} creado como ${rol}`,"success");
    document.getElementById("nuevoUsuarioEmail").value="";
    document.getElementById("nuevoUsuarioClave").value="";
    cargarUsuarios();
  }catch(e){ console.error(e); mostrarMensaje("Error al crear usuario","error"); }
}

/* CARGAR USUARIOS */
async function cargarUsuarios(){
  const tbody=document.querySelector("#tablaUsuarios tbody"); tbody.innerHTML="";
  try{
    const snap=await getDocs(usuariosCol);
    snap.forEach(docu=>{
      const data=docu.data();
      const email=data.email;
      const rol=data.rol;
      const tr=document.createElement("tr");
      tr.innerHTML=`
        <td>${email}</td>
        <td>
          <select class="rolSelect">
            <option value="vendedor" ${rol==="vendedor"?"selected":""}>Vendedor</option>
            <option value="admin" ${rol==="admin"?"selected":""}>Admin</option>
          </select>
        </td>
        <td><button class="primary danger btnEliminarUsuario">Eliminar</button></td>
      `;
      tbody.appendChild(tr);

      tr.querySelector(".rolSelect").addEventListener("change",async e=>{
        await setDoc(doc(db,"usuarios",docu.id),{email,rol:e.target.value});
        mostrarMensaje(`Rol de ${email} cambiado a ${e.target.value}`,"success");
      });

      tr.querySelector(".btnEliminarUsuario").addEventListener("click",async ()=>{
        if(!confirm(`Eliminar usuario ${email}?`)) return;
        await deleteDoc(doc(db,"usuarios",docu.id));
        mostrarMensaje(`Usuario ${email} eliminado`,"info");
        cargarUsuarios();
      });
    });
  }catch(e){ console.error(e); mostrarMensaje("Error al cargar usuarios","error"); }
}

/* ==========================
   EXPORT GLOBAL
========================= */
window.login=login;
window.logout=logout;
window.showSection=showSection;
window.agregarProducto=agregarProducto;
window.registrarVenta=registrarVenta;
window.resetearTodo=resetearTodo;
window.agregarCategoria=agregarCategoria;
window.eliminarCategoria=eliminarCategoria;
window.crearUsuario=crearUsuario;
