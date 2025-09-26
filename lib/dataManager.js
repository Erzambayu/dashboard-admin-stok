import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data.json');

// Helper untuk membaca data.json
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data.json:', error);
    return { items: [], transactions: [], users: [], audit_logs: [] };
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