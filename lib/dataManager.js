import fs from 'fs';
import path from 'path';

const IS_VERCEL = process.env.VERCEL === '1';
const DATA_FILE = IS_VERCEL ? path.join('/tmp', 'data.json') : path.join(process.cwd(), 'data.json');
const SOURCE_DATA_FILE = path.join(process.cwd(), 'data.json');

// Inisialisasi data di /tmp jika di Vercel
if (IS_VERCEL && !fs.existsSync(DATA_FILE)) {
  try {
    fs.copyFileSync(SOURCE_DATA_FILE, DATA_FILE);
    console.log('Successfully copied data.json to /tmp');
  } catch (error) {
    console.error('Error copying initial data.json to /tmp:', error);
  }
}

// Helper untuk membaca data.json
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    // Jika file tidak ada karena alasan apa pun, coba salin lagi atau kembalikan data kosong
    if (error.code === 'ENOENT' && IS_VERCEL) {
      try {
        fs.copyFileSync(SOURCE_DATA_FILE, DATA_FILE);
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
      } catch (copyError) {
        console.error('Error re-copying data.json:', copyError);
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
    console.error('Error writing data file:', error);
    return false;
  }
}

// Generate ID baru
function generateId(array) {
  if (!array || array.length === 0) return 1;
  return Math.max(...array.map(item => item.id)) + 1;
}

// Log audit
function addAuditLog(action, user, details, itemId = null, transactionId = null) {
  const data = readData();
  if (!data.audit_logs) {
    data.audit_logs = [];
  }
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