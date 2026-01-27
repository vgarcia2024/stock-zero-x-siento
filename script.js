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

/* Config */
const firebaseConfig = {
  apiKey: "TU_API_KEY",
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
let categorias = ["Textil", "Difusor", "Aerosol", "Sahumerio","Tarjeta","Hornito","Carita","Tecnologia/Varios"];
let productos = [];
let ventas = [];
let vendedores = ["Fito","Andre","Juli","Luli","Valen"];
let emailANombre = {
  "fito@zeroxsiento.com":"Fito",
  "andre@zeroxsiento.com":"Andre",
  "juli@zeroxsiento.com":"Juli",
  "luli@zeroxsiento.com":"Luli",
  "valen@zeroxsiento.com":"Valen"
};

/* ==========================
   LOGIN
========================= */
async function login() {
  const email = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();

  if (!email || !pass) {
    mostrarMensaje("Completá los datos","error");
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const rol = await obtenerRol(cred.user);
    usuarioActual = { user: cred.user.email, rol };
    iniciarApp();
  } catch (e) {
    console.error(e);
    mostrarMensaje("Usuario o contraseña incorrectos","error");
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
   ROL
========================= */
async function obtenerRol(user) {
  try {
    const snap = await getDoc(doc(db,"usuarios",user.uid));
    return snap.exists()? snap.data().rol : "vendedor";
  } catch(e) {
    console.error(e);
    return "vendedor";
  }
}

/* ==========================
   SESIÓN AUTOMÁTICA
========================= */
onAuthStateChanged(auth, async (user)=>{
  if(user){
    const rol = await obtenerRol(user);
    usuarioActual = { user:user.email, rol };
    iniciarApp();
  }
});

/* ==========================
   INICIAR APP
========================= */
function iniciarApp(){
  document.getElementById("loginScreen").style.display="none";
  document.getElementById("app").style.display="block";

  // limpiar toast previo
  mostrarMensaje("","info");

  document.getElementById("userName").textContent = usuarioActual.user+" ("+usuarioActual.rol+")";
  document.getElementById("btnAjustes").style.display = usuarioActual.rol==="admin"?"block":"none";

  cargarSelects();
  cargarVendedores();
  actualizarDashboard();
  cargarStats();

  if(usuarioActual.rol==="admin") cargarUsuarios();
}

/* ==========================
   TOAST
========================= */
function mostrarMensaje(t,tipo="info"){
  const toast=document.getElementById("toast");
  toast.textContent=t;
  toast.className="";
  if(t) toast.classList.add("show",tipo);
}

/* ==========================
   NAV
========================= */
function showSection(id){
  document.querySelectorAll("section").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll("nav button").forEach(b=>b.classList.remove("active"));
  event?.target?.classList.add("active");
}

/* ==========================
   DASHBOARD
========================= */
function actualizarDashboard(){
  const hoy=new Date().toLocaleDateString();
  const ventasHoy = ventas.filter(v=>v.fecha.includes(hoy));
  document.getElementById("ventasHoy").textContent = ventasHoy.length;
  const total = productos.reduce((sum,p)=>sum+p.cantidad,0);
  document.getElementById("stockTotal").textContent = total;

  const ranking={};
  ventas.forEach(v=>ranking[v.vendedor]=(ranking[v.vendedor]||0)+v.cantidad);

  let mejor="-",max=0;
  for(const v in ranking) if(ranking[v]>max){max=ranking[v];mejor=v;}
  document.getElementById("mejorVendedor").textContent = emailANombre[mejor]||mejor;
}

/* ==========================
   STATS
========================= */
function cargarStats(){
  let html="<h3>Ventas</h3><table><tr><th>Vendedor</th><th>Total</th></tr>";
  const r={};
  ventas.forEach(v=>r[v.vendedor]=(r[v.vendedor]||0)+v.cantidad);
  for(const v in r) html+=`<tr><td>${emailANombre[v]||v}</td><td>${r[v]}</td></tr>`;
  html+="</table>";
  document.getElementById("statsContent").innerHTML=html;
}

/* ==========================
   SELECTS
========================= */
function cargarSelects(){
  // se pueden agregar selects de productos/categorías si hace falta
}

function cargarVendedores(){
  const select=document.getElementById("ventaVendedor");
  if(!select) return;
  select.innerHTML='<option value="">Elige vendedor</option>';
  vendedores.forEach(v=>{
    const o=document.createElement("option");
    o.value=v;
    o.textContent=v;
    select.appendChild(o);
  });
}

/* ==========================
   USUARIOS ADMIN
========================= */
const usuariosCol = collection(db,"usuarios");

async function crearUsuario(){
  if(usuarioActual.rol!=="admin"){mostrarMensaje("No autorizado","error");return;}

  const email = document.getElementById("nuevoUsuarioEmail").value.trim();
  const pass = document.getElementById("nuevoUsuarioClave").value.trim();
  const rol = document.getElementById("nuevoUsuarioRol").value;
  if(!email||!pass){mostrarMensaje("Email y clave requeridos","error");return;}

  try{
    const cred=await createUserWithEmailAndPassword(auth,email,pass);
    await setDoc(doc(db,"usuarios",cred.user.uid),{rol,email});

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
  const tbody=document.querySelector("#tablaUsuarios tbody");
  tbody.innerHTML="";

  const snap=await getDocs(usuariosCol);
  snap.forEach(docu=>{
    const data=docu.data();
    const email=data.email||docu.id;
    const rol=data.rol||"vendedor";

    const tr=document.createElement("tr");
    tr.innerHTML=`
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

    tr.querySelector(".rolSelect").addEventListener("change", async e=>{
      const nuevoRol=e.target.value;
      await setDoc(doc(db,"usuarios",docu.id),{rol:nuevoRol,email});
      mostrarMensaje(`Rol de ${email} cambiado a ${nuevoRol}`,"success");
    });

    tr.querySelector(".btnEliminarUsuario").addEventListener("click", async ()=>{
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
window.crearUsuario = crearUsuario;
