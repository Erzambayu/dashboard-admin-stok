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
      const items = data.items.map(item => ({
        ...item,
        is_expired: new Date(item.expired) < new Date(),
        days_to_expire: Math.ceil((new Date(item.expired) - new Date()) / (1000 * 60 * 60 * 24))
      }));
      
      res.status(200).json({ items });
    }
    
    else if (req.method === 'POST') {
      const { platform, tipe, stok, harga_modal, harga_jual, expired } = req.body;
      
      if (!platform || !tipe || !stok || !harga_modal || !harga_jual || !expired) {
        return res.status(400).json({ error: 'Semua field harus diisi' });
      }

      const data = readData();
      const newItem = {
        id: generateId(data.items),
        platform,
        tipe,
        stok: parseInt(stok),
        harga_modal: parseInt(harga_modal),
        harga_jual: parseInt(harga_jual),
        expired,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: user.username
      };

      data.items.push(newItem);
      
      if (writeData(data)) {
        addAuditLog('CREATE_ITEM', user.username, `Membuat item ${platform} ${tipe}`, newItem.id);
        res.status(201).json({ message: 'Item berhasil ditambahkan', item: newItem });
      } else {
        res.status(500).json({ error: 'Gagal menyimpan data' });
      }
    }
    
    else if (req.method === 'PUT') {
      const { id, platform, tipe, stok, harga_modal, harga_jual, expired } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'ID item harus disertakan' });
      }

      const data = readData();
      const itemIndex = data.items.findIndex(item => item.id === parseInt(id));
      
      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item tidak ditemukan' });
      }

      const oldItem = { ...data.items[itemIndex] };
      
      data.items[itemIndex] = {
        ...data.items[itemIndex],
        platform: platform || data.items[itemIndex].platform,
        tipe: tipe || data.items[itemIndex].tipe,
        stok: stok !== undefined ? parseInt(stok) : data.items[itemIndex].stok,
        harga_modal: harga_modal !== undefined ? parseInt(harga_modal) : data.items[itemIndex].harga_modal,
        harga_jual: harga_jual !== undefined ? parseInt(harga_jual) : data.items[itemIndex].harga_jual,
        expired: expired || data.items[itemIndex].expired,
        updated_at: new Date().toISOString(),
        updated_by: user.username
      };

      if (writeData(data)) {
        addAuditLog('UPDATE_ITEM', user.username, `Update item ${data.items[itemIndex].platform} ${data.items[itemIndex].tipe}`, parseInt(id));
        res.status(200).json({ message: 'Item berhasil diupdate', item: data.items[itemIndex] });
      } else {
        res.status(500).json({ error: 'Gagal menyimpan data' });
      }
    }
    
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'ID item harus disertakan' });
      }

      const data = readData();
      const itemIndex = data.items.findIndex(item => item.id === parseInt(id));
      
      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item tidak ditemukan' });
      }

      const deletedItem = data.items[itemIndex];
      
      // Also delete related premium accounts and voucher codes
      const itemId = parseInt(id);
      if (data.premium_accounts) {
        data.premium_accounts = data.premium_accounts.filter(acc => acc.item_id !== itemId);
      }
      if (data.voucher_codes) {
        data.voucher_codes = data.voucher_codes.filter(code => code.item_id !== itemId);
      }
      
      // Remove the item
      data.items.splice(itemIndex, 1);

      if (writeData(data)) {
        addAuditLog('DELETE_ITEM', user.username, `Hapus item ${deletedItem.platform} ${deletedItem.tipe} beserta ${deletedItem.stok} akun terkait`, parseInt(id));
        res.status(200).json({ message: 'Item dan data terkait berhasil dihapus' });
      } else {
        res.status(500).json({ error: 'Gagal menyimpan data' });
      }
    }
    
    else {
      res.status(405).json({ error: 'Method tidak diizinkan' });
    }
  } catch (error) {
    console.error('Items API error:', error);
    console.error('Error stack:', error.stack);
    if (error.message === 'Token tidak ditemukan' || error.message === 'Token tidak valid') {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ 
        error: 'Server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}