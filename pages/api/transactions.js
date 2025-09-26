import { readData, writeData, generateId, addAuditLog } from '../../lib/dataManager.js';
import { verifyToken } from './auth.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
        handleGet(req, res);
        break;
      case 'POST':
        handlePost(req, res, user);
        break;
      case 'DELETE':
        handleDelete(req, res, user);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'OPTIONS']);
        res.status(405).json({ error: `Method ${req.method} tidak diizinkan` });
    }
  } catch (error) {
    console.error('[API/TRANSACTIONS] Global Error:', error);
    if (error.message.includes('Token')) {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'Terjadi kesalahan internal pada server.', details: error.message });
  }
}

function handleGet(req, res) {
  const data = readData();
  res.status(200).json({ transactions: data.transactions || [] });
}

function handlePost(req, res, user) {
  const { item_id, jumlah } = req.body;

  if (!item_id || !jumlah || parseInt(jumlah, 10) <= 0) {
    return res.status(400).json({ error: 'ID item dan jumlah (lebih dari 0) harus valid.' });
  }

  const data = readData();
  const itemIndex = data.items.findIndex(item => item.id === parseInt(item_id, 10));

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item tidak ditemukan.' });
  }

  const item = data.items[itemIndex];
  const saleAmount = parseInt(jumlah, 10);

  if (item.stok < saleAmount) {
    return res.status(400).json({ error: `Stok tidak mencukupi. Sisa stok: ${item.stok}` });
  }

  // Update stok item
  item.stok -= saleAmount;
  item.updated_at = new Date().toISOString();
  item.updated_by = user.username;

  // Buat record transaksi baru
  const newTransaction = {
    id: generateId(data.transactions),
    item_id: item.id,
    platform: item.platform,
    tipe: item.tipe,
    jumlah: saleAmount,
    harga_modal: item.harga_modal,
    harga_jual: item.harga_jual,
    total_modal: item.harga_modal * saleAmount,
    total_jual: item.harga_jual * saleAmount,
    profit: (item.harga_jual - item.harga_modal) * saleAmount,
    tanggal: new Date().toISOString(),
    created_by: user.username
  };

  data.transactions.push(newTransaction);

  if (writeData(data)) {
    addAuditLog('CREATE_TRANSACTION', user.username, `Transaksi: ${item.platform} x${saleAmount}`, item.id, newTransaction.id);
    res.status(201).json({ 
      message: 'Transaksi berhasil dicatat.', 
      transaction: newTransaction,
      updated_item: item
    });
  } else {
    // Jika gagal, coba kembalikan stok (rollback manual)
    item.stok += saleAmount;
    res.status(500).json({ error: 'Gagal menyimpan data transaksi.' });
  }
}

function handleDelete(req, res, user) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID transaksi diperlukan.' });
  }

  const transactionId = parseInt(id, 10);
  const data = readData();
  const transactionIndex = data.transactions.findIndex(t => t.id === transactionId);

  if (transactionIndex === -1) {
    return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
  }

  const transaction = data.transactions[transactionIndex];

  // Hapus transaksi
  data.transactions.splice(transactionIndex, 1);

  // Kembalikan stok item terkait
  const itemIndex = data.items.findIndex(item => item.id === transaction.item_id);
  if (itemIndex !== -1) {
    data.items[itemIndex].stok += transaction.jumlah;
    data.items[itemIndex].updated_at = new Date().toISOString();
    data.items[itemIndex].updated_by = user.username; // Catat siapa yang menyebabkan pembaruan
  }

  if (writeData(data)) {
    addAuditLog('DELETE_TRANSACTION', user.username, `Membatalkan transaksi: ${transaction.platform} x${transaction.jumlah}`, transaction.item_id, transactionId);
    res.status(200).json({ 
      message: 'Transaksi berhasil dihapus dan stok telah dikembalikan.',
      restored_item_id: itemIndex !== -1 ? data.items[itemIndex].id : null
    });
  } else {
    res.status(500).json({ error: 'Gagal menyimpan data setelah menghapus transaksi.' });
  }
}