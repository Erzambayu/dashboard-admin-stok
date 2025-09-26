import { readData } from '../../lib/dataManager.js';
import { verifyToken } from './auth.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const user = verifyToken(req);
    
    if (req.method === 'GET') {
      const { limit = 50, page = 1 } = req.query;
      const data = await readData();
      
      // Sort by timestamp descending (newest first)
      const sortedLogs = data.audit_logs.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      // Pagination
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedLogs = sortedLogs.slice(startIndex, endIndex);
      
      res.status(200).json({ 
        audit_logs: paginatedLogs,
        total: sortedLogs.length,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(sortedLogs.length / parseInt(limit))
      });
    } else {
      res.status(405).json({ error: 'Method tidak diizinkan' });
    }
  } catch (error) {
    console.error('Audit logs API error:', error);
    if (error.message === 'Token tidak ditemukan' || error.message === 'Token tidak valid') {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
}