let dniActual = null;

function obtenerDatos() {
    return JSON.parse(localStorage.getItem("documentos")) || [];
}

function guardarDatos(datos) {
    localStorage.setItem("documentos", JSON.stringify(datos));
}

function renderizar(filtro = "") {
  const grid = document.getElementById("gridDocumentos");
  const datos = obtenerDatos();
  grid.innerHTML = "";

  const filtrados = datos.filter(cliente =>
    cliente.dni.includes(filtro)
  );

  filtrados.forEach(cliente => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>DNI ${cliente.dni}</h3>
      <p>Carpeta editable</p>
    `;
    card.onclick = () => abrirDocumento(cliente.dni);
    grid.appendChild(card);
  });
}

function abrirDocumento(dni) {
    dniActual = dni;
    const datos = obtenerDatos();
    const cliente = datos.find(c => c.dni === dni);

    document.getElementById("tituloModal").innerText = "Cliente DNI: " + dni;
    document.getElementById("editorTexto").value = cliente?.contenido || "";
    document.getElementById("modal").classList.remove("hidden");
}

function cerrarModal() {
    document.getElementById("modal").classList.add("hidden");
}

function guardarDocumento() {
    const texto = document.getElementById("editorTexto").value;
    let datos = obtenerDatos();

    const index = datos.findIndex(c => c.dni === dniActual);

    if (index >= 0) {
        datos[index].contenido = texto;
    } else {
        datos.push({ dni: dniActual, contenido: texto });
    }

    guardarDatos(datos);
    cerrarModal();
    renderizar();
}

function crearNuevo() {
    const dni = prompt("Ingrese DNI del cliente:");
    if (!dni) return;
    abrirDocumento(dni);
}

document.getElementById("dniInput").addEventListener("input", function () {
  const filtro = this.value.trim();
  renderizar(filtro);
});

renderizar();
