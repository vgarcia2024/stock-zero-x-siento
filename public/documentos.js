import { db } from "./firebase.js";

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let documentos = [];
let vistaActual = "documentos";
let carpetaActual = null;

const clientesRef = collection(db, "clientes");

/* ===========================
   CAMBIAR VISTA
=========================== */
function actualizarContador() {
  const total = documentos.length;
  const contador = document.getElementById("contadorClientes");

  if (!contador) return;

  if (total === 1) {
    contador.textContent = "1 cliente registrado";
  } else {
    contador.textContent = `${total} clientes registrados`;
  }
}

function mostrarVista(vista) {
  vistaActual = vista;

  const btnDoc = document.getElementById("btnDocumentos");
  const btnGes = document.getElementById("btnGestion");

  btnDoc.classList.remove("active");
  btnGes.classList.remove("active");

  if (vista === "documentos") {
    btnDoc.classList.add("active");
  }

  if (vista === "gestion") {
    btnGes.classList.add("active");
  }

  render();
}

/* ===========================
   RENDER GENERAL
=========================== */
function render() {
  const grid = document.getElementById("gridDocumentos");
  grid.innerHTML = "";

  documentos.forEach(docu => {
    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
      <h3>${docu.nombre} ${docu.apellido}</h3>
      <p>DNI: ${docu.dni}</p>
    `;

    if (vistaActual === "gestion") {
      const btnEliminar = document.createElement("button");
      btnEliminar.classList.add("btn-eliminar");
      btnEliminar.innerText = "Eliminar";
      btnEliminar.onclick = () => eliminarCarpeta(docu.dni);
      card.appendChild(btnEliminar);
    } else {
      card.onclick = () => abrirDocumento(docu.dni);
    }

    grid.appendChild(card);
  });

  actualizarContador();
}

/* ===========================
   ABRIR MODAL DOCUMENTO
=========================== */
function abrirDocumento(dni) {
  carpetaActual = dni;
  const doc = documentos.find(d => d.dni === dni);
  document.getElementById("tituloModal").innerText = "DNI: " + dni;
  document.getElementById("editorTexto").value = doc.texto || "";
  document.getElementById("modal").classList.remove("hidden");
}

function cerrarModal() {
  document.getElementById("modal").classList.add("hidden");
}

async function guardarDocumento() {
  const texto = document.getElementById("editorTexto").value;

  await updateDoc(doc(db, "clientes", carpetaActual), {
    texto: texto
  });

  cerrarModal();
}

/* ===========================
   CREAR CARPETA
=========================== */
function crearNuevo() {
  document.getElementById("modalCrear").classList.remove("hidden");
}

function cerrarModalCrear() {
  document.getElementById("modalCrear").classList.add("hidden");
}

async function crearCarpeta() {
  const nombre = document.getElementById("nuevoNombre").value.trim();
  const apellido = document.getElementById("nuevoApellido").value.trim();
  const dni = document.getElementById("nuevoDni").value.trim();

  if (nombre === "" || apellido === "") {
    alert("Debe completar nombre y apellido.");
    return;
  }

  if (!/^\d{1,8}$/.test(dni)) {
    alert("El DNI debe contener solo números y hasta 8 caracteres.");
    return;
  }

  await setDoc(doc(db, "clientes", dni), {
    dni,
    nombre,
    apellido,
    texto: ""
  });

  cerrarModalCrear();
}

/* ===========================
   ELIMINAR CARPETA
=========================== */
let dniAEliminar = null;

function eliminarCarpeta(dni) {
  dniAEliminar = dni;
  document.getElementById("textoEliminar").innerText =
    "¿Seguro que querés eliminar la carpeta del DNI " + dni + "?";

  document.getElementById("modalEliminar").classList.remove("hidden");
}

function cerrarModalEliminar() {
  document.getElementById("modalEliminar").classList.add("hidden");
}

async function confirmarEliminar() {
  await deleteDoc(doc(db, "clientes", dniAEliminar));

  cerrarModalEliminar();
}

/* ===========================
   BUSCAR DNI
=========================== */
document.getElementById("dniInput").addEventListener("input", function() {
  const valor = this.value.trim();
  const grid = document.getElementById("gridDocumentos");
  grid.innerHTML = "";

  documentos
    .filter(d =>
     d.dni.includes(valor) ||
     d.nombre.toLowerCase().includes(valor.toLowerCase()) ||
     d.apellido.toLowerCase().includes(valor.toLowerCase())
   ).forEach(doc => {
      const card = document.createElement("div");
      card.classList.add("card");
      card.innerHTML = `
        <h3>${doc.nombre} ${doc.apellido}</h3>
        <p>DNI: ${doc.dni}</p>
      `;
      card.onclick = () => abrirDocumento(doc.dni);
      grid.appendChild(card);
    });
});

onSnapshot(clientesRef, (snapshot) => {
  documentos = [];

  snapshot.forEach((docSnap) => {
    documentos.push(docSnap.data());
  });

  render();
});

