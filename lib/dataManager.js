import fs from 'fs';
import path from 'path';

const IS_VERCEL = process.env.VERCEL === '1';
const DATA_FILE = IS_VERCEL ? path.join('/tmp', 'data.json') : path.join(process.cwd(), 'data.json');
const SOURCE_DATA_FILE = path.join(process.cwd(), 'data.json');

// Helper untuk membaca data.json
function readData() {
  try {
    // Di Vercel, salin file data dari direktori proyek jika belum ada di /tmp
    if (IS_VERCEL && !fs.existsSync(DATA_FILE)) {
      fs.copyFileSync(SOURCE_DATA_FILE, DATA_FILE);
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data.json:', error);
    // Jika file tidak ada, coba salin lagi (untuk Vercel) atau kembalikan data kosong
    if (error.code === 'ENOENT') {
      try {
        if (IS_VERCEL) {
          fs.copyFileSync(SOURCE_DATA_FILE, DATA_FILE);
          const data = fs.readFileSync(DATA_FILE, 'utf8');
          return JSON.parse(data);
        }
      } catch (copyError) {
        console.error('Error copying initial data.json:', copyError);
      }
    }
    return { items: [], transactions: [], users: [], audit_logs: [], premium_accounts: [], voucher_codes: [] };
  }
}

// Helper untuk menulis data.json dengan atomic write
function writeData(data) {
  try {
    const tempFile = DATA_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (error) {
    console.error('Error writing data.json:', error);
    return false;
  }
}

// Generate ID baru
function generateId(array) {
  return array.length > 0 ? Math.max(...array.map(item => item.id)) + 1 : 1;
}

// Log audit
function addAuditLog(action, user, details, itemId = null, transactionId = null) {
  const data = readData();
  const log = {
    id: generateId(data.audit_logs),
    action,
    user,
    timestamp: new Date().toISOString(),
    details,
    ...(itemId && { item_id: itemId }),
    ...(transactionId && { transaction_id: transactionId })
  };
  
  data.audit_logs.push(log);
  writeData(data);
}

export {
  readData,
  writeData,
  generateId,
  addAuditLog
};