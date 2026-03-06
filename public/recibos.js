import { db } from "./firebase.js";

import {
  collection,
  doc,
  setDoc,
  getDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ========================== REFERENCIAS ========================== */

const recibosCol = collection(db, "recibos");
const configRef = doc(db, "config", "recibos");

/* ========================== CREAR RECIBO ========================== */

async function crearRecibo() {

  const nombre = document.getElementById("reciboNombre").value.trim();
  const apellido = document.getElementById("reciboApellido").value.trim();
  const monto = Number(document.getElementById("reciboMonto").value);
  const comentario = document.getElementById("reciboComentario").value.trim();

  if (!nombre || !apellido || !monto || monto <= 0) {
    mostrarMensaje("Completá los datos correctamente", "error");
    return;
  }

  try {

    // 🔥 TRANSACTION PARA NUMERO AUTOINCREMENTAL SEGURO
    const nuevoNumero = await runTransaction(db, async (transaction) => {

      const configSnap = await transaction.get(configRef);

      let ultimoNumero = 0;

      if (configSnap.exists()) {
        ultimoNumero = configSnap.data().ultimoNumero || 0;
      }

      const siguienteNumero = ultimoNumero + 1;

      transaction.set(configRef, {
        ultimoNumero: siguienteNumero
      });

      return siguienteNumero;
    });

    const fechaActual = new Date();

    // 🔥 GUARDAMOS EL RECIBO
    await setDoc(doc(recibosCol), {
      numero: nuevoNumero,
      nombre,
      apellido,
      monto,
      comentario: comentario || "",
      fecha: fechaActual.toLocaleDateString(),
      timestamp: Date.now()
    });

    // 🔥 GENERAR PDF AUTOMÁTICO
    generarPDF(nuevoNumero, nombre, apellido, monto, comentario);

    limpiarFormularioRecibo();

    mostrarMensaje(`Recibo N° ${nuevoNumero} generado correctamente`, "success");

  } catch (error) {
    console.error(error);
    mostrarMensaje("Error al generar recibo", "error");
  }
}

/* ========================== PDF ========================== */

function generarPDF(numero, nombre, apellido, monto, comentario) {

  const { jsPDF } = window.jspdf;

  // 🔥 FORMATO TICKET TERMICO 80mm
  const docPDF = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 180]
  });

  const fecha = new Date().toLocaleDateString();

  /* ======= ENCABEZADO ======= */

  docPDF.setFont("helvetica", "bold");
  docPDF.setFontSize(16);
  docPDF.text("ZERO X SIENTO", 40, 12, { align: "center" });

  docPDF.setFontSize(14);
  docPDF.text("RECIBO", 40, 20, { align: "center" });

  /* ======= NUMERO Y FECHA (MAS GRANDES) ======= */

  docPDF.setFontSize(13);
  docPDF.setFont("helvetica", "bold");
  docPDF.text(`N° ${numero.toString().padStart(6, "0")}`, 40, 30, { align: "center" });

  docPDF.setFontSize(12);
  docPDF.setFont("helvetica", "normal");
  docPDF.text(`Fecha: ${fecha}`, 40, 38, { align: "center" });

  /* ======= LINEA ======= */

  docPDF.line(5, 45, 75, 45);

  /* ======= CLIENTE ======= */

  docPDF.setFontSize(11);
  docPDF.text("Recibí de:", 5, 55);

  docPDF.setFont("helvetica", "bold");
  docPDF.setFontSize(13);
  docPDF.text(`${nombre} ${apellido}`, 5, 63);

  /* ======= MONTO ======= */

  docPDF.setFont("helvetica", "normal");
  docPDF.setFontSize(11);
  docPDF.text("La suma de:", 5, 75);

  docPDF.setFont("helvetica", "bold");
  docPDF.setFontSize(18);
  docPDF.text(`$ ${monto.toLocaleString()}`, 5, 88);

  /* ======= CONCEPTO ======= */

  docPDF.setFont("helvetica", "normal");
  docPDF.setFontSize(11);
  docPDF.text("Concepto:", 5, 102);

  docPDF.rect(5, 106, 70, 20);
  docPDF.text(comentario || "-", 7, 116);

  /* ======= FIRMA ======= */

  docPDF.line(40, 145, 75, 145);
  docPDF.text("Firma", 55, 150);

  /* ======= PIE ======= */

  docPDF.setFontSize(10);
  docPDF.text("Gracias por su confianza", 40, 165, { align: "center" });

  docPDF.save(`Recibo_${numero.toString().padStart(6, "0")}.pdf`);
}

/* ========================== LIMPIAR FORMULARIO ========================== */

function limpiarFormularioRecibo() {
  document.getElementById("reciboNombre").value = "";
  document.getElementById("reciboApellido").value = "";
  document.getElementById("reciboMonto").value = "";
  document.getElementById("reciboComentario").value = "";
}

/* ========================== EXPORT ========================== */

window.crearRecibo = crearRecibo;
