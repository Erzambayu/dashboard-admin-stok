import { readData, writeData, generateId, addAuditLog } from '../../lib/dataManager.js';
import { verifyToken } from './auth.js';

// --- UTILITY FUNCTIONS ---

const updateItemStock = (data, itemId) => {
  const item = data.items.find(i => i.id === itemId);
  if (!item) return;

  const accountStock = data.premium_accounts?.filter(acc => acc.item_id === itemId && acc.status === 'available').length || 0;
  const voucherStock = data.voucher_codes?.filter(vc => vc.item_id === itemId && vc.status === 'available').length || 0;

  item.stok = accountStock + voucherStock;
};

// --- MAIN HANDLER ---

export default async function handler(req, res) {
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
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res, user);
      case 'PUT':
        return handlePut(req, res, user);
      case 'DELETE':
        return handleDelete(req, res, user);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
        return res.status(405).json({ error: `Method ${req.method} tidak diizinkan` });
    }
  } catch (error) {
    console.error('[API/PREMIUM-ACCOUNTS] Global Error:', error);
    if (error.message.includes('Token')) {
      return res.status(401).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Terjadi kesalahan internal pada server.', details: error.message });
  }
}

// --- METHOD HANDLERS ---

function handleGet(req, res) {
  const { item_id, platform, status = 'all' } = req.query;
  const data = readData();

  let accounts = data.premium_accounts || [];
  let codes = data.voucher_codes || [];

  if (item_id) {
    const id = parseInt(item_id, 10);
    accounts = accounts.filter(acc => acc.item_id === id);
    codes = codes.filter(code => code.item_id === id);
  }
  if (platform) {
    accounts = accounts.filter(acc => acc.platform.toLowerCase() === platform.toLowerCase());
    codes = codes.filter(code => code.platform.toLowerCase() === platform.toLowerCase());
  }
  if (status !== 'all') {
    accounts = accounts.filter(acc => acc.status === status);
    codes = codes.filter(code => code.status === status);
  }

  return res.status(200).json({ 
    premium_accounts: accounts, 
    voucher_codes: codes,
  });
}

function handlePost(req, res, user) {
  const { item_id, platform, tipe, username, password, code, value, notes } = req.body;

  if (!item_id || !platform || !tipe) {
    return res.status(400).json({ error: 'item_id, platform, dan tipe wajib diisi.' });
  }

  const data = readData();
  const itemId = parseInt(item_id, 10);

  if (tipe === 'akun') {
    return addPremiumAccount(res, user, data, { itemId, platform, username, password, notes });
  } else if (tipe === 'voucher' || tipe === 'kode_redeem') {
    return addVoucherCode(res, user, data, { itemId, platform, tipe, code, value, notes });
  } else {
    return res.status(400).json({ error: `Tipe '${tipe}' tidak valid.` });
  }
}

function handlePut(req, res, user) {
  const { id, tipe, status, sold_to } = req.body;

  if (!id || !tipe || !status) {
    return res.status(400).json({ error: 'id, tipe, dan status wajib diisi.' });
  }

  const data = readData();
  const entityId = parseInt(id, 10);

  let entity, entityType, logAction;
  if (tipe === 'akun') {
    entity = data.premium_accounts?.find(acc => acc.id === entityId);
    entityType = 'Akun';
    logAction = 'UPDATE_ACCOUNT_STATUS';
  } else {
    entity = data.voucher_codes?.find(vc => vc.id === entityId);
    entityType = 'Kode';
    logAction = 'UPDATE_CODE_STATUS';
  }

  if (!entity) {
    return res.status(404).json({ error: `${entityType} tidak ditemukan.` });
  }

  entity.status = status;
  if (status === 'sold') {
    entity.sold_at = new Date().toISOString();
    entity.sold_to = sold_to || 'customer';
  }

  updateItemStock(data, entity.item_id);

  if (writeData(data)) {
    addAuditLog(logAction, user.username, `Update status ${entity.platform}: ${entity.username || entity.code} -> ${status}`, entity.item_id);
    return res.status(200).json({ message: `Status ${entityType} berhasil diupdate.` });
  } else {
    return res.status(500).json({ error: `Gagal menyimpan data saat update status ${entityType}.` });
  }
}

function handleDelete(req, res, user) {
  const { id, tipe } = req.query;

  if (!id || !tipe) {
    return res.status(400).json({ error: 'id dan tipe wajib diisi.' });
  }

  const data = readData();
  const entityId = parseInt(id, 10);

  let list, entityIndex, entity, entityType, logAction;
  if (tipe === 'akun') {
    list = data.premium_accounts;
    entityType = 'Akun';
    logAction = 'DELETE_PREMIUM_ACCOUNT';
  } else {
    list = data.voucher_codes;
    entityType = 'Kode';
    logAction = 'DELETE_VOUCHER_CODE';
  }

  if (!list) {
    return res.status(404).json({ error: `${entityType} tidak ditemukan.` });
  }

  entityIndex = list.findIndex(e => e.id === entityId);
  if (entityIndex === -1) {
    return res.status(404).json({ error: `${entityType} tidak ditemukan.` });
  }

  entity = list[entityIndex];
  list.splice(entityIndex, 1);
  updateItemStock(data, entity.item_id);

  if (writeData(data)) {
    addAuditLog(logAction, user.username, `Hapus ${entity.platform}: ${entity.username || entity.code}`, entity.item_id);
    return res.status(200).json({ message: `${entityType} berhasil dihapus.` });
  } else {
    return res.status(500).json({ error: `Gagal menyimpan data saat menghapus ${entityType}.` });
  }
}

// --- SUB-HANDLERS for POST ---

function addPremiumAccount(res, user, data, { itemId, platform, username, password, notes }) {
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi untuk akun.' });
  }
  if (data.premium_accounts?.some(acc => acc.username === username && acc.platform === platform)) {
    return res.status(409).json({ error: 'Akun dengan username ini sudah ada.' });
  }

  const newAccount = {
    id: generateId(data.premium_accounts || []),
    item_id: itemId,
    platform,
    username,
    password,
    status: 'available',
    notes: notes || '',
    created_at: new Date().toISOString(),
    sold_at: null,
    sold_to: null
  };

  if (!data.premium_accounts) data.premium_accounts = [];
  data.premium_accounts.push(newAccount);
  updateItemStock(data, itemId);

  if (writeData(data)) {
    addAuditLog('ADD_PREMIUM_ACCOUNT', user.username, `Menambah akun ${platform}: ${username}`, itemId);
    return res.status(201).json({ message: 'Akun premium berhasil ditambahkan.', account: newAccount });
  } else {
    return res.status(500).json({ error: 'Gagal menyimpan data akun premium.' });
  }
}

function addVoucherCode(res, user, data, { itemId, platform, tipe, code, value, notes }) {
  if (!code) {
    return res.status(400).json({ error: 'Kode wajib diisi untuk voucher/kode redeem.' });
  }
  if (data.voucher_codes?.some(vc => vc.code === code && vc.platform === platform)) {
    return res.status(409).json({ error: 'Kode ini sudah ada.' });
  }

  const newCode = {
    id: generateId(data.voucher_codes || []),
    item_id: itemId,
    platform,
    code,
    value: value || '',
    status: 'available',
    notes: notes || '',
    created_at: new Date().toISOString(),
    sold_at: null,
    sold_to: null
  };

  if (!data.voucher_codes) data.voucher_codes = [];
  data.voucher_codes.push(newCode);
  updateItemStock(data, itemId);

  if (writeData(data)) {
    addAuditLog('ADD_VOUCHER_CODE', user.username, `Menambah ${tipe} ${platform}: ${code}`, itemId);
    return res.status(201).json({ message: `${tipe} berhasil ditambahkan.`, code: newCode });
  } else {
    return res.status(500).json({ error: `Gagal menyimpan data ${tipe}.` });
  }
}