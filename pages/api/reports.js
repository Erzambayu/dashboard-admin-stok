import { readData } from '../../lib/dataManager.js';
import { verifyToken } from './auth.js';

// --- MAIN HANDLER ---

export default function handler(req, res) {
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
        return handleGet(req, res);
      default:
        res.setHeader('Allow', ['GET', 'OPTIONS']);
        return res.status(405).json({ error: `Method ${req.method} tidak diizinkan` });
    }
  } catch (error) {
    console.error('[API/REPORTS] Global Error:', error);
    if (error.message.includes('Token')) {
      return res.status(401).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Terjadi kesalahan internal pada server.', details: error.message });
  }
}

// --- REPORTING LOGIC ---

function handleGet(req, res) {
  const data = readData();
  const today = new Date();

  const report = {
    summary: calculateSummary(data),
    alerts: generateAlerts(data.items, today),
    charts: {
      last_7_days: getDailyPerformance(data.transactions, today),
      top_selling_items: getTopSellingItems(data.transactions),
    },
  };
  
  res.status(200).json(report);
}

// --- CALCULATION FUNCTIONS ---

function calculateSummary(data) {
  const totalModalTersisa = data.items.reduce((sum, item) => sum + (item.harga_modal * item.stok), 0);
  const totalPendapatan = data.transactions.reduce((sum, t) => sum + t.total_jual, 0);
  const totalProfit = data.transactions.reduce((sum, t) => sum + t.profit, 0);
  const totalModalTerjual = data.transactions.reduce((sum, t) => sum + t.total_modal, 0);

  return {
    total_modal_tersisa: totalModalTersisa,
    total_modal_terjual: totalModalTerjual,
    total_pendapatan: totalPendapatan,
    total_profit: totalProfit,
    margin_profit: totalPendapatan > 0 ? ((totalProfit / totalPendapatan) * 100).toFixed(2) : '0.00',
    total_items: data.items.length,
    total_transactions: data.transactions.length,
  };
}

function generateAlerts(items, today) {
  const expiringSoon = items.filter(item => {
    const days = daysUntil(item.expired, today);
    return days <= 30 && days > 0;
  });

  const expiredItems = items.filter(item => daysUntil(item.expired, today) <= 0);
  const lowStockItems = items.filter(item => item.stok < 5);

  return { expiring_soon: expiringSoon, expired_items: expiredItems, low_stock_items: lowStockItems };
}

function getDailyPerformance(transactions, today) {
  const performance = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayTransactions = transactions.filter(t => t.tanggal.startsWith(dateStr));

    performance.push({
      date: dateStr,
      count: dayTransactions.length,
      revenue: dayTransactions.reduce((sum, t) => sum + t.total_jual, 0),
      profit: dayTransactions.reduce((sum, t) => sum + t.profit, 0),
    });
  }
  return performance;
}

function getTopSellingItems(transactions) {
  const itemSales = transactions.reduce((acc, t) => {
    const key = `${t.platform}_${t.tipe}`;
    if (!acc[key]) {
      acc[key] = { platform: t.platform, tipe: t.tipe, total_sold: 0, total_revenue: 0, total_profit: 0 };
    }
    acc[key].total_sold += t.jumlah;
    acc[key].total_revenue += t.total_jual;
    acc[key].total_profit += t.profit;
    return acc;
  }, {});

  return Object.values(itemSales)
    .sort((a, b) => b.total_sold - a.total_sold)
    .slice(0, 5);
}

// --- HELPER FUNCTIONS ---

function daysUntil(expiryDate, today) {
  const expiredDate = new Date(expiryDate);
  return Math.ceil((expiredDate - today) / (1000 * 60 * 60 * 24));
}