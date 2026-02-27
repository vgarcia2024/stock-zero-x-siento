let documentos = JSON.parse(localStorage.getItem("documentos")) || [];
let vistaActual = "documentos";
let carpetaActual = null;

/* ===========================
   CAMBIAR VISTA
=========================== */
function mostrarVista(vista) {
  vistaActual = vista;
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
function eliminarCarpeta(dni) {
  if (!confirm("¿Seguro que querés eliminar esta carpeta?")) return;

  documentos = documentos.filter(d => d.dni !== dni);
  localStorage.setItem("documentos", JSON.stringify(documentos));
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
