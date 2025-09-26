import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase client
console.log('Initializing Supabase client...');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are not set!');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fungsi sederhana untuk memeriksa koneksi dan mengambil data item
async function checkConnectionAndGetData() {
  console.log('Attempting to fetch items from Supabase...');
  const { data, error } = await supabase.from('items').select('*').limit(1);
  
  if (error) {
    console.error('Supabase connection/query error:', error);
    throw new Error(`Supabase query failed: ${error.message}`);
  }
  
  console.log('Successfully connected to Supabase and fetched data.');
  return data;
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
    "user": user.username,
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
  checkConnectionAndGetData, // Fungsi baru untuk debugging
  generateId,
  addAuditLog
};