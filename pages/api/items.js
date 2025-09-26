import { readData, writeData, generateId, addAuditLog } from '../../lib/dataManager.js';
import { verifyToken } from './auth.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
      case 'PUT':
        handlePut(req, res, user);
        break;
      case 'DELETE':
        handleDelete(req, res, user);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
        res.status(405).json({ error: `Method ${req.method} tidak diizinkan` });
    }
  } catch (error) {
    console.error('[API/ITEMS] Global Error:', error);
    if (error.message.includes('Token')) {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'Terjadi kesalahan internal pada server.', details: error.message });
  }
}

function handleGet(req, res) {
  const data = readData();
  const items = data.items.map(item => ({
    ...item,
    is_expired: new Date(item.expired) < new Date(),
    days_to_expire: Math.ceil((new Date(item.expired) - new Date()) / (1000 * 60 * 60 * 24))
  }));
  res.status(200).json({ items });
}

function handlePost(req, res, user) {
  const { platform, tipe, stok, harga_modal, harga_jual, expired } = req.body;

  if (!platform || !tipe || stok === undefined || !harga_modal || !harga_jual || !expired) {
    return res.status(400).json({ error: 'Semua field harus diisi.' });
  }

  const data = readData();
  const newItem = {
    id: generateId(data.items),
    platform,
    tipe,
    stok: parseInt(stok, 10) || 0,
    harga_modal: parseInt(harga_modal, 10) || 0,
    harga_jual: parseInt(harga_jual, 10) || 0,
    expired,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: user.username
  };

  data.items.push(newItem);

  if (writeData(data)) {
    addAuditLog('CREATE_ITEM', user.username, `Membuat item baru: ${platform} (${tipe})`, newItem.id);
    res.status(201).json({ message: 'Item berhasil ditambahkan.', item: newItem });
  } else {
    res.status(500).json({ error: 'Gagal menyimpan data item.' });
  }
}

function handlePut(req, res, user) {
  const { id, platform, tipe, stok, harga_modal, harga_jual, expired } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID item diperlukan untuk update.' });
  }

  const data = readData();
  const itemIndex = data.items.findIndex(item => item.id === parseInt(id, 10));

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item tidak ditemukan.' });
  }

  const updatedItem = { ...data.items[itemIndex] };
  if (platform) updatedItem.platform = platform;
  if (tipe) updatedItem.tipe = tipe;
  if (stok !== undefined) updatedItem.stok = parseInt(stok, 10);
  if (harga_modal !== undefined) updatedItem.harga_modal = parseInt(harga_modal, 10);
  if (harga_jual !== undefined) updatedItem.harga_jual = parseInt(harga_jual, 10);
  if (expired) updatedItem.expired = expired;
  updatedItem.updated_at = new Date().toISOString();
  updatedItem.updated_by = user.username;

  data.items[itemIndex] = updatedItem;

  if (writeData(data)) {
    addAuditLog('UPDATE_ITEM', user.username, `Memperbarui item: ${updatedItem.platform} (${updatedItem.tipe})`, updatedItem.id);
    res.status(200).json({ message: 'Item berhasil diupdate.', item: updatedItem });
  } else {
    res.status(500).json({ error: 'Gagal menyimpan data setelah update.' });
  }
}

function handleDelete(req, res, user) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID item diperlukan untuk penghapusan.' });
  }

  const itemId = parseInt(id, 10);
  const data = readData();
  const itemIndex = data.items.findIndex(item => item.id === itemId);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item tidak ditemukan.' });
  }

  const deletedItem = data.items[itemIndex];

  // Hapus item utama
  data.items.splice(itemIndex, 1);

  // Hapus data terkait (akun premium dan kode voucher)
  if (data.premium_accounts) {
    data.premium_accounts = data.premium_accounts.filter(acc => acc.item_id !== itemId);
  }
  if (data.voucher_codes) {
    data.voucher_codes = data.voucher_codes.filter(code => code.item_id !== itemId);
  }

  if (writeData(data)) {
    addAuditLog('DELETE_ITEM', user.username, `Menghapus item: ${deletedItem.platform} (${deletedItem.tipe}) dan data terkait.`, itemId);
    res.status(200).json({ message: 'Item dan semua data terkait berhasil dihapus.' });
  } else {
    res.status(500).json({ error: 'Gagal menyimpan data setelah penghapusan.' });
  }
}