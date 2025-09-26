import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Inisialisasi Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = ['items', 'transactions', 'users', 'audit_logs', 'premium_accounts', 'voucher_codes'];

// --- Fungsi Seeding ---
async function seedData() {
  console.log('Checking if seeding is required...');
  const dataPath = path.join(process.cwd(), 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.log('data.json not found, skipping seed.');
    return;
  }

  // Cek apakah tabel 'items' kosong
  const { count } = await supabase.from('items').select('id', { count: 'exact', head: true });

  if (count === 0) {
    console.log('Database is empty. Seeding data from local data.json...');
    const localData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    for (const tableName of TABLES) {
      if (localData[tableName] && localData[tableName].length > 0) {
        const { error } = await supabase.from(tableName).insert(localData[tableName]);
        if (error) {
          console.error(`Error seeding ${tableName}:`, error.message);
        } else {
          console.log(`Successfully seeded ${tableName}.`);
        }
      }
    }
  } else {
    console.log('Database already contains data. Skipping seed.');
  }
}

// --- Fungsi CRUD Utama ---

// Helper untuk membaca semua data dari semua tabel
// Termasuk logika seeding jika database kosong
async function readData() {
  await seedData(); // Cek dan jalankan seeding jika perlu

  try {
    const data = {};
    for (const tableName of TABLES) {
      const { data: tableData, error } = await supabase.from(tableName).select('*');
      if (error) throw new Error(`Error reading from ${tableName}: ${error.message}`);
      data[tableName] = tableData || [];
    }
    return data;
  } catch (error) {
    console.error('Error reading all data from Supabase:', error);
    return TABLES.reduce((acc, tbl) => ({ ...acc, [tbl]: [] }), {});
  }
}

// Generate ID baru
async function generateId(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (error) {
    console.error(`Error getting max id for ${tableName}:`, error);
    return 1;
  }
  
  return (data && data.length > 0) ? data[0].id + 1 : 1;
}

// Log audit
async function addAuditLog(action, user, details, itemId = null, transactionId = null) {
  const log = {
    id: await generateId('audit_logs'),
    action,
    "user": user.username, // Sesuaikan dengan skema baru
    timestamp: new Date().toISOString(),
    details,
    item_id: itemId,
    transaction_id: transactionId
  };
  
  const { error } = await supabase.from('audit_logs').insert(log);
  if (error) {
    console.error('Error adding audit log:', error);
  }
}

export {
  supabase,
  readData,
  generateId,
  addAuditLog
};