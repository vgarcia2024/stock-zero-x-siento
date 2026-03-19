// ═══════════════════════════════════════════════════════
//  DOCUMENTOS — Zero X Siento
//  Firestore + Firebase Storage
// ═══════════════════════════════════════════════════════

import { db } from "./firebase.js";
import {
  collection, doc, setDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ─── ESTADO ──────────────────────────────────────────────
let documentos    = [];
let vistaActual   = "documentos";
let carpetaActual = null;
let dniAEliminar  = null;

const clientesRef = collection(db, "clientes");

// ─── HELPERS ─────────────────────────────────────────────
function toast(msg, tipo = 'default') {
  const t = document.createElement('div');
  t.className   = `toast ${tipo}`;
  t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ─── MODALES ERROR ────────────────────────────────────────
function mostrarModalError(msg) {
  document.getElementById("textoError").innerText = msg;
  document.getElementById("modalError").classList.remove("hidden");
}
window.cerrarModalError = () => document.getElementById("modalError").classList.add("hidden");

// ─── CONTADOR ────────────────────────────────────────────
window.actualizarContador = function () {
  const total    = documentos.length;
  const texto    = total === 1 ? "1 cliente registrado" : `${total} clientes registrados`;
  const cont     = document.getElementById("contadorClientes");
  const sidebar  = document.getElementById("sidebar-contador");
  if (cont)    cont.textContent   = texto;
  if (sidebar) sidebar.textContent = `${total} cliente${total !== 1 ? 's' : ''}`;
};

// ─── VISTAS ───────────────────────────────────────────────
window.mostrarVista = function (vista) {
  vistaActual = vista;
  document.getElementById("btnDocumentos").classList.toggle("active", vista === "documentos");
  document.getElementById("btnGestion").classList.toggle("active", vista === "gestion");
  render();
};

// ─── RENDER GRID ─────────────────────────────────────────
function render() {
  const grid = document.getElementById("gridDocumentos");
  grid.innerHTML = "";

  if (documentos.length === 0) {
    grid.innerHTML = `<div class="empty-state">Sin clientes todavía.<br>Creá la primera carpeta con el botón de arriba.</div>`;
    return;
  }

  documentos.forEach(docu => {
    const card     = document.createElement("div");
    card.className = "card";
    const iniciales = `${docu.nombre[0]}${docu.apellido[0]}`.toUpperCase();
    const tieneArchivos = docu.cantArchivos > 0;

    card.innerHTML = `
      <div class="card-avatar">${iniciales}</div>
      ${tieneArchivos
        ? `<span class="card-badge has-files">📎 ${docu.cantArchivos}</span>`
        : `<span class="card-badge">sin archivos</span>`
      }
      <h3>${docu.nombre} ${docu.apellido}</h3>
      <p>DNI: ${docu.dni}</p>
    `;

    if (vistaActual === "gestion") {
      const btn     = document.createElement("button");
      btn.className = "btn-eliminar";
      btn.innerText = "🗑️ Eliminar";
      btn.onclick   = () => eliminarCarpeta(docu.dni);
      card.appendChild(btn);
    } else {
      card.onclick = () => abrirDocumento(docu.dni);
    }

    grid.appendChild(card);
  });

  actualizarContador();
}

// ─── ABRIR DOCUMENTO ─────────────────────────────────────
function abrirDocumento(dni) {
  carpetaActual = dni;
  const docu = documentos.find(d => d.dni === dni);
  document.getElementById("tituloModal").innerText    = `${docu.nombre} ${docu.apellido}`;
  document.getElementById("subtituloModal").innerText = `DNI: ${dni}`;
  document.getElementById("editorTexto").value        = docu.texto || "";
  document.getElementById("modal").classList.remove("hidden");
}

window.cerrarModal = function () {
  document.getElementById("modal").classList.add("hidden");
  carpetaActual = null;
};

// ─── GUARDAR TEXTO ────────────────────────────────────────
window.guardarDocumento = async function () {
  const texto = document.getElementById("editorTexto").value;
  await setDoc(doc(db, "clientes", carpetaActual), { texto }, { merge: true });
  toast("Notas guardadas ✓", "success");
  cerrarModal();
};

// ─── CREAR CARPETA ────────────────────────────────────────
window.crearNuevo = function () {
  document.getElementById("modalCrear").classList.remove("hidden");
  document.getElementById("nuevoNombre").value   = "";
  document.getElementById("nuevoApellido").value = "";
  document.getElementById("nuevoDni").value      = "";
};

window.cerrarModalCrear = () => document.getElementById("modalCrear").classList.add("hidden");

window.crearCarpeta = async function () {
  const nombre   = document.getElementById("nuevoNombre").value.trim();
  const apellido = document.getElementById("nuevoApellido").value.trim();
  const dni      = document.getElementById("nuevoDni").value.trim();

  if (!nombre || !apellido) {
    mostrarModalError("Completá nombre y apellido.");
    return;
  }
  if (!/^\d{1,8}$/.test(dni)) {
    mostrarModalError("El DNI debe tener solo números (máx. 8).");
    return;
  }
  if (documentos.some(d => d.dni === dni)) {
    mostrarModalError("Ese DNI ya existe.");
    return;
  }

  await setDoc(doc(db, "clientes", dni), {
    dni, nombre, apellido, texto: "", cantArchivos: 0
  });

  cerrarModalCrear();
  toast("Carpeta creada ✓", "success");
};

// ─── ELIMINAR CARPETA ────────────────────────────────────
window.eliminarCarpeta = function (dni) {
  dniAEliminar = dni;
  const docu = documentos.find(d => d.dni === dni);
  document.getElementById("textoEliminar").innerText =
    `¿Seguro que querés eliminar la carpeta de ${docu.nombre} ${docu.apellido} (DNI ${dni})?`;
  document.getElementById("modalEliminar").classList.remove("hidden");
};

window.cerrarModalEliminar = () => document.getElementById("modalEliminar").classList.add("hidden");

window.confirmarEliminar = async function () {
  try {
    // Eliminar archivos de Storage
    const carpetaRef = ref(storage, `clientes/${dniAEliminar}`);
    try {
      const lista = await listAll(carpetaRef);
      await Promise.all(lista.items.map(item => deleteObject(item)));
    } catch { /* no hay archivos, ok */ }

    await deleteDoc(doc(db, "clientes", dniAEliminar));
    cerrarModalEliminar();
    toast("Carpeta eliminada.", "default");
  } catch (e) {
    console.error(e);
    toast("Error al eliminar.", "error");
  }
};

// ─── BÚSQUEDA ────────────────────────────────────────────
document.getElementById("dniInput").addEventListener("input", function () {
  const val  = this.value.trim().toLowerCase();
  const grid = document.getElementById("gridDocumentos");
  grid.innerHTML = "";

  const filtrados = val
    ? documentos.filter(d =>
        d.dni.includes(val) ||
        d.nombre.toLowerCase().includes(val) ||
        d.apellido.toLowerCase().includes(val)
      )
    : documentos;

  if (filtrados.length === 0) {
    grid.innerHTML = `<div class="empty-state">No se encontraron resultados para "${this.value}".</div>`;
    return;
  }

  filtrados.forEach(docu => {
    const card     = document.createElement("div");
    card.className = "card";
    const iniciales = `${docu.nombre[0]}${docu.apellido[0]}`.toUpperCase();
    card.innerHTML = `
      <div class="card-avatar">${iniciales}</div>
      <h3>${docu.nombre} ${docu.apellido}</h3>
      <p>DNI: ${docu.dni}</p>
    `;
    card.onclick = () => abrirDocumento(docu.dni);
    grid.appendChild(card);
  });
});

// ─── SNAPSHOT FIRESTORE ───────────────────────────────────
onSnapshot(clientesRef, snapshot => {
  documentos = [];
  snapshot.forEach(docSnap => documentos.push(docSnap.data()));
  documentos.sort((a, b) =>
    `${a.apellido}${a.nombre}`.localeCompare(`${b.apellido}${b.nombre}`)
  );
  render();
});
