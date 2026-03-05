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
  const docPDF = new jsPDF();

  const fecha = new Date().toLocaleDateString();

  /* ======= ENCABEZADO ======= */

  docPDF.setFontSize(22);
  docPDF.setFont("helvetica", "bold");
  docPDF.text("ZERO X SIENTO", 20, 20);

  docPDF.setFontSize(16);
  docPDF.text("RECIBO", 160, 20);

  docPDF.setFontSize(12);
  docPDF.setFont("helvetica", "normal");
  docPDF.text(`N° ${numero.toString().padStart(6, "0")}`, 160, 30);
  docPDF.text(`Fecha: ${fecha}`, 160, 38);

  /* ======= LINEA SEPARADORA ======= */
  docPDF.line(20, 45, 190, 45);

  /* ======= CUERPO ======= */

  docPDF.setFontSize(13);
  docPDF.text("Recibí de:", 20, 60);

  docPDF.setFont("helvetica", "bold");
  docPDF.text(`${nombre} ${apellido}`, 20, 70);

  docPDF.setFont("helvetica", "normal");
  docPDF.text("La suma de:", 20, 85);

  docPDF.setFontSize(18);
  docPDF.setFont("helvetica", "bold");
  docPDF.text(`$ ${monto.toLocaleString()}`, 20, 100);

  docPDF.setFontSize(12);
  docPDF.setFont("helvetica", "normal");

  /* ======= COMENTARIO EN CAJA ======= */

  docPDF.rect(20, 115, 170, 30);
  docPDF.text("Concepto:", 25, 125);
  docPDF.text(comentario || "-", 25, 135);

  /* ======= FIRMA ======= */

  docPDF.line(120, 170, 180, 170);
  docPDF.text("Firma", 145, 178);

  /* ======= PIE ======= */

  docPDF.setFontSize(10);
  docPDF.text("Gracias por su confianza.", 20, 190);

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
