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
      const data = readData();
      
      // Hitung total modal dari semua item
      const totalModal = data.items.reduce((total, item) => 
        total + (item.harga_modal * item.stok), 0
      );
      
      // Hitung pendapatan dan profit dari transaksi
      const totalPendapatan = data.transactions.reduce((total, transaction) => 
        total + transaction.total_jual, 0
      );
      
      const totalProfit = data.transactions.reduce((total, transaction) => 
        total + transaction.profit, 0
      );
      
      const totalModalTerjual = data.transactions.reduce((total, transaction) => 
        total + transaction.total_modal, 0
      );

      // Item yang akan expired dalam 30 hari
      const expiringSoon = data.items.filter(item => {
        const expiredDate = new Date(item.expired);
        const today = new Date();
        const daysToExpire = Math.ceil((expiredDate - today) / (1000 * 60 * 60 * 24));
        return daysToExpire <= 30 && daysToExpire > 0;
      });

      // Item yang sudah expired
      const expiredItems = data.items.filter(item => {
        const expiredDate = new Date(item.expired);
        const today = new Date();
        return expiredDate < today;
      });

      // Item dengan stok rendah (< 5)
      const lowStockItems = data.items.filter(item => item.stok < 5);

      // Transaksi per hari (7 hari terakhir)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayTransactions = data.transactions.filter(t => 
          t.tanggal.split('T')[0] === dateStr
        );
        
        last7Days.push({
          date: dateStr,
          count: dayTransactions.length,
          revenue: dayTransactions.reduce((sum, t) => sum + t.total_jual, 0),
          profit: dayTransactions.reduce((sum, t) => sum + t.profit, 0)
        });
      }

      // Top selling items
      const itemSales = {};
      data.transactions.forEach(t => {
        const key = `${t.platform}_${t.tipe}`;
        if (!itemSales[key]) {
          itemSales[key] = {
            platform: t.platform,
            tipe: t.tipe,
            total_sold: 0,
            total_revenue: 0,
            total_profit: 0
          };
        }
        itemSales[key].total_sold += t.jumlah;
        itemSales[key].total_revenue += t.total_jual;
        itemSales[key].total_profit += t.profit;
      });

      const topSellingItems = Object.values(itemSales)
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 5);

      const report = {
        summary: {
          total_modal_tersisa: totalModal,
          total_modal_terjual: totalModalTerjual,
          total_pendapatan: totalPendapatan,
          total_profit: totalProfit,
          margin_profit: totalPendapatan > 0 ? ((totalProfit / totalPendapatan) * 100).toFixed(2) : 0,
          total_items: data.items.length,
          total_transactions: data.transactions.length
        },
        alerts: {
          expiring_soon: expiringSoon,
          expired_items: expiredItems,
          low_stock_items: lowStockItems
        },
        charts: {
          last_7_days: last7Days,
          top_selling_items: topSellingItems
        }
      };
      
      res.status(200).json(report);
    } else {
      res.status(405).json({ error: 'Method tidak diizinkan' });
    }
  } catch (error) {
    console.error('Reports API error:', error);
    if (error.message === 'Token tidak ditemukan' || error.message === 'Token tidak valid') {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
}