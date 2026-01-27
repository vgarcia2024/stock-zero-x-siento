// api/seguimiento.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { trackingNumber } = req.body;
  if (!trackingNumber) return res.status(400).json({ error: "Tracking number required" });

  try {
    // Usamos la API key desde la variable de entorno
    const API_KEY = process.env.TRACK123_API_KEY;

    const response = await fetch(`https://api.track123.com/v1/track?number=${trackingNumber}`, {
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    res.status(200).json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching tracking info" });
  }
}

