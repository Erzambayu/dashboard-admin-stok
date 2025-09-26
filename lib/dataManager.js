import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Inisialisasi Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Gunakan service role key untuk akses sisi server
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = ['items', 'transactions', 'users', 'audit_logs', 'premium_accounts', 'voucher_codes'];

// --- Fungsi Inisialisasi Database ---

// Fungsi untuk memeriksa apakah tabel ada
async function tableExists(tableName) {
  // Supabase tidak memiliki cara langsung untuk memeriksa keberadaan tabel melalui API JS standar.
  // Pendekatan ini mencoba mengambil 1 baris. Jika berhasil atau mengembalikan array kosong, tabel ada.
  // Jika gagal dengan error "relation ... does not exist", tabel tidak ada.
  const { error } = await supabase.from(tableName).select('id').limit(1);
  if (error && error.code === '42P01') { // 42P01 adalah kode error Postgres untuk tabel tidak ada
    return false;
  }
  return true;
}

// Fungsi untuk membuat tabel (sangat dasar, hanya untuk demo)
// Di produksi, Anda harus menggunakan migrasi Supabase.
async function createTables() {
  console.log('Attempting to create database tables...');
  const queries = [
    `CREATE TABLE items (id BIGINT PRIMARY KEY, platform TEXT, tipe TEXT, stok INT, harga_modal INT, harga_jual INT, expired TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, updated_by TEXT);`,
    `CREATE TABLE transactions (id BIGINT PRIMARY KEY, item_id BIGINT, platform TEXT, tipe TEXT, jumlah INT, harga_modal INT, harga_jual INT, total_modal INT, total_jual INT, profit INT, tanggal TIMESTAMPTZ, created_by TEXT);`,
    `CREATE TABLE users (id BIGINT PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT, created_at TIMESTAMPTZ);`,
    `CREATE TABLE audit_logs (id BIGINT PRIMARY KEY, action TEXT, user_id BIGINT, timestamp TIMESTAMPTZ, details TEXT, item_id BIGINT, transaction_id BIGINT);`,
    `CREATE TABLE premium_accounts (id BIGINT PRIMARY KEY, item_id BIGINT, platform TEXT, username TEXT, password TEXT, status TEXT, notes TEXT, created_at TIMESTAMPTZ, sold_at TIMESTAMPTZ, sold_to TEXT);`,
    `CREATE TABLE voucher_codes (id BIGINT PRIMARY KEY, item_id BIGINT, platform TEXT, code TEXT, value TEXT, status TEXT, notes TEXT, created_at TIMESTAMPTZ, sold_at TIMESTAMPTZ, sold_to TEXT);`
  ];

  for (const query of queries) {
    const { error } = await supabase.rpc('execute_sql', { sql: query });
    if (error) console.error(`Error creating table for query "${query}":`, error.message);
    else console.log(`Successfully executed: ${query.substring(0, 30)}...`);
  }
}

// Fungsi untuk menyemai (seed) data dari data.json lokal
async function seedData() {
  console.log('Seeding data from local data.json...');
  const dataPath = path.join(process.cwd(), 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.log('data.json not found, skipping seed.');
    return;
  }

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
}

// --- Fungsi CRUD Utama ---

// Helper untuk membaca semua data dari semua tabel
async function readData() {
  // Cek apakah tabel pertama ada, jika tidak, coba inisialisasi DB
  const itemsTableExists = await tableExists('items');
  if (!itemsTableExists) {
    console.log('Initial setup: Tables not found.');
    await createTables();
    await seedData();
  }

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
    // Fallback ke struktur kosong jika ada kesalahan fatal
    return TABLES.reduce((acc, tbl) => ({ ...acc, [tbl]: [] }), {});
  }
}

// Helper untuk menulis data. Ini menjadi lebih kompleks karena kita perlu
// tahu tabel mana yang akan ditulis. Fungsi ini sekarang menjadi usang.
// Operasi tulis harus dilakukan pada tabel tertentu.
async function writeData(data) {
  console.warn('DEPRECATED: writeData is deprecated. Use table-specific operations instead.');
  // Untuk kompatibilitas mundur, kita bisa mencoba menebak, tapi ini sangat tidak efisien.
  // Sebaiknya refaktor endpoint untuk menggunakan fungsi yang lebih spesifik.
  try {
    for (const tableName of TABLES) {
      if (data[tableName]) {
        // Ini adalah operasi UPSERT: update jika ada, insert jika tidak.
        const { error } = await supabase.from(tableName).upsert(data[tableName], { onConflict: 'id' });
        if (error) throw new Error(`Error writing to ${tableName}: ${error.message}`);
      }
    }
    return true;
  } catch (error) {
    console.error('Error writing data to Supabase:', error);
    return false;
  }
}

// Generate ID baru - sekarang harus memeriksa ID maksimum di database
async function generateId(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (error) {
    console.error(`Error getting max id for ${tableName}:`, error);
    return 1; // Fallback
  }
  
  return (data && data.length > 0) ? data[0].id + 1 : 1;
}

// Log audit - sekarang menulis ke tabel audit_logs
async function addAuditLog(action, user, details, itemId = null, transactionId = null) {
  const log = {
    id: await generateId('audit_logs'),
    action,
    user_id: user.id, // Asumsi user object memiliki id
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
  supabase, // Ekspor instance client untuk operasi yang lebih kompleks
  readData,
  writeData, // Tetap ekspor untuk kompatibilitas, tapi beri peringatan
  generateId,
  addAuditLog
};