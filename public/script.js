import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ========================== ESTADO ========================== */
let usuarioActual = null;
let categorias = [], productos = [], ventas = [], usuarios = [];
let ultimaVenta = null, productoEditandoCodigo = null;

/* ========================== LOGIN ========================== */
async function login() {
  const email = document.getElementById("loginUser").value.trim();
  const pass  = document.getElementById("loginPass").value.trim();
  document.getElementById("loginError").textContent = "";
  if (!email || !pass) { mostrarMensaje("Completá los datos", "error"); return; }
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    usuarioActual = { user: cred.user.email, rol: await obtenerRol(cred.user) };
    iniciarApp();
  } catch(e) { console.error(e); mostrarMensaje("Usuario o contraseña incorrecta", "error"); }
}

async function registrarse() {
  await signOut(auth);
  const email = document.getElementById("loginUser").value.trim();
  const pass  = document.getElementById("loginPass").value.trim();
  if (!email || !pass) { mostrarMensaje("Completá email y contraseña", "error"); return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "usuarios", cred.user.uid), { email, rol: "vendedor", nombre: email });
    await signOut(auth);
    mostrarMensaje("Cuenta creada. Ahora iniciá sesión.", "success");
  } catch(e) {
    if (e.code === "auth/email-already-in-use") mostrarMensaje("Mail ya existente", "error");
    else if (e.code === "auth/weak-password") mostrarMensaje("La contraseña debe tener al menos 6 caracteres", "error");
    else mostrarMensaje("Error al crear cuenta", "error");
  }
}

async function logout() { await signOut(auth); location.reload(); }

async function obtenerRol(user) {
  try {
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    return snap.exists() ? snap.data().rol : "vendedor";
  } catch(e) { return "vendedor"; }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioActual = { user: user.email, rol: await obtenerRol(user) };
    iniciarApp();
  }
});

/* ========================== INICIAR APP ========================== */
function iniciarApp() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("userName").textContent = usuarioActual.user + " (" + usuarioActual.rol + ")";
  document.getElementById("btnAjustes").style.display = usuarioActual.rol === "admin" ? "block" : "none";
  cargarCategorias(); cargarVendedores(); cargarUsuarios();
  cargarProductos(); cargarVentas(); actualizarDashboard();
  docIniciar();
}

/* ========================== TOAST ========================== */
function mostrarMensaje(t, tipo = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = t; toast.className = "";
  toast.classList.add("show", tipo);
  setTimeout(() => toast.classList.remove("show"), 3500);
}

/* ========================== NAV ========================== */
function showSection(id) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll("nav button").forEach(b => {
    b.classList.toggle("active", b.getAttribute("onclick")?.includes(`'${id}'`));
  });
}

/* ========================== PRODUCTOS ========================== */
const productosCol = collection(db, "productos");
const categoriasCol = collection(db, "categorias");

async function agregarProducto() {
  const codigo   = document.getElementById("codigo").value.trim();
  const nombre   = document.getElementById("nombre").value.trim();
  const categoria= document.getElementById("categoria").value;
  const cantidad = Number(document.getElementById("cantidad").value);
  if (!codigo || !nombre || !categoria || cantidad <= 0) { mostrarMensaje("Completa todos los datos", "error"); return; }
  
  // Validar código duplicado
  if (productos.some(p => p.codigo === codigo)) {
    mostrarMensaje(`El código "${codigo}" ya existe. Usá otro o editá el producto existente.`, "error");
    return;
  }
  await setDoc(doc(productosCol, codigo), { codigo, nombre, categoria, cantidad });
  mostrarMensaje("Producto guardado", "success");
  document.getElementById("codigo").value = "";
  document.getElementById("nombre").value = "";
  document.getElementById("categoria").value = "";
}

function capitalizar(texto) {
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

async function capitalizarProductos() {
  if (usuarioActual.rol !== "admin") { mostrarMensaje("No autorizado", "error"); return; }
  try {
    const snap = await getDocs(productosCol);
    snap.forEach(async (docu) => {
      const data = docu.data();
      const nuevoNombre = capitalizar(data.nombre);
      if (data.nombre !== nuevoNombre) await setDoc(doc(db, "productos", docu.id), { ...data, nombre: nuevoNombre });
    });
    mostrarMensaje("Nombres capitalizados correctamente", "success");
  } catch(e) { console.error(e); mostrarMensaje("Error al capitalizar", "error"); }
}

/* ========================== AUTOCOMPLETE VENTAS ========================== */
window.autocompleteVenta = function() {
  const q   = document.getElementById("ventaBuscador").value.trim().toLowerCase();
  const drop = document.getElementById("autocompleteDropdown");

  // Limpiar selección previa
  document.getElementById("ventaCodigo").value = "";
  document.getElementById("ventaProductoSeleccionado").classList.add("hidden");

  if (!q || q.length < 1) { drop.classList.add("hidden"); return; }

  const filtrados = productos.filter(p =>
    p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)
  ).slice(0, 8);

  if (filtrados.length === 0) { drop.classList.add("hidden"); return; }

  drop.innerHTML = filtrados.map(p => `
    <div class="autocomplete-item" onclick="seleccionarProductoVenta('${p.codigo}')">
      <div>
        <div class="autocomplete-item-nombre">${p.nombre}</div>
        <div class="autocomplete-item-meta">Cód: ${p.codigo} · ${p.categoria}</div>
      </div>
      <span class="autocomplete-item-stock ${p.cantidad > 0 ? 'ok' : 'low'}">
        ${p.cantidad} en stock
      </span>
    </div>
  `).join("");
  drop.classList.remove("hidden");
};

window.seleccionarProductoVenta = function(codigo) {
  const prod = productos.find(p => p.codigo === codigo);
  if (!prod) return;
  document.getElementById("ventaCodigo").value = codigo;
  document.getElementById("ventaBuscador").value = "";
  document.getElementById("autocompleteDropdown").classList.add("hidden");
  const sel = document.getElementById("ventaProductoSeleccionado");
  sel.innerHTML = `
    <div>
      <div class="producto-seleccionado-nombre">${prod.nombre}</div>
      <div class="producto-seleccionado-meta">Cód: ${prod.codigo} · ${prod.cantidad} en stock</div>
    </div>
    <button class="producto-seleccionado-clear" onclick="limpiarSeleccionVenta()" title="Quitar">✕</button>
  `;
  sel.classList.remove("hidden");
  document.getElementById("ventaCantidad").focus();
};

window.limpiarSeleccionVenta = function() {
  document.getElementById("ventaCodigo").value = "";
  document.getElementById("ventaBuscador").value = "";
  document.getElementById("ventaProductoSeleccionado").classList.add("hidden");
  document.getElementById("ventaBuscador").focus();
};

// Cerrar dropdown al hacer click afuera o al presionar Escape
document.addEventListener("click", (e) => {
  const wrap = document.getElementById("autocompleteDropdown");
  if (!wrap) return;
  if (!e.target.closest(".autocomplete-wrap")) {
    wrap.classList.add("hidden");
    wrap.innerHTML = "";
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const wrap = document.getElementById("autocompleteDropdown");
    if (wrap) { wrap.classList.add("hidden"); wrap.innerHTML = ""; }
    const buscador = document.getElementById("ventaBuscador");
    if (buscador) buscador.blur();
  }
});

/* ========================== VENTAS ========================== */
function cargarVendedores() {
  const sel = document.getElementById("ventaVendedor");
  sel.innerHTML = "";
  if (!usuarios.some(u => u.email === usuarioActual.user))
    usuarios.push({ email: usuarioActual.user, rol: usuarioActual.rol, nombre: usuarioActual.user });
  usuarios.filter(u => u.rol === "vendedor" || u.rol === "admin").forEach(v => {
    const o = document.createElement("option");
    o.value = v.email; o.textContent = v.email; sel.appendChild(o);
  });
  sel.value = usuarioActual.user;
}

async function registrarVenta() {
  const codigo = document.getElementById("ventaCodigo").value.trim();
  const cantidadVenta = parseInt(document.getElementById("ventaCantidad").value);
  if (!codigo || isNaN(cantidadVenta) || cantidadVenta <= 0) { mostrarMensaje("Datos inválidos", "error"); return; }
  const prod = productos.find(p => p.codigo === codigo);
  if (!prod) { mostrarMensaje("Producto no encontrado", "error"); return; }
  if (prod.cantidad < cantidadVenta) { mostrarMensaje("Stock insuficiente", "error"); return; }
  const vendedorEmail  = document.getElementById("ventaVendedor").value || usuarioActual.user;
  const vendedorNombre = usuarios.find(u => u.email === vendedorEmail)?.nombre || vendedorEmail;
  try {
    await setDoc(doc(db, "productos", codigo), { ...prod, cantidad: prod.cantidad - cantidadVenta });
    const ventasCol = collection(db, "ventas");
    const ventaRef  = doc(ventasCol);
    await setDoc(ventaRef, {
      codigo, nombre: prod.nombre, categoria: prod.categoria,
      vendedor: vendedorNombre, cantidad: cantidadVenta,
      fecha: new Date().toLocaleString(), timestamp: Date.now(), revertida: false
    });
    ultimaVenta = { id: ventaRef.id, codigo, cantidad: cantidadVenta };
    // Limpiar form ventas
    window.limpiarSeleccionVenta();
    document.getElementById("ventaCantidad").value = 1;
    mostrarMensaje("Venta registrada", "success");
  } catch(e) { console.error(e); mostrarMensaje("Error al registrar venta", "error"); }
}

async function revertirUltimaVenta() {
  if (!ultimaVenta) { mostrarMensaje("No hay ninguna venta para revertir", "error"); return; }
  try {
    const prodRef  = doc(db, "productos", ultimaVenta.codigo);
    const prodSnap = await getDoc(prodRef);
    if (!prodSnap.exists()) { mostrarMensaje("Producto no encontrado", "error"); return; }
    const prod = prodSnap.data();
    await setDoc(prodRef, { ...prod, cantidad: prod.cantidad + ultimaVenta.cantidad });
    await setDoc(doc(db, "ventas", ultimaVenta.id), { revertida: true }, { merge: true });
    ultimaVenta = null;
    mostrarMensaje("Venta revertida correctamente", "success");
  } catch(e) { console.error(e); mostrarMensaje("Error al revertir la venta", "error"); }
}

/* ========================== CATEGORIAS ========================== */
function cargarCategorias() {
  onSnapshot(categoriasCol, snapshot => {
    categorias = [];
    snapshot.forEach(docu => categorias.push(docu.data().nombre));
    const sel = document.getElementById("categoria");
    sel.innerHTML = '<option value="">Elegí una categoría</option>';
    categorias.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o); });
    const selElim = document.getElementById("categoriaEliminar");
    selElim.innerHTML = '<option value="">Seleccionar categoría</option>';
    categorias.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; selElim.appendChild(o); });
  });
}

async function agregarCategoria() {
  const n = document.getElementById("nuevaCategoria").value.trim();
  if (!n) return;
  try {
    await setDoc(doc(categoriasCol, n), { nombre: n });
    mostrarMensaje("Categoría agregada", "success");
    document.getElementById("nuevaCategoria").value = "";
  } catch(e) { mostrarMensaje("Error al agregar categoría", "error"); }
}

async function eliminarCategoria() {
  const cat = document.getElementById("categoriaEliminar").value;
  if (!cat) { mostrarMensaje("Elegí una", "error"); return; }
  try {
    await deleteDoc(doc(categoriasCol, cat));
    mostrarMensaje("Categoría eliminada", "success");
  } catch(e) { mostrarMensaje("Error al eliminar", "error"); }
}

/* ========================== PRODUCTOS RENDER ========================== */
function filtrarProductos() {
  const q = document.getElementById("busquedaProducto").value.toLowerCase();
  renderProductos(productos.filter(p =>
    p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q)
  ));
}

function renderProductos(lista) {
  const tbody = document.querySelector("#productosDisponibles tbody");
  tbody.innerHTML = "";
  [...lista].sort((a, b) => a.cantidad - b.cantidad).forEach(p => {
    const tr = document.createElement("tr");
    if (p.cantidad === 0) tr.classList.add("sin-stock");
    else if (p.cantidad <= UMBRAL_STOCK_BAJO) tr.classList.add("stock-bajo");
    tr.innerHTML = `
      <td>${p.codigo}</td><td>${p.nombre}</td><td>${p.categoria}</td>
      <td class="cantidad-cell">${p.cantidad}
        ${usuarioActual.rol === "admin" ? '<button class="btn-editar">✏️</button>' : ''}
      </td>`;
    const btn = tr.querySelector(".btn-editar");
    if (btn) btn.addEventListener("click", () => abrirEditarCantidad(p.codigo));
    tbody.appendChild(tr);
  });
}

function abrirEditarCantidad(codigo) {
  if (usuarioActual.rol !== "admin") { mostrarMensaje("No autorizado", "error"); return; }
  const producto = productos.find(p => p.codigo === codigo);
  if (!producto) return;
  productoEditandoCodigo = codigo;
  document.getElementById("modalNuevoNombre").value   = producto.nombre;
  document.getElementById("modalNuevaCantidad").value = producto.cantidad;
  document.getElementById("modalEditar").classList.add("show");
}

async function guardarProducto() {
  const nuevoNombre   = document.getElementById("modalNuevoNombre").value.trim();
  const nuevaCantidad = parseInt(document.getElementById("modalNuevaCantidad").value);
  const producto = productos.find(p => p.codigo === productoEditandoCodigo);
  if (!producto) return;
  if (!nuevoNombre) { mostrarMensaje("El nombre no puede estar vacío", "error"); return; }
  try {
    await setDoc(doc(db, "productos", productoEditandoCodigo), {
      ...producto, nombre: nuevoNombre, cantidad: isNaN(nuevaCantidad) ? 0 : nuevaCantidad
    });
    mostrarMensaje("Editado correctamente", "success");
    cerrarModal();
  } catch(e) { mostrarMensaje("Error al actualizar", "error"); }
}

function cerrarModal() {
  document.getElementById("modalEditar").classList.remove("show");
  document.getElementById("modalNuevoNombre").value = "";
  document.getElementById("modalNuevaCantidad").value = "";
  productoEditandoCodigo = null;
}

async function guardarCantidad() {
  if (!productoEditandoCodigo) return;
  const nuevaCantidad = Number(document.getElementById("modalNuevaCantidad").value);
  if (isNaN(nuevaCantidad) || nuevaCantidad < 0) { mostrarMensaje("Cantidad inválida", "error"); return; }
  const producto = productos.find(p => p.codigo === productoEditandoCodigo);
  try {
    await setDoc(doc(db, "productos", productoEditandoCodigo), { ...producto, cantidad: nuevaCantidad });
    mostrarMensaje("Cantidad actualizada", "success");
    cerrarModal();
  } catch(e) { mostrarMensaje("Error al actualizar", "error"); }
}

/* ========================== STOCK BAJO ========================== */
const UMBRAL_STOCK_BAJO = 2;

function actualizarAlertaStock() {
  const bajos    = productos.filter(p => p.cantidad > 0 && p.cantidad <= UMBRAL_STOCK_BAJO);
  const agotados = productos.filter(p => p.cantidad === 0);
  const todos    = [...agotados, ...bajos];

  // Badge en nav
  const badge = document.getElementById("navBadgeStock");
  if (badge) {
    if (todos.length > 0) {
      badge.textContent = todos.length;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }
}

/* ========================== DASHBOARD ========================== */
function actualizarDashboard() {
  const hoy = new Date().toLocaleDateString();
  const totalHoy = ventas.filter(v => !v.revertida && v.fecha.includes(hoy)).reduce((s, v) => s + Number(v.cantidad || 0), 0);
  document.getElementById("ventasHoy").textContent   = totalHoy;
  document.getElementById("stockTotal").textContent  = productos.reduce((s, p) => s + p.cantidad, 0);
  const ranking = {};
  ventas.filter(v => !v.revertida).forEach(v => { ranking[v.vendedor] = (ranking[v.vendedor] || 0) + v.cantidad; });
  let mejor = "-", max = 0;
  for (const v in ranking) { if (ranking[v] > max) { max = ranking[v]; mejor = v; } }
  document.getElementById("mejorVendedor").textContent = mejor;
  renderProductos(productos);
  actualizarAlertaStock();
  actualizarFiltroVendedores();
  renderStats();
}

function actualizarFiltroVendedores() {
  const sel = document.getElementById("filtroVendedor");
  if (!sel) return;
  const actual = sel.value;
  const vendedoresUnicos = [...new Set(ventas.filter(v => !v.revertida).map(v => v.vendedor))];
  sel.innerHTML = '<option value="">Todos</option>' +
    vendedoresUnicos.map(v => `<option value="${v}"${v === actual ? " selected" : ""}>${v}</option>`).join("");
}

window.renderStats = function() {
  const filtroFecha    = document.getElementById("filtroFecha")?.value || "todo";
  const filtroVendedor = document.getElementById("filtroVendedor")?.value || "";

  const ahora  = new Date();
  const hoyStr = ahora.toLocaleDateString();

  let ventasFiltradas = ventas.filter(v => !v.revertida);

  // Filtro fecha
  if (filtroFecha === "hoy") {
    ventasFiltradas = ventasFiltradas.filter(v => v.fecha.includes(hoyStr));
  } else if (filtroFecha === "semana") {
    const lunes = new Date(ahora);
    lunes.setDate(ahora.getDate() - ((ahora.getDay() + 6) % 7));
    lunes.setHours(0, 0, 0, 0);
    ventasFiltradas = ventasFiltradas.filter(v => v.timestamp >= lunes.getTime());
  } else if (filtroFecha === "mes") {
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
    ventasFiltradas = ventasFiltradas.filter(v => v.timestamp >= inicioMes);
  }

  // Filtro vendedor
  if (filtroVendedor) {
    ventasFiltradas = ventasFiltradas.filter(v => v.vendedor === filtroVendedor);
  }

  ventasFiltradas.sort((a, b) => b.timestamp - a.timestamp);

  // Resumen chips
  const totalUnidades = ventasFiltradas.reduce((s, v) => s + Number(v.cantidad || 0), 0);
  const resumen = document.getElementById("statsResumen");
  if (resumen) {
    resumen.innerHTML = `
      <span class="stats-chip">📦 ${ventasFiltradas.length} ventas</span>
      <span class="stats-chip">🔢 ${totalUnidades} unidades</span>
    `;
  }

  const cont = document.getElementById("statsContent");
  if (!cont) return;

  if (ventasFiltradas.length === 0) {
    cont.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-soft); font-size:14px;">No hay ventas para los filtros seleccionados.</div>`;
    return;
  }

  // Tabla desktop
  let html = `
    <div class="table-wrap stats-tabla">
      <table>
        <thead><tr><th>Vendedor</th><th>Producto</th><th>Categoría</th><th>Cantidad</th><th>Fecha</th></tr></thead>
        <tbody>
  `;
  ventasFiltradas.forEach(v => {
    html += `<tr><td>${v.vendedor}</td><td>${v.nombre}</td><td>${v.categoria || "-"}</td><td>${v.cantidad}</td><td>${v.fecha}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  // Cards mobile
  html += `<div class="venta-cards">`;
  ventasFiltradas.forEach(v => {
    html += `
      <div class="venta-card">
        <div class="venta-card-header">
          <div class="venta-card-producto">${v.nombre}</div>
          <div class="venta-card-cantidad">×${v.cantidad}</div>
        </div>
        <div class="venta-card-meta">
          <span class="venta-card-tag">👤 ${v.vendedor}</span>
          <span class="venta-card-tag">📂 ${v.categoria || "-"}</span>
          <span class="venta-card-tag">🕐 ${v.fecha}</span>
        </div>
      </div>`;
  });
  html += `</div>`;

  cont.innerHTML = html;
};

/* ========================== USUARIOS ========================== */
const usuariosCol = collection(db, "usuarios");

async function crearUsuario() {
  if (usuarioActual.rol !== "admin") { mostrarMensaje("No autorizado", "error"); return; }
  const email = document.getElementById("nuevoUsuarioEmail").value.trim();
  const pass  = document.getElementById("nuevoUsuarioClave").value.trim();
  const rol   = document.getElementById("nuevoUsuarioRol").value;
  if (!email || !pass) { mostrarMensaje("Email y clave requeridos", "error"); return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "usuarios", cred.user.uid), { email, rol });
    mostrarMensaje(`Usuario ${email} creado`, "success");
    document.getElementById("nuevoUsuarioEmail").value = "";
    document.getElementById("nuevoUsuarioClave").value = "";
  } catch(e) { mostrarMensaje("Error al crear usuario", "error"); }
}

async function cargarUsuarios() {
  const tbody = document.querySelector("#tablaUsuarios tbody");
  onSnapshot(usuariosCol, snapshot => {
    usuarios = []; tbody.innerHTML = "";
    snapshot.forEach(docu => {
      const data = docu.data();
      if (usuarios.find(u => u.email === data.email)) return;
      usuarios.push({ email: data.email, rol: data.rol, id: docu.id, nombre: data.nombre });
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.email}</td>
        <td><select class="rolSelect" style="width:auto;padding:5px 8px;margin:0;font-size:13px;">
          <option value="vendedor"${data.rol==="vendedor"?" selected":""}>Vendedor</option>
          <option value="admin"${data.rol==="admin"?" selected":""}>Admin</option>
        </select></td>
        <td><button class="primary danger btnEliminarUsuario" style="width:auto;margin:0;padding:6px 12px;font-size:12px;">Eliminar</button></td>`;
      tbody.appendChild(tr);
      tr.querySelector(".rolSelect").addEventListener("change", async e => {
        await setDoc(doc(db, "usuarios", docu.id), { email: data.email, rol: e.target.value });
        mostrarMensaje(`Rol de ${data.email} cambiado a ${e.target.value}`, "success");
        cargarVendedores();
      });
      tr.querySelector(".btnEliminarUsuario").addEventListener("click", async () => {
        await deleteDoc(doc(db, "usuarios", docu.id));
        mostrarMensaje(`Usuario ${data.email} eliminado`, "success");
      });
    });
    cargarVendedores();
  });
}

function cargarProductos() {
  onSnapshot(productosCol, snapshot => {
    productos = [];
    snapshot.forEach(docu => productos.push(docu.data()));
    actualizarDashboard();
  });
}

function cargarVentas() {
  const ventasCol = collection(db, "ventas");
  onSnapshot(ventasCol, snapshot => {
    ventas = [];
    snapshot.forEach(docu => ventas.push(docu.data()));
    actualizarDashboard();
  });
}

/* ========================== RESET TOTAL ========================== */
async function resetearTodo() {
  if (usuarioActual.rol !== "admin") { mostrarMensaje("No autorizado", "error"); return; }
  mostrarMensaje("Reseteando stock y ventas...", "info");
  try {
    const productosSnapshot = await getDocs(productosCol);
    const ventasCol = collection(db, "ventas");
    const ventasSnapshot = await getDocs(ventasCol);
    await Promise.all([
      ...productosSnapshot.docs.map(d => deleteDoc(doc(db, "productos", d.id))),
      ...ventasSnapshot.docs.map(d => deleteDoc(doc(db, "ventas", d.id)))
    ]);
    productos = []; ventas = [];
    actualizarDashboard();
    mostrarMensaje("Stock y ventas reseteados correctamente", "success");
  } catch(e) { mostrarMensaje("Error al resetear", "error"); }
}

/* ========================== DOCUMENTOS (integrado) ========================== */
const clientesRef = collection(db, "clientes");
let docDocumentos    = [];
let docVistaActual   = "documentos";
let docCarpetaActual = null;
let docDniAEliminar  = null;

function docIniciar() {
  onSnapshot(clientesRef, snapshot => {
    docDocumentos = [];
    snapshot.forEach(snap => docDocumentos.push(snap.data()));
    docDocumentos.sort((a, b) => `${a.apellido}${a.nombre}`.localeCompare(`${b.apellido}${b.nombre}`));
    docRender();
  });
}

function docRender() {
  const grid = document.getElementById("docGrid");
  const cont = document.getElementById("docContador");
  if (!grid) return;
  const total = docDocumentos.length;
  if (cont) cont.textContent = `${total} cliente${total !== 1 ? "s" : ""} registrado${total !== 1 ? "s" : ""}`;

  const buscador = document.getElementById("docBuscador");
  const q = buscador ? buscador.value.trim().toLowerCase() : "";
  const filtrados = q
    ? docDocumentos.filter(d =>
        d.dni.includes(q) || d.nombre.toLowerCase().includes(q) || d.apellido.toLowerCase().includes(q))
    : docDocumentos;

  if (filtrados.length === 0) {
    grid.innerHTML = `<div class="empty-state">${q ? `Sin resultados para "${buscador.value}".` : "No hay carpetas. Creá la primera con el botón de arriba."}</div>`;
    return;
  }

  grid.innerHTML = filtrados.map(d => {
    const iniciales = `${d.nombre[0]}${d.apellido[0]}`.toUpperCase();
    const accion = docVistaActual === "gestion"
      ? `window.docEliminarCarpeta('${d.dni}')`
      : `window.docAbrirDocumento('${d.dni}')`;
    return `
      <div class="doc-card" onclick="${accion}">
        <div class="doc-card-avatar">${iniciales}</div>
        <h3>${d.nombre} ${d.apellido}</h3>
        <p>DNI: ${d.dni}</p>
        ${docVistaActual === "gestion"
          ? `<button class="btn-eliminar" onclick="event.stopPropagation(); window.docEliminarCarpeta('${d.dni}')">🗑️ Eliminar</button>`
          : ""}
      </div>`;
  }).join("");
}

window.docFiltrar = function() { docRender(); };

window.docMostrarVista = function(vista) {
  docVistaActual = vista;
  document.getElementById("btnVistaDocs").classList.toggle("active",    vista === "documentos");
  document.getElementById("btnVistaGestion").classList.toggle("active", vista === "gestion");
  docRender();
};

window.docCrearNuevo = function() {
  document.getElementById("docNuevoNombre").value   = "";
  document.getElementById("docNuevoApellido").value = "";
  document.getElementById("docNuevoDni").value      = "";
  document.getElementById("modalDocCrear").classList.add("show");
};

window.docCerrarCrear = function() {
  document.getElementById("modalDocCrear").classList.remove("show");
};

window.docCrearCarpeta = async function() {
  const nombre   = document.getElementById("docNuevoNombre").value.trim();
  const apellido = document.getElementById("docNuevoApellido").value.trim();
  const dni      = document.getElementById("docNuevoDni").value.trim();
  if (!nombre || !apellido) { mostrarMensaje("Completá nombre y apellido", "error"); return; }
  if (!/^\d{1,8}$/.test(dni)) { mostrarMensaje("El DNI debe tener solo números (máx. 8)", "error"); return; }
  if (docDocumentos.some(d => d.dni === dni)) { mostrarMensaje("Ese DNI ya existe", "error"); return; }
  await setDoc(doc(db, "clientes", dni), { dni, nombre, apellido, texto: "" });
  window.docCerrarCrear();
  mostrarMensaje("Carpeta creada ✓", "success");
};

window.docAbrirDocumento = function(dni) {
  docCarpetaActual = dni;
  const docu = docDocumentos.find(d => d.dni === dni);
  document.getElementById("docModalTitulo").innerText    = `${docu.nombre} ${docu.apellido}`;
  document.getElementById("docModalSubtitulo").innerText = `DNI: ${dni}`;
  document.getElementById("docEditorTexto").value        = docu.texto || "";
  document.getElementById("modalDocumento").classList.add("show");
};

window.docCerrarModal = function() {
  document.getElementById("modalDocumento").classList.remove("show");
  docCarpetaActual = null;
};

window.docGuardar = async function() {
  const texto = document.getElementById("docEditorTexto").value;
  await setDoc(doc(db, "clientes", docCarpetaActual), { texto }, { merge: true });
  mostrarMensaje("Guardado ✓", "success");
  window.docCerrarModal();
};

window.docEliminarCarpeta = function(dni) {
  docDniAEliminar = dni;
  const docu = docDocumentos.find(d => d.dni === dni);
  document.getElementById("docTextoEliminar").innerText =
    `¿Eliminás la carpeta de ${docu.nombre} ${docu.apellido} (DNI ${dni})?`;
  document.getElementById("modalDocEliminar").classList.add("show");
};

window.docCerrarEliminar = function() {
  document.getElementById("modalDocEliminar").classList.remove("show");
};

window.docConfirmarEliminar = async function() {
  await deleteDoc(doc(db, "clientes", docDniAEliminar));
  window.docCerrarEliminar();
  mostrarMensaje("Carpeta eliminada.", "success");
};

/* ========================== EXPORTS ========================== */
window.login               = login;
window.logout              = logout;
window.showSection         = showSection;
window.agregarProducto     = agregarProducto;
window.registrarVenta      = registrarVenta;
window.agregarCategoria    = agregarCategoria;
window.eliminarCategoria   = eliminarCategoria;
window.crearUsuario        = crearUsuario;
window.resetearTodo        = resetearTodo;
window.filtrarProductos    = filtrarProductos;
window.revertirUltimaVenta = revertirUltimaVenta;
window.registrarse         = registrarse;
window.abrirEditarCantidad = abrirEditarCantidad;
window.cerrarModal         = cerrarModal;
window.guardarCantidad     = guardarCantidad;
window.guardarProducto     = guardarProducto;
window.capitalizarProductos= capitalizarProductos;
window.mostrarMensaje      = mostrarMensaje;
