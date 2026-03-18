// ═══════════════════════════════════════════════════════
//  DOCUMENTOS — Zero X Siento
//  Firestore + Firebase Storage
// ═══════════════════════════════════════════════════════

import { db, storage } from "./firebase.js";
import {
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ─── ESTADO ──────────────────────────────────────────────
let documentos    = [];
let vistaActual   = "documentos";
let carpetaActual = null;
let tabActual     = "texto";
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

function iconoArchivo(nombre) {
  const ext = nombre.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext))                    return '📄';
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return '🖼️';
  if (['doc','docx'].includes(ext))             return '📝';
  if (['xls','xlsx'].includes(ext))             return '📊';
  if (['zip','rar','7z'].includes(ext))         return '🗜️';
  return '📎';
}

function formatBytes(bytes) {
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
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
  switchTab("texto");
  cargarArchivos(dni);
}

window.cerrarModal = function () {
  document.getElementById("modal").classList.add("hidden");
  carpetaActual = null;
};

// ─── TABS ─────────────────────────────────────────────────
window.switchTab = function (tab) {
  tabActual = tab;
  document.getElementById("tab-texto").classList.toggle("active",    tab === "texto");
  document.getElementById("tab-archivos").classList.toggle("active", tab === "archivos");
  document.getElementById("panel-texto").classList.toggle("hidden",    tab !== "texto");
  document.getElementById("panel-archivos").classList.toggle("hidden", tab !== "archivos");
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

// ─── ARCHIVOS ────────────────────────────────────────────
async function cargarArchivos(dni) {
  const lista = document.getElementById("archivos-lista");
  lista.innerHTML = `<div style="font-size:12px; color:var(--gray-500); text-align:center; padding:1rem 0;">Cargando archivos...</div>`;

  try {
    const carpetaRef = ref(storage, `clientes/${dni}`);
    const res        = await listAll(carpetaRef);

    if (res.items.length === 0) {
      lista.innerHTML = `<div style="font-size:12px; color:var(--gray-500); text-align:center; padding:1rem 0;">No hay archivos adjuntos todavía.</div>`;
      return;
    }

    const archivos = await Promise.all(res.items.map(async item => ({
      nombre: item.name,
      fullPath: item.fullPath,
      url: await getDownloadURL(item)
    })));

    lista.innerHTML = archivos.map(a => `
      <div class="archivo-item">
        <div class="archivo-icon">${iconoArchivo(a.nombre)}</div>
        <div class="archivo-info">
          <div class="archivo-nombre">${a.nombre}</div>
          <div class="archivo-meta">Adjunto</div>
        </div>
        <div class="archivo-actions">
          <button class="archivo-btn ver" onclick="window.open('${a.url}', '_blank')">Ver</button>
          <button class="archivo-btn del" onclick="eliminarArchivo('${a.fullPath}', '${dni}')">✕</button>
        </div>
      </div>
    `).join('');

  } catch {
    lista.innerHTML = `<div style="font-size:12px; color:var(--gray-500); text-align:center; padding:1rem 0;">No hay archivos adjuntos todavía.</div>`;
  }
}

// Drag & Drop
window.dragOver = function (e) {
  e.preventDefault();
  document.getElementById("dropZone").classList.add("dragover");
};
window.dragLeave = function () {
  document.getElementById("dropZone").classList.remove("dragover");
};
window.dropArchivo = function (e) {
  e.preventDefault();
  document.getElementById("dropZone").classList.remove("dragover");
  subirArchivos(e.dataTransfer.files);
};

window.subirArchivos = async function (files) {
  if (!carpetaActual || !files.length) return;

  const progCont = document.getElementById("upload-progress-container");

  for (const file of Array.from(files)) {
    // Barra de progreso
    const progId  = `prog-${Date.now()}`;
    const progEl  = document.createElement("div");
    progEl.className = "upload-progress";
    progEl.id        = progId;
    progEl.innerHTML = `
      <div style="font-size:12px; color:var(--gray-300); min-width:0; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        ${iconoArchivo(file.name)} ${file.name}
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar" id="bar-${progId}" style="width:0%"></div>
      </div>
      <div class="progress-text" id="pct-${progId}">0%</div>
    `;
    progCont.appendChild(progEl);

    // Subir
    const archivoRef  = ref(storage, `clientes/${carpetaActual}/${file.name}`);
    const uploadTask  = uploadBytesResumable(archivoRef, file);

    await new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        snap => {
          const pct = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
          document.getElementById(`bar-${progId}`).style.width = pct + '%';
          document.getElementById(`pct-${progId}`).textContent = pct + '%';
        },
        err => { console.error(err); reject(err); },
        async () => {
          progEl.remove();
          resolve();
        }
      );
    });
  }

  // Actualizar contador en Firestore
  const docu    = documentos.find(d => d.dni === carpetaActual);
  const carpRef = ref(storage, `clientes/${carpetaActual}`);
  const lista   = await listAll(carpRef);
  await updateDoc(doc(db, "clientes", carpetaActual), { cantArchivos: lista.items.length });

  toast(`${files.length} archivo${files.length > 1 ? 's' : ''} subido${files.length > 1 ? 's' : ''} ✓`, "success");
  await cargarArchivos(carpetaActual);
};

window.eliminarArchivo = async function (fullPath, dni) {
  if (!confirm("¿Eliminás este archivo?")) return;
  try {
    await deleteObject(ref(storage, fullPath));

    // Actualizar contador
    const carpRef = ref(storage, `clientes/${dni}`);
    const lista   = await listAll(carpRef);
    await updateDoc(doc(db, "clientes", dni), { cantArchivos: lista.items.length });

    toast("Archivo eliminado.", "default");
    await cargarArchivos(dni);
  } catch {
    toast("Error al eliminar el archivo.", "error");
  }
};

// ─── SNAPSHOT FIRESTORE ───────────────────────────────────
onSnapshot(clientesRef, snapshot => {
  documentos = [];
  snapshot.forEach(docSnap => documentos.push(docSnap.data()));
  documentos.sort((a, b) =>
    `${a.apellido}${a.nombre}`.localeCompare(`${b.apellido}${b.nombre}`)
  );
  render();
});
