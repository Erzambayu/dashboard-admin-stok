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
      // Get premium accounts by item_id or platform
      const { item_id, platform, status = 'all' } = req.query;
      const data = readData();
      
      let accounts = data.premium_accounts || [];
      let codes = data.voucher_codes || [];
      
      // Filter by item_id if provided
      if (item_id) {
        accounts = accounts.filter(acc => acc.item_id === parseInt(item_id));
        codes = codes.filter(code => code.item_id === parseInt(item_id));
      }
      
      // Filter by platform if provided
      if (platform) {
        accounts = accounts.filter(acc => acc.platform.toLowerCase() === platform.toLowerCase());
        codes = codes.filter(code => code.platform.toLowerCase() === platform.toLowerCase());
      }
      
      // Filter by status if not 'all'
      if (status !== 'all') {
        accounts = accounts.filter(acc => acc.status === status);
        codes = codes.filter(code => code.status === status);
      }
      
      res.status(200).json({ 
        premium_accounts: accounts, 
        voucher_codes: codes,
        total_accounts: accounts.length,
        total_codes: codes.length,
        available_accounts: accounts.filter(acc => acc.status === 'available').length,
        available_codes: codes.filter(code => code.status === 'available').length
      });
      
    } else if (req.method === 'POST') {
      // Add new premium account or voucher code
      const { item_id, platform, tipe, username, password, code, value, notes } = req.body;
      
      if (!item_id || !platform || !tipe) {
        return res.status(400).json({ error: 'item_id, platform, dan tipe wajib diisi' });
      }
      
      const data = readData();
      
      if (tipe === 'akun') {
        // Add premium account
        if (!username || !password) {
          return res.status(400).json({ error: 'Username dan password wajib diisi untuk akun' });
        }
        
        // Check if account already exists
        const existingAccount = data.premium_accounts?.find(acc => 
          acc.username === username && acc.platform === platform
        );
        
        if (existingAccount) {
          return res.status(400).json({ error: 'Akun dengan username ini sudah ada' });
        }
        
        const newAccount = {
          id: generateId(data.premium_accounts || []),
          item_id: parseInt(item_id),
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
        
        // Update item stock
        const item = data.items.find(i => i.id === parseInt(item_id));
        if (item) {
          item.stok = (data.premium_accounts.filter(acc => 
            acc.item_id === parseInt(item_id) && acc.status === 'available'
          ).length);
        }
        
        writeData(data);
        addAuditLog('ADD_PREMIUM_ACCOUNT', user.username, `Menambah akun ${platform}: ${username}`, item_id);
        
        res.status(201).json({ message: 'Akun premium berhasil ditambahkan', account: newAccount });
        
      } else if (tipe === 'voucher' || tipe === 'kode_redeem') {
        // Add voucher/redeem code
        if (!code) {
          return res.status(400).json({ error: 'Code wajib diisi untuk voucher/kode redeem' });
        }
        
        // Check if code already exists
        const existingCode = data.voucher_codes?.find(vc => 
          vc.code === code && vc.platform === platform
        );
        
        if (existingCode) {
          return res.status(400).json({ error: 'Code ini sudah ada' });
        }
        
        const newCode = {
          id: generateId(data.voucher_codes || []),
          item_id: parseInt(item_id),
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
        
        // Update item stock
        const item = data.items.find(i => i.id === parseInt(item_id));
        if (item) {
          item.stok = (data.voucher_codes.filter(vc => 
            vc.item_id === parseInt(item_id) && vc.status === 'available'
          ).length);
        }
        
        writeData(data);
        addAuditLog('ADD_VOUCHER_CODE', user.username, `Menambah ${tipe} ${platform}: ${code}`, item_id);
        
        res.status(201).json({ message: `${tipe} berhasil ditambahkan`, code: newCode });
      }
      
    } else if (req.method === 'PUT') {
      // Update account status (mark as sold)
      const { id, tipe, status, sold_to } = req.body;
      
      if (!id || !tipe || !status) {
        return res.status(400).json({ error: 'id, tipe, dan status wajib diisi' });
      }
      
      const data = readData();
      
      if (tipe === 'akun') {
        const account = data.premium_accounts?.find(acc => acc.id === parseInt(id));
        if (!account) {
          return res.status(404).json({ error: 'Akun tidak ditemukan' });
        }
        
        account.status = status;
        if (status === 'sold') {
          account.sold_at = new Date().toISOString();
          account.sold_to = sold_to || 'customer';
        }
        
        // Update item stock
        const item = data.items.find(i => i.id === account.item_id);
        if (item) {
          item.stok = (data.premium_accounts.filter(acc => 
            acc.item_id === account.item_id && acc.status === 'available'
          ).length);
        }
        
        addAuditLog('UPDATE_ACCOUNT_STATUS', user.username, 
          `Update status akun ${account.platform}: ${account.username} → ${status}`, account.item_id);
        
      } else {
        const code = data.voucher_codes?.find(vc => vc.id === parseInt(id));
        if (!code) {
          return res.status(404).json({ error: 'Code tidak ditemukan' });
        }
        
        code.status = status;
        if (status === 'sold') {
          code.sold_at = new Date().toISOString();
          code.sold_to = sold_to || 'customer';
        }
        
        // Update item stock
        const item = data.items.find(i => i.id === code.item_id);
        if (item) {
          item.stok = (data.voucher_codes.filter(vc => 
            vc.item_id === code.item_id && vc.status === 'available'
          ).length);
        }
        
        addAuditLog('UPDATE_CODE_STATUS', user.username, 
          `Update status ${code.platform}: ${code.code} → ${status}`, code.item_id);
      }
      
      writeData(data);
      res.status(200).json({ message: 'Status berhasil diupdate' });
      
    } else if (req.method === 'DELETE') {
      // Delete account or code
      const { id, tipe } = req.query;
      
      if (!id || !tipe) {
        return res.status(400).json({ error: 'id dan tipe wajib diisi' });
      }
      
      const data = readData();
      
      if (tipe === 'akun') {
        const index = data.premium_accounts?.findIndex(acc => acc.id === parseInt(id));
        if (index === -1 || index === undefined) {
          return res.status(404).json({ error: 'Akun tidak ditemukan' });
        }
        
        const account = data.premium_accounts[index];
        data.premium_accounts.splice(index, 1);
        
        // Update item stock
        const item = data.items.find(i => i.id === account.item_id);
        if (item) {
          item.stok = (data.premium_accounts.filter(acc => 
            acc.item_id === account.item_id && acc.status === 'available'
          ).length);
        }
        
        addAuditLog('DELETE_PREMIUM_ACCOUNT', user.username, 
          `Hapus akun ${account.platform}: ${account.username}`, account.item_id);
        
      } else {
        const index = data.voucher_codes?.findIndex(vc => vc.id === parseInt(id));
        if (index === -1 || index === undefined) {
          return res.status(404).json({ error: 'Code tidak ditemukan' });
        }
        
        const code = data.voucher_codes[index];
        data.voucher_codes.splice(index, 1);
        
        // Update item stock
        const item = data.items.find(i => i.id === code.item_id);
        if (item) {
          item.stok = (data.voucher_codes.filter(vc => 
            vc.item_id === code.item_id && vc.status === 'available'
          ).length);
        }
        
        addAuditLog('DELETE_VOUCHER_CODE', user.username, 
          `Hapus code ${code.platform}: ${code.code}`, code.item_id);
      }
      
      writeData(data);
      res.status(200).json({ message: 'Berhasil dihapus' });
      
    } else {
      res.status(405).json({ error: 'Method tidak diizinkan' });
    }
    
  } catch (error) {
    console.error('Premium accounts API error:', error);
    if (error.message === 'Token tidak ditemukan' || error.message === 'Token tidak valid') {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
}