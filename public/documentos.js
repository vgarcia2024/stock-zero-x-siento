let documentos = JSON.parse(localStorage.getItem("documentos")) || [];
let vistaActual = "documentos";
let carpetaActual = null;

/* ===========================
   CAMBIAR VISTA
=========================== */
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

  documentos.forEach(doc => {
    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
      <h3>DNI: ${doc.dni}</h3>
    `;

    if (vistaActual === "gestion") {
      const btnEliminar = document.createElement("button");
      btnEliminar.classList.add("btn-eliminar");
      btnEliminar.innerText = "Eliminar";
      btnEliminar.onclick = () => eliminarCarpeta(doc.dni);
      card.appendChild(btnEliminar);
    } else {
      card.onclick = () => abrirDocumento(doc.dni);
    }

    grid.appendChild(card);
  });
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

function guardarDocumento() {
  const texto = document.getElementById("editorTexto").value;
  const doc = documentos.find(d => d.dni === carpetaActual);
  doc.texto = texto;
  localStorage.setItem("documentos", JSON.stringify(documentos));
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

function crearCarpeta() {
  const dniInput = document.getElementById("nuevoDni");
  const dni = dniInput.value.trim();

  // Validar solo números
  if (!/^\d{1,8}$/.test(dni)) {
    alert("El DNI debe contener solo números y hasta 8 caracteres.");
    return;
  }

  if (documentos.some(d => d.dni === dni)) {
    alert("Ese DNI ya existe.");
    return;
  }

  documentos.push({ dni: dni, texto: "" });
  localStorage.setItem("documentos", JSON.stringify(documentos));

  dniInput.value = "";
  cerrarModalCrear();
  render();
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

function confirmarEliminar() {
  documentos = documentos.filter(d => d.dni !== dniAEliminar);
  localStorage.setItem("documentos", JSON.stringify(documentos));

  cerrarModalEliminar();
  render();
}

/* ===========================
   BUSCAR DNI
=========================== */
document.getElementById("dniInput").addEventListener("input", function() {
  const valor = this.value.trim();
  const grid = document.getElementById("gridDocumentos");
  grid.innerHTML = "";

  documentos
    .filter(d => d.dni.includes(valor))
    .forEach(doc => {
      const card = document.createElement("div");
      card.classList.add("card");
      card.innerHTML = `<h3>DNI: ${doc.dni}</h3>`;
      card.onclick = () => abrirDocumento(doc.dni);
      grid.appendChild(card);
    });
});

render();
