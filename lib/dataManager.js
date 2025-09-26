import { createClient } from '@supabase/supabase-js';

// --- Inisialisasi Supabase Client ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL: Supabase environment variables are not set.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Fungsi CRUD ---

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

// Fungsi readData tidak lagi diperlukan karena setiap endpoint akan mengambil datanya sendiri.

export {
  supabase,
  generateId,
  addAuditLog
};