// api/seguimiento.js
export default async function handler(req, res) {
  // Solo GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const tracking = req.query.tracking;
  if (!tracking) {
    return res.status(400).json({ error: 'Falta el número de seguimiento' });
  }

  // Tu API Key de Track123 como variable de entorno en Vercel
  const API_KEY = process.env.TRACK123_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'No hay API key configurada' });
  }

  try {
    const response = await fetch(`https://api.track123.com/trackings/${tracking}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al conectar con Track123' });
  }
}
