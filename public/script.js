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

/* FIREBASE */
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

/* ESTADO */
let usuarioActual = null;
let categorias = ["Textil","Difusor","Aerosol"];
let productos = [];
let ventas = [];
let usuarios = [];
let carrito = [];

/* LOGIN */
async function login() {
  const email = loginUser.value.trim();
  const pass = loginPass.value.trim();
  if (!email || !pass) return mostrarMensaje("Completá los datos","error");

  try {
    const cred = await signInWithEmailAndPassword(auth,email,pass);
    usuarioActual = { user: cred.user.email, rol: await obtenerRol(cred.user) };
    iniciarApp();
  } catch {
    mostrarMensaje("Credenciales incorrectas","error");
  }
}

async function logout(){ await signOut(auth); location.reload(); }

async function obtenerRol(user){
  const snap = await getDoc(doc(db,"usuarios",user.uid));
  return snap.exists()?snap.data().rol:"vendedor";
}

onAuthStateChanged(auth, async user=>{
  if(user){
    usuarioActual={ user:user.email, rol:await obtenerRol(user) };
    iniciarApp();
  }
});

/* INIT */
function iniciarApp(){
  loginScreen.style.display="none";
  app.style.display="block";
  userName.textContent=`${usuarioActual.user} (${usuarioActual.rol})`;
  btnAjustes.style.display=usuarioActual.rol==="admin"?"block":"none";
  cargarSelects();
  cargarProductos();
}

/* TOAST */
function mostrarMensaje(t,tipo="info"){
  toast.textContent=t;
  toast.className=`show ${tipo}`;
  setTimeout(()=>toast.className="",3000);
}

/* NAV */
function showSection(id){
  document.querySelectorAll("section").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* PRODUCTOS */
const productosCol = collection(db,"productos");

async function agregarProducto(){
  const codigo=codigo.value.trim();
  const nombre=nombre.value.trim();
  const categoria=categoria.value;
  const cantidad=Number(cantidad.value);
  if(!codigo||!nombre||cantidad<=0)return;
  await setDoc(doc(productosCol,codigo),{codigo,nombre,categoria,cantidad});
  mostrarMensaje("Producto guardado","success");
}

/* HOME + BUSCADOR */
function renderCards(lista){
  cardsProductos.innerHTML="";
  lista.forEach(p=>{
    const d=document.createElement("div");
    d.className="product-card";
    d.innerHTML=`
      <h4>${p.nombre}</h4>
      <small>${p.categoria}</small>
      <small>Stock: ${p.cantidad}</small>
      <button onclick="agregarAlCarrito('${p.codigo}')">Agregar</button>
    `;
    cardsProductos.appendChild(d);
  });
}

function filtrarProductos(){
  const t=buscador.value.toLowerCase();
  renderCards(productos.filter(p=>
    p.nombre.toLowerCase().includes(t)||
    p.categoria.toLowerCase().includes(t)||
    p.codigo.toLowerCase().includes(t)
  ));
}

function agregarAlCarrito(codigo){
  const prod=productos.find(p=>p.codigo===codigo);
  if(!prod||prod.cantidad<=0)return mostrarMensaje("Sin stock","error");
  const item=carrito.find(i=>i.codigo===codigo);
  item?item.cantidad++:carrito.push({codigo,nombre:prod.nombre,cantidad:1});
  mostrarMensaje("Agregado al carrito","success");
}

function irACarrito(){
  if(!carrito.length)return mostrarMensaje("Carrito vacío","info");
  showSection("ventas");
  ventaCodigo.value=carrito[0].codigo;
  ventaCantidad.value=carrito[0].cantidad;
}

/* CARGAR */
function cargarProductos(){
  onSnapshot(productosCol,snap=>{
    productos=[];
    snap.forEach(d=>productos.push(d.data()));
    renderCards(productos);
  });
}

/* EXPORTS */
window.login=login;
window.logout=logout;
window.showSection=showSection;
window.agregarProducto=agregarProducto;
window.filtrarProductos=filtrarProductos;
window.agregarAlCarrito=agregarAlCarrito;
window.irACarrito=irACarrito;
