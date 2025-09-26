import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

const DATA_KEY = 'app_data';
const DATA_FILE = path.join(process.cwd(), 'data.json');

// Helper untuk membaca data dari Vercel KV
// Termasuk logika untuk seeding data dari data.json jika KV kosong
async function readData() {
  try {
    let data = await kv.get(DATA_KEY);

    // Jika tidak ada data di KV, lakukan seeding dari file lokal
    if (!data) {
      console.log('No data found in Vercel KV. Seeding from local data.json...');
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      const initialData = JSON.parse(fileData);

      // Simpan data awal ke Vercel KV
      await kv.set(DATA_KEY, initialData);
      console.log('Seeding complete.');
      return initialData;
    }

    return data;
  } catch (error) {
    console.error('Error reading data from Vercel KV:', error);
    // Fallback ke struktur data kosong jika terjadi error
    return { items: [], transactions: [], users: [], audit_logs: [] };
  }
}

// Helper untuk menulis data ke Vercel KV
async function writeData(data) {
  try {
    await kv.set(DATA_KEY, data);
    return true;
  } catch (error) {
    console.error('Error writing data to Vercel KV:', error);
    return false;
  }
}

// Generate ID baru (tidak berubah)
function generateId(array) {
  return array.length > 0 ? Math.max(...array.map(item => item.id)) + 1 : 1;
}

// Log audit (diubah menjadi async)
async function addAuditLog(action, user, details, itemId = null, transactionId = null) {
  const data = await readData();
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
  await writeData(data);
}

export {
  readData,
  writeData,
  generateId,
  addAuditLog
};