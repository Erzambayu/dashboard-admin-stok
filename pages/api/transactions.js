import { supabase, generateId, addAuditLog } from '../../lib/dataManager.js';
import { verifyToken } from './auth.js';

export default async function handler(req, res) {
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
        await handleGet(req, res);
        break;
      case 'POST':
        await handlePost(req, res, user);
        break;
      case 'DELETE':
        await handleDelete(req, res, user);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'OPTIONS']);
        res.status(405).json({ error: `Method ${req.method} tidak diizinkan` });
    }
  } catch (error) {
    console.error('[API/TRANSACTIONS] Global Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan internal pada server.', details: error.message });
  }
}

async function handleGet(req, res) {
  const { data, error } = await supabase.from('transactions').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ transactions: data || [] });
}

async function handlePost(req, res, user) {
  const { item_id, jumlah } = req.body;
  const saleAmount = parseInt(jumlah, 10);

  if (!item_id || !saleAmount || saleAmount <= 0) {
    return res.status(400).json({ error: 'ID item dan jumlah (lebih dari 0) harus valid.' });
  }

  // Ambil item dari DB
  const { data: itemData, error: itemError } = await supabase
    .from('items')
    .select('*')
    .eq('id', item_id)
    .single();

  if (itemError || !itemData) {
    return res.status(404).json({ error: 'Item tidak ditemukan.' });
  }

  if (itemData.stok < saleAmount) {
    return res.status(400).json({ error: `Stok tidak mencukupi. Sisa stok: ${itemData.stok}` });
  }

  // Kurangi stok item
  const newStock = itemData.stok - saleAmount;
  const { error: updateError } = await supabase
    .from('items')
    .update({ stok: newStock, updated_at: new Date().toISOString(), updated_by: user.username })
    .eq('id', item_id);

  if (updateError) {
    return res.status(500).json({ error: `Gagal mengupdate stok: ${updateError.message}` });
  }

  // Buat record transaksi baru
  const newTransaction = {
    id: await generateId('transactions'),
    item_id: itemData.id,
    platform: itemData.platform,
    tipe: itemData.tipe,
    jumlah: saleAmount,
    harga_modal: itemData.harga_modal,
    harga_jual: itemData.harga_jual,
    total_modal: itemData.harga_modal * saleAmount,
    total_jual: itemData.harga_jual * saleAmount,
    profit: (itemData.harga_jual - itemData.harga_modal) * saleAmount,
    tanggal: new Date().toISOString(),
    created_by: user.username
  };

  const { data: transactionData, error: transactionError } = await supabase
    .from('transactions')
    .insert(newTransaction)
    .select();

  if (transactionError) {
    // Rollback stok jika gagal membuat transaksi
    await supabase.from('items').update({ stok: itemData.stok }).eq('id', item_id);
    return res.status(500).json({ error: `Gagal menyimpan transaksi: ${transactionError.message}` });
  }

  await addAuditLog('CREATE_TRANSACTION', user, `Transaksi: ${itemData.platform} x${saleAmount}`, itemData.id, newTransaction.id);
  res.status(201).json({ 
    message: 'Transaksi berhasil dicatat.', 
    transaction: transactionData[0],
  });
}

async function handleDelete(req, res, user) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID transaksi diperlukan.' });

  const transactionId = parseInt(id, 10);

  // Ambil transaksi yang akan dihapus
  const { data: transaction, error: findError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (findError || !transaction) {
    return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
  }

  // Hapus transaksi
  const { error: deleteError } = await supabase.from('transactions').delete().eq('id', transactionId);
  if (deleteError) {
    return res.status(500).json({ error: `Gagal menghapus transaksi: ${deleteError.message}` });
  }

  // Kembalikan stok item terkait
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('stok')
    .eq('id', transaction.item_id)
    .single();

  if (item) {
    const newStock = item.stok + transaction.jumlah;
    await supabase
      .from('items')
      .update({ stok: newStock, updated_at: new Date().toISOString(), updated_by: user.username })
      .eq('id', transaction.item_id);
  }

  await addAuditLog('DELETE_TRANSACTION', user, `Membatalkan transaksi: ${transaction.platform} x${transaction.jumlah}`, transaction.item_id, transactionId);
  res.status(200).json({ 
    message: 'Transaksi berhasil dihapus dan stok telah dikembalikan.',
  });
}