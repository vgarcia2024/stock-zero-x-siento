// /api/seguimiento.js
import fetch from "node-fetch"; // Necesario en Vercel si vas a usar fetch en Node

export default async function handler(req, res) {
  // Solo aceptamos GET
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const trackingNumber = req.query.tracking;

  if (!trackingNumber) {
    res.status(400).json({ error: "Falta el número de seguimiento" });
    return;
  }

  try {
    // Tu API Key de Track123 (la que pusiste en Vercel como ENV VAR)
    const API_KEY = process.env.TRACK123_API_KEY;

    // Llamada a Track123
    const response = await fetch(
      `https://api.track123.com/v1/trackings/${trackingNumber}`,
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({ error: text || "Error al consultar API" });
      return;
    }

    const data = await response.json();

    // Devuelve el JSON al front
    res.status(200).json(data);

  } catch (error) {
    console.error("Error API seguimiento:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
