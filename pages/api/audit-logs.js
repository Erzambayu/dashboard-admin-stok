import { supabase } from '../../lib/dataManager.js';
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

    if (req.method === 'GET') {
      await handleGet(req, res);
    } else {
      res.setHeader('Allow', ['GET', 'OPTIONS']);
      res.status(405).json({ error: `Method ${req.method} tidak diizinkan` });
    }
  } catch (error) {
    console.error('[API/AUDIT-LOGS] Global Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan internal pada server.', details: error.message });
  }
}

async function handleGet(req, res) {
  const { limit: queryLimit = '50', page: queryPage = '1' } = req.query;
  
  const page = parseInt(queryPage, 10) || 1;
  const limit = parseInt(queryLimit, 10) || 50;
  const startIndex = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false })
    .range(startIndex, startIndex + limit - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ 
    audit_logs: data || [],
    total: count || 0,
    page: page,
    limit: limit,
    total_pages: Math.ceil((count || 0) / limit),
  });
}