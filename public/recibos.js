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

  docPDF.setFontSize(20);
  docPDF.text("RECIBO", 85, 20);

  docPDF.setFontSize(12);

  docPDF.text(`Número: ${numero}`, 20, 40);
  docPDF.text(`Fecha: ${fecha}`, 20, 50);

  docPDF.text(`Cliente: ${nombre} ${apellido}`, 20, 65);

  docPDF.setFontSize(14);
  docPDF.text(`Monto: $${monto}`, 20, 80);

  docPDF.setFontSize(12);
  docPDF.text("Comentario:", 20, 100);
  docPDF.text(comentario || "-", 20, 110);

  docPDF.save(`Recibo_${numero}.pdf`);
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
