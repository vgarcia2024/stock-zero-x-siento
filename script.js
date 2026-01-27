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
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 🔹 CONFIG FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyCwBuxmHQgaqJAac_WiMZkpZUMFVzONFkA",
  authDomain: "zero-x-siento-stock.firebaseapp.com",
  projectId: "zero-x-siento-stock",
  storageBucket: "zero-x-siento-stock.firebasestorage.app",
  messagingSenderId: "764048708615",
  appId: "1:764048708615:web:1287e135d38a3588b806a2"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ========================== ESTADO ========================== */
let usuarioActual = null;
let categorias = ["Textil","Difusor","Aerosol","Sahumerio","Tarjeta","Hornito","Carita","Tecnologia/Varios"];
let productos = [];
let ventas = [];
let usuarios = [];

/* ========================== LOGIN ========================== */
async function login() {
  const email = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";

  if (!email || !pass) { mostrarMensaje("Completá los datos","error"); return; }

  try {
    const cred = await signInWithEmailAndPassword(auth,email,pass);
    const rol = await obtenerRol(cred.user);
    usuarioActual = { user: cred.user.email, rol };
    iniciarApp();
  } catch(e){ console.error(e); mostrarMensaje("Usuario o contraseña incorrectos","error"); }
}

async function logout() { await signOut(auth); location.reload(); }

async function obtenerRol(user) {
  try {
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (snap.exists()) return snap.data().rol;
    return "vendedor";
  } catch(e){ console.error("Error rol:", e); return "vendedor"; }
}

onAuthStateChanged(auth, async (user)=>{
  if(user){
    const rol = await obtenerRol(user);
    usuarioActual = { user: user.email, rol };
    iniciarApp();
  }
});

/* ========================== INICIAR APP ========================== */
function iniciarApp(){
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("userName").textContent = usuarioActual.user + " (" + usuarioActual.rol + ")";
  document.getElementById("btnAjustes").style.display = usuarioActual.rol==="admin"?"block":"none";

  cargarSelects();
  cargarEliminarCategorias();
  cargarVendedores();
  cargarUsuarios();
  cargarProductos();
  cargarVentas();
  actualizarDashboard();
}

/* ========================== TOAST ========================== */
function mostrarMensaje(t,tipo="info"){
  const toast = document.getElementById("toast");
  toast.textContent=t;
  toast.className="";
  toast.classList.add("show",tipo);
  setTimeout(()=>toast.classList.remove("show"),3500);
}

/* ========================== NAV ========================== */
function showSection(id){
  document.querySelectorAll("section").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll("nav button").forEach(b=>b.classList.remove("active"));
  event.target.classList.add("active");
}

/* ========================== PRODUCTOS ========================== */
const productosCol = collection(db,"productos");

async function agregarProducto(){
  const codigo=document.getElementById("codigo").value.trim();
  const nombre=document.getElementById("nombre").value.trim();
  const categoria=document.getElementById("categoria").value;
  const cantidad=Number(document.getElementById("cantidad").value);
  if(!codigo||!nombre||!categoria||cantidad<=0){ mostrarMensaje("Completa todos los datos","error"); return; }

  await setDoc(doc(productosCol,codigo),{codigo,nombre,categoria,cantidad});
  mostrarMensaje("Producto guardado","success");
  limpiarStock();
}

function limpiarStock(){
  document.getElementById("codigo").value="";
  document.getElementById("nombre").value="";
  document.getElementById("categoria").value="";
}

/* ========================== VENTAS ========================== */
function cargarVendedores(){
  const sel=document.getElementById("ventaVendedor");
  sel.innerHTML="";
  
  // Primero agregamos el usuario actual si no está en la lista
  if(!usuarios.some(u=>u.email === usuarioActual.user)){
    usuarios.push({email: usuarioActual.user, rol: usuarioActual.rol, nombre: usuarioActual.user});
  }

  // Filtramos vendedores (rol vendedor o tu mismo)
  const vendedores = usuarios.filter(u => u.rol === "vendedor" || u.email === usuarioActual.user);
  
  vendedores.forEach(v=>{
    const o=document.createElement("option");
    o.value=v.email;
    o.textContent=v.email;
    sel.appendChild(o);
  });

  // Seleccionamos por defecto tu usuario
  sel.value = usuarioActual.user;
}

async function registrarVenta() {
  const codigo = document.getElementById("ventaCodigo").value.trim();
  const cantidadVenta = parseInt(document.getElementById("ventaCantidad").value);

  if (isNaN(cantidadVenta) || cantidadVenta <= 0) {
    mostrarMensaje("Cantidad inválida", "error");
    return;
  }

  // Buscamos el producto
  const prod = productos.find(p => p.codigo === codigo);
  if (!prod) {
    mostrarMensaje("Producto no encontrado", "error");
    return;
  }

  if (prod.cantidad < cantidadVenta) {
    mostrarMensaje("Stock insuficiente", "error");
    return;
  }

  // Vendedor seleccionado
  const vendedorEmail = document.getElementById("ventaVendedor").value || usuarioActual.user;
  const vendedorNombre = usuarios.find(u => u.email === vendedorEmail)?.nombre || vendedorEmail;

  // Restamos stock y actualizamos Firestore
  const prodRef = doc(db, "productos", codigo);
  await setDoc(prodRef, {
    ...prod,
    cantidad: prod.cantidad - cantidadVenta
  });

  // Guardamos la venta en Firestore
  const ventasCol = collection(db, "ventas");
  await setDoc(doc(ventasCol), {
    codigo,
    nombre: prod.nombre,
    vendedor: vendedorNombre,
    cantidad: cantidadVenta,
    fecha: new Date().toLocaleString()
  });

  mostrarMensaje("Venta registrada", "success");
  limpiarVenta();
}

// Limpia inputs de venta después de registrar
function limpiarVenta() {
  document.getElementById("ventaCodigo").value = "";
  document.getElementById("ventaCantidad").value = 1;
  document.getElementById("ventaVendedor").value = usuarioActual.user; // volver a seleccionar tu usuario
}

/* ========================== EXPORTAR CSV ========================== */
function exportarVentasCSV() {
  if (ventas.length === 0) { mostrarMensaje("No hay ventas para exportar", "error"); return; }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Vendedor,Producto,Cantidad,Fecha\r\n";

  ventas.forEach(v => {
    const row = [v.vendedor, v.nombre, v.cantidad, v.fecha].join(",");
    csvContent += row + "\r\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "ventas.csv");
  document.body.appendChild(link); // requerido para Firefox
  link.click();
  document.body.removeChild(link);
  mostrarMensaje("Ventas exportadas", "success");
}

// Exportamos la función
window.exportarVentasCSV = exportarVentasCSV;

/* ========================== CATEGORIAS ========================== */
function cargarSelects(){
  const categoriaSel=document.getElementById("categoria");
  categoriaSel.innerHTML='<option value="">Elige</option>';
  categorias.forEach(c=>{
    const o=document.createElement("option");
    o.value=c; o.textContent=c; categoriaSel.appendChild(o);
  });
}

function cargarEliminarCategorias(){
  const catElim=document.getElementById("categoriaEliminar");
  catElim.innerHTML='<option value="">Seleccionar</option>';
  categorias.forEach(c=>{
    const o=document.createElement("option");
    o.value=c; o.textContent=c; catElim.appendChild(o);
  });
}

function agregarCategoria(){
  const n=document.getElementById("nuevaCategoria").value.trim();
  if(!n) return;
  if(categorias.includes(n)){ mostrarMensaje("Ya existe","error"); return; }
  categorias.push(n); cargarSelects(); cargarEliminarCategorias(); mostrarMensaje("Categoría agregada","success");
}

function eliminarCategoria(){
  const cat=document.getElementById("categoriaEliminar").value;
  if(!cat){ mostrarMensaje("Elegí una","error"); return; }
  categorias=categorias.filter(c=>c!==cat); cargarSelects(); cargarEliminarCategorias(); mostrarMensaje("Categoría eliminada","success");
}

/* ========================== DASHBOARD ========================== */
function actualizarDashboard(){
  const hoy=new Date().toLocaleDateString();
  const ventasHoy=ventas.filter(v=>v.fecha.includes(hoy));
  document.getElementById("ventasHoy").textContent=ventasHoy.length;

  let total=productos.reduce((sum,p)=>sum+p.cantidad,0);
  document.getElementById("stockTotal").textContent=total;

  const ranking={};
  ventas.forEach(v=>ranking[v.vendedor]=(ranking[v.vendedor]||0)+v.cantidad);

  let mejor="-", max=0;
  for(const v in ranking)if(ranking[v]>max){ max=ranking[v]; mejor=v; }
  document.getElementById("mejorVendedor").textContent=mejor;

  const tbody=document.querySelector("#productosDisponibles tbody");
  tbody.innerHTML="";
  productos.forEach(p=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${p.codigo}</td><td>${p.nombre}</td><td>${p.categoria}</td><td>${p.cantidad}</td>`;
    tbody.appendChild(tr);
  });

  let html="<h3>Ventas</h3><table><tr><th>Vendedor</th><th>Producto</th><th>Cantidad</th><th>Fecha</th></tr>";
  ventas.forEach(v=>{ html+=`<tr><td>${v.vendedor}</td><td>${v.nombre}</td><td>${v.cantidad}</td><td>${v.fecha}</td></tr>`; });
  html+="</table>";
  document.getElementById("statsContent").innerHTML=html;
}

/* ========================== USUARIOS ========================== */
const usuariosCol = collection(db,"usuarios");
async function crearUsuario(){
  if(usuarioActual.rol!=="admin"){ mostrarMensaje("No autorizado","error"); return; }
  const email=document.getElementById("nuevoUsuarioEmail").value.trim();
  const pass=document.getElementById("nuevoUsuarioClave").value.trim();
  const rol=document.getElementById("nuevoUsuarioRol").value;
  if(!email||!pass){ mostrarMensaje("Email y clave requeridos","error"); return; }

  try{
    const cred=await createUserWithEmailAndPassword(auth,email,pass);
    await setDoc(doc(db,"usuarios",cred.user.uid),{email,rol});
    mostrarMensaje(`Usuario ${email} creado`,"success");
    document.getElementById("nuevoUsuarioEmail").value="";
    document.getElementById("nuevoUsuarioClave").value="";
  }catch(e){ console.error(e); mostrarMensaje("Error al crear usuario","error"); }
}

/* ========================== FIRESTORE EN TIEMPO REAL ========================== */
async function cargarUsuarios(){
  const tbody=document.querySelector("#tablaUsuarios tbody");
  onSnapshot(usuariosCol, snapshot=>{
    usuarios=[];
    tbody.innerHTML="";
    snapshot.forEach(docu=>{
      const data=docu.data();
      if(usuarios.find(u=>u.email===data.email)) return;
      usuarios.push({email:data.email,rol:data.rol,id:docu.id,nombre:data.nombre});
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${data.email}</td>
      <td><select class="rolSelect"><option value="vendedor"${data.rol==="vendedor"?" selected":""}>Vendedor</option><option value="admin"${data.rol==="admin"?" selected":""}>Admin</option></select></td>
      <td><button class="primary danger btnEliminarUsuario">Eliminar</button></td>`;
      tbody.appendChild(tr);

      tr.querySelector(".rolSelect").addEventListener("change", async e=>{
        await setDoc(doc(db,"usuarios",docu.id),{email:data.email,rol:e.target.value});
        mostrarMensaje(`Rol de ${data.email} cambiado a ${e.target.value}`,"success");
        cargarVendedores();
      });

      tr.querySelector(".btnEliminarUsuario").addEventListener("click", async ()=>{
        mostrarMensaje(`Eliminando usuario ${data.email}...`,"info");
        await deleteDoc(doc(db,"usuarios",docu.id));
        mostrarMensaje(`Usuario ${data.email} eliminado`,"success");
      });
    });
    cargarVendedores();
  });
}

function cargarProductos(){
  onSnapshot(productosCol, snapshot=>{
    productos=[];
    snapshot.forEach(docu=>{
      productos.push(docu.data());
    });
    actualizarDashboard();
  });
}

function cargarVentas(){
  const ventasCol = collection(db,"ventas");
  onSnapshot(ventasCol, snapshot=>{
    ventas=[];
    snapshot.forEach(docu=>{
      ventas.push(docu.data());
    });
    actualizarDashboard();
  });
}

/* ========================== RESET TOTAL ========================== */
async function resetearTodo() {
  if(usuarioActual.rol!=="admin"){ mostrarMensaje("No autorizado","error"); return; }

  mostrarMensaje("Reseteando stock y ventas...","info");

  try {
    const productosSnapshot = await getDocs(productosCol);
    const ventasCol = collection(db,"ventas");
    const ventasSnapshot = await getDocs(ventasCol);

    const borrarProductos = productosSnapshot.docs.map(d=>deleteDoc(doc(db,"productos",d.id)));
    const borrarVentas = ventasSnapshot.docs.map(d=>deleteDoc(doc(db,"ventas",d.id)));
    await Promise.all([...borrarProductos,...borrarVentas]);

    productos = [];
    ventas = [];
    actualizarDashboard();
    mostrarMensaje("Stock y ventas reseteados correctamente","success");
  } catch(e){
    console.error(e);
    mostrarMensaje("Error al resetear","error");
  }
}

/* ========================== EXPORTS ========================== */
window.login=login;
window.logout=logout;
window.showSection=showSection;
window.agregarProducto=agregarProducto;
window.registrarVenta=registrarVenta;
window.agregarCategoria=agregarCategoria;
window.eliminarCategoria=eliminarCategoria;
window.crearUsuario=crearUsuario;
window.resetearTodo=resetearTodo;
