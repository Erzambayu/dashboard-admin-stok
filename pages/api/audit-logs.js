import { readData } from '../../lib/dataManager.js';
import { verifyToken } from './auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Otentikasi gagal: token tidak valid atau tidak ada.' });
    }

    switch (req.method) {
      case 'GET':
        await handleGet(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'OPTIONS']);
        res.status(405).json({ error: `Method ${req.method} tidak diizinkan` });
    }
  } catch (error) {
    console.error('[API/AUDIT-LOGS] Global Error:', error);
    if (error.message.includes('Token')) {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'Terjadi kesalahan internal pada server.', details: error.message });
  }
}

async function handleGet(req, res) {
  const { limit: queryLimit = '50', page: queryPage = '1' } = req.query;
  
  const page = parseInt(queryPage, 10);
  const limit = parseInt(queryLimit, 10);

  if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
    return res.status(400).json({ error: 'Parameter `page` dan `limit` harus angka positif.' });
  }

  const data = await readData();
  const logs = data.audit_logs || [];

  // Urutkan log berdasarkan timestamp (terbaru dulu)
  const sortedLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Terapkan paginasi
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedLogs = sortedLogs.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedLogs.length / limit);

  res.status(200).json({ 
    audit_logs: paginatedLogs,
    total: sortedLogs.length,
    page,
    limit,
    total_pages: totalPages,
  });
}