import { supabase, generateId, addAuditLog, checkConnectionAndGetData } from '../../lib/dataManager.js';
import { verifyToken } from './auth.js';

export default async function handler(req, res) {
  console.log(`[API/ITEMS] Received request: ${req.method}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Log env vars for debugging (REMOVE IN PRODUCTION)
    console.log('SUPABASE_URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('SERVICE_KEY available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const user = verifyToken(req);
    if (!user) {
      console.error('[API/ITEMS] Authentication failed.');
      return res.status(401).json({ error: 'Otentikasi gagal: token tidak valid atau tidak ada.' });
    }

    switch (req.method) {
      case 'GET':
        // Menggunakan fungsi debug baru
        console.log('[API/ITEMS] Calling checkConnectionAndGetData...');
        await checkConnectionAndGetData();
        // Jika berhasil, lanjutkan dengan logika GET yang sebenarnya
        await handleGet(req, res);
        break;
      case 'POST':
        await handlePost(req, res, user);
        break;
      case 'PUT':
        await handlePut(req, res, user);
        break;
      case 'DELETE':
        await handleDelete(req, res, user);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
        res.status(405).json({ error: `Method ${req.method} tidak diizinkan` });
    }
  } catch (error) {
    console.error('[API/ITEMS] Global Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan internal pada server.', details: error.message });
  }
}

async function handleGet(req, res) {
  const { data, error } = await supabase.from('items').select('*');
  if (error) return res.status(500).json({ error: error.message });

  const items = data.map(item => ({
    ...item,
    is_expired: new Date(item.expired) < new Date(),
    days_to_expire: Math.ceil((new Date(item.expired) - new Date()) / (1000 * 60 * 60 * 24))
  }));
  
  res.status(200).json({ items });
}

// ... (Fungsi POST, PUT, DELETE tetap sama untuk saat ini) ...

async function handlePost(req, res, user) {
  const { platform, tipe, stok, harga_modal, harga_jual, expired } = req.body;

  if (!platform || !tipe || stok === undefined || !harga_modal || !harga_jual || !expired) {
    return res.status(400).json({ error: 'Semua field harus diisi.' });
  }

  const newItem = {
    id: await generateId('items'),
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

  const { data, error } = await supabase.from('items').insert(newItem).select();

  if (error) {
    return res.status(500).json({ error: `Gagal menyimpan item: ${error.message}` });
  }

  await addAuditLog('CREATE_ITEM', user, `Membuat item baru: ${platform} (${tipe})`, newItem.id);
  res.status(201).json({ message: 'Item berhasil ditambahkan.', item: data[0] });
}

async function handlePut(req, res, user) {
  const { id, ...updateData } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID item diperlukan untuk update.' });
  }

  const updatedFields = {
    ...updateData,
    stok: parseInt(updateData.stok, 10),
    harga_modal: parseInt(updateData.harga_modal, 10),
    harga_jual: parseInt(updateData.harga_jual, 10),
    updated_at: new Date().toISOString(),
    updated_by: user.username
  };

  const { data, error } = await supabase.from('items').update(updatedFields).eq('id', id).select();

  if (error) {
    return res.status(500).json({ error: `Gagal mengupdate item: ${error.message}` });
  }
  if (data.length === 0) {
    return res.status(404).json({ error: 'Item tidak ditemukan.' });
  }

  await addAuditLog('UPDATE_ITEM', user, `Memperbarui item: ${data[0].platform} (${data[0].tipe})`, id);
  res.status(200).json({ message: 'Item berhasil diupdate.', item: data[0] });
}

async function handleDelete(req, res, user) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID item diperlukan untuk penghapusan.' });
  }

  const itemId = parseInt(id, 10);

  // Hapus data terkait (cascade delete akan lebih baik jika diatur di level DB)
  await supabase.from('premium_accounts').delete().eq('item_id', itemId);
  await supabase.from('voucher_codes').delete().eq('item_id', itemId);

  // Hapus item utama
  const { data, error } = await supabase.from('items').delete().eq('id', itemId).select();

  if (error) {
    return res.status(500).json({ error: `Gagal menghapus item: ${error.message}` });
  }
  if (data.length === 0) {
    return res.status(404).json({ error: 'Item tidak ditemukan saat mencoba menghapus.' });
  }

  const deletedItem = data[0];
  await addAuditLog('DELETE_ITEM', user, `Menghapus item: ${deletedItem.platform} (${deletedItem.tipe}) dan data terkait.`, itemId);
  res.status(200).json({ message: 'Item dan semua data terkait berhasil dihapus.' });
}