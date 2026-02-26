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
let ultimaVenta = null;

/* ========================== LOGIN ========================== */
async function login() {
  const email = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";

  if (!email || !pass) { 
    mostrarMensaje("Completá los datos","error"); 
    return; 
  }

  // 🔹 BLOQUE TRY-CATCH para login
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const rol = await obtenerRol(cred.user);
    usuarioActual = { user: cred.user.email, rol };
    iniciarApp();
  } catch(e){ 
    console.error(e); 
    mostrarMensaje("Usuario o contraseña incorrecta", "error"); // aquí usamos el toast corredizo
  }
}

async function registrarse() {
  const email = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();

  if (!email || !pass) {
    mostrarMensaje("Completá email y contraseña", "error");
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    await setDoc(doc(db, "usuarios", cred.user.uid), {
      email: email,
      rol: "vendedor",
      nombre: email
    });

    await signOut(auth); // 🔥 ESTA ES LA CLAVE

    mostrarMensaje("Cuenta creada. Ahora iniciá sesión.", "success");

  } catch (e) {
    if (e.code === "auth/email-already-in-use") {
      mostrarMensaje("Mail ya existente", "error");
    } else if (e.code === "auth/weak-password") {
      mostrarMensaje("La contraseña debe tener al menos 6 caracteres", "error");
    } else {
      mostrarMensaje("Error al crear cuenta", "error");
    }
  }
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

// public/script.js


/* ========================== TOAST ========================== */
function mostrarMensaje(t,tipo="info"){
  const toast = document.getElementById("toast");
  toast.textContent=t;
  toast.className="";
  toast.classList.add("show",tipo);
  setTimeout(()=>toast.classList.remove("show"),3500);
}

/* ========================== NAV ========================== */
function showSection(id, btn){
  document.querySelectorAll("section").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  document.querySelectorAll("nav button").forEach(b=>b.classList.remove("active"));
  if(btn) btn.classList.add("active");
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
  const sel = document.getElementById("ventaVendedor");
  sel.innerHTML = "";

  // aseguramos que el usuario actual esté en la lista
  if(!usuarios.some(u => u.email === usuarioActual.user)){
    usuarios.push({
      email: usuarioActual.user,
      rol: usuarioActual.rol,
      nombre: usuarioActual.user
    });
  }

  // vendedores + admins
  const vendedores = usuarios.filter(
    u => u.rol === "vendedor" || u.rol === "admin"
  );

  vendedores.forEach(v=>{
    const o = document.createElement("option");
    o.value = v.email;
    o.textContent = v.email;
    sel.appendChild(o);
  });

  sel.value = usuarioActual.user;
}


async function registrarVenta() {
  const codigo = document.getElementById("ventaCodigo").value.trim();
  const cantidadVenta = parseInt(document.getElementById("ventaCantidad").value);

  if (!codigo || isNaN(cantidadVenta) || cantidadVenta <= 0) {
    mostrarMensaje("Datos inválidos", "error");
    return;
  }

  const prod = productos.find(p => p.codigo === codigo);
  if (!prod) {
    mostrarMensaje("Producto no encontrado", "error");
    return;
  }

  if (prod.cantidad < cantidadVenta) {
    mostrarMensaje("Stock insuficiente", "error");
    return;
  }

  const vendedorEmail =
    document.getElementById("ventaVendedor").value || usuarioActual.user;
  const vendedorNombre =
    usuarios.find(u => u.email === vendedorEmail)?.nombre || vendedorEmail;

  try {
    // actualizar stock
    await setDoc(doc(db, "productos", codigo), {
      ...prod,
      cantidad: prod.cantidad - cantidadVenta
    });

    // guardar venta
    const ventasCol = collection(db, "ventas");
    const ventaRef = doc(ventasCol);

     await setDoc(ventaRef, {
  codigo,
  nombre: prod.nombre,
  categoria: prod.categoria, // 🔥 NUEVO
  vendedor: vendedorNombre,
  cantidad: cantidadVenta,
  fecha: new Date().toLocaleString(),
  timestamp: Date.now(),
  revertida: false
});


    ultimaVenta = {
      id: ventaRef.id,
      codigo,
      cantidad: cantidadVenta
    };

    limpiarVenta();
    mostrarMensaje("Venta registrada", "success");
  } catch (e) {
    console.error(e);
    mostrarMensaje("Error al registrar venta", "error");
  }
}

async function revertirUltimaVenta() {
  if (!ultimaVenta) {
    mostrarMensaje("No hay ninguna venta para revertir", "error");
    return;
  }

  try {
    const prodRef = doc(db, "productos", ultimaVenta.codigo);
    const prodSnap = await getDoc(prodRef);

    if (!prodSnap.exists()) {
      mostrarMensaje("Producto no encontrado", "error");
      return;
    }

    const prod = prodSnap.data();

    // devolver stock
    await setDoc(prodRef, {
      ...prod,
      cantidad: prod.cantidad + ultimaVenta.cantidad
    });

    // marcar venta como revertida (NO borrar)
    await setDoc(
      doc(db, "ventas", ultimaVenta.id),
      { revertida: true },
      { merge: true }
    );

    ultimaVenta = null;

    mostrarMensaje("Venta revertida correctamente", "success");
  } catch (e) {
    console.error(e);
    mostrarMensaje("Error al revertir la venta", "error");
  }
}



function limpiarVenta() {
  document.getElementById("ventaCodigo").value = "";
  document.getElementById("ventaCantidad").value = 1;
  document.getElementById("ventaVendedor").value = usuarioActual.user;
}



  /* ========================== BUSCADOR DE PRODUCTOS ========================== */


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

/* ========================== BUSCADOR DE PRODUCTOS ========================== */
function filtrarProductos(){
  const q = document
    .getElementById("busquedaProducto")
    .value
    .toLowerCase();

  const filtrados = productos.filter(p =>
    p.codigo.toLowerCase().includes(q) ||
    p.nombre.toLowerCase().includes(q) ||
    p.categoria.toLowerCase().includes(q)
  );

  renderProductos(filtrados);
}

function renderProductos(lista){
  const tbody = document.querySelector("#productosDisponibles tbody");
  tbody.innerHTML = "";

  // 🔴 Ordenamos: primero sin stock
  const ordenados = [...lista].sort((a, b) => a.cantidad - b.cantidad);

  ordenados.forEach(p=>{
    const tr = document.createElement("tr");

    // 🔴 Si no tiene stock, le agregamos clase
    if(p.cantidad === 0){
      tr.classList.add("sin-stock");
    }

    tr.innerHTML = `
      <td>${p.codigo}</td>
      <td>${p.nombre}</td>
      <td>${p.categoria}</td>
      <td>${p.cantidad}</td>
    `;

    tbody.appendChild(tr);
  });
}



/* ========================== DASHBOARD ========================== */
function actualizarDashboard(){

  const hoy = new Date().toLocaleDateString();

  const ventasHoy = ventas.filter(
    v => !v.revertida && v.fecha.includes(hoy)
  );

  const totalHoy = ventasHoy.reduce(
    (sum, v) => sum + Number(v.cantidad || 0),
    0
  );

  document.getElementById("ventasHoy").textContent = totalHoy;

  // Stock total
  let total = productos.reduce((sum,p)=>sum+p.cantidad,0);
  document.getElementById("stockTotal").textContent = total;

  // Ranking vendedores
  const ranking = {};
  ventas
    .filter(v => !v.revertida)
    .forEach(v => {
      ranking[v.vendedor] = (ranking[v.vendedor] || 0) + v.cantidad;
    });

  let mejor = "-", max = 0;
  for(const v in ranking){
    if(ranking[v] > max){
      max = ranking[v];
      mejor = v;
    }
  }

  document.getElementById("mejorVendedor").textContent = mejor;

  // Tabla productos
  renderProductos(productos);

  // 🔥 TABLA ESTADÍSTICAS CON CATEGORÍA
  let html = `
    <h3>Ventas</h3>
    <table>
      <tr>
        <th>Vendedor</th>
        <th>Producto</th>
        <th>Categoría</th>
        <th>Cantidad</th>
        <th>Fecha</th>
      </tr>
  `;

  ventas
    .filter(v => !v.revertida)
    .forEach(v =>{
      html += `
        <tr>
          <td>${v.vendedor}</td>
          <td>${v.nombre}</td>
          <td>${v.categoria || "-"}</td>
          <td>${v.cantidad}</td>
          <td>${v.fecha}</td>
        </tr>
      `;
    });

  html += "</table>";

  document.getElementById("statsContent").innerHTML = html;
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
window.filtrarProductos = filtrarProductos;
window.revertirUltimaVenta = revertirUltimaVenta;
window.registrarse = registrarse;

