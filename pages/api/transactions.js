import { readData, writeData, generateId, addAuditLog } from '../../lib/dataManager.js';
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
      res.status(200).json({ transactions: data.transactions });
    }
    
    else if (req.method === 'POST') {
      const { item_id, jumlah } = req.body;
      
      if (!item_id || !jumlah || jumlah <= 0) {
        return res.status(400).json({ error: 'Item ID dan jumlah harus valid' });
      }

      const data = readData();
      const itemIndex = data.items.findIndex(item => item.id === parseInt(item_id));
      
      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item tidak ditemukan' });
      }

      const item = data.items[itemIndex];
      
      if (item.stok < parseInt(jumlah)) {
        return res.status(400).json({ error: 'Stok tidak mencukupi' });
      }

      // Kurangi stok
      data.items[itemIndex].stok -= parseInt(jumlah);
      data.items[itemIndex].updated_at = new Date().toISOString();
      data.items[itemIndex].updated_by = user.username;

      // Buat transaksi
      const newTransaction = {
        id: generateId(data.transactions),
        item_id: parseInt(item_id),
        platform: item.platform,
        tipe: item.tipe,
        jumlah: parseInt(jumlah),
        harga_modal: item.harga_modal,
        harga_jual: item.harga_jual,
        total_modal: item.harga_modal * parseInt(jumlah),
        total_jual: item.harga_jual * parseInt(jumlah),
        profit: (item.harga_jual - item.harga_modal) * parseInt(jumlah),
        tanggal: new Date().toISOString(),
        created_by: user.username
      };

      data.transactions.push(newTransaction);

      if (writeData(data)) {
        addAuditLog(
          'CREATE_TRANSACTION', 
          user.username, 
          `Transaksi keluar ${item.platform} ${item.tipe} x${jumlah}`, 
          parseInt(item_id), 
          newTransaction.id
        );
        res.status(201).json({ 
          message: 'Transaksi berhasil dibuat', 
          transaction: newTransaction,
          updated_item: data.items[itemIndex]
        });
      } else {
        res.status(500).json({ error: 'Gagal menyimpan data' });
      }
    }
    
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'ID transaksi harus disertakan' });
      }

      const data = readData();
      const transactionIndex = data.transactions.findIndex(t => t.id === parseInt(id));
      
      if (transactionIndex === -1) {
        return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
      }

      const transaction = data.transactions[transactionIndex];
      
      // Kembalikan stok
      const itemIndex = data.items.findIndex(item => item.id === transaction.item_id);
      if (itemIndex !== -1) {
        data.items[itemIndex].stok += transaction.jumlah;
        data.items[itemIndex].updated_at = new Date().toISOString();
        data.items[itemIndex].updated_by = user.username;
      }

      data.transactions.splice(transactionIndex, 1);

      if (writeData(data)) {
        addAuditLog(
          'DELETE_TRANSACTION', 
          user.username, 
          `Hapus transaksi ${transaction.platform} ${transaction.tipe} x${transaction.jumlah}`, 
          transaction.item_id, 
          parseInt(id)
        );
        res.status(200).json({ message: 'Transaksi berhasil dihapus' });
      } else {
        res.status(500).json({ error: 'Gagal menyimpan data' });
      }
    }
    
    else {
      res.status(405).json({ error: 'Method tidak diizinkan' });
    }
  } catch (error) {
    console.error('Transactions API error:', error);
    if (error.message === 'Token tidak ditemukan' || error.message === 'Token tidak valid') {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
}