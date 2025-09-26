import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function SmartItemForm({ item, onClose }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    platform: '',
    tipe: 'akun',
    harga_modal: '',
    harga_jual: '',
    expired: '',
  });
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { getAuthHeader } = useAuth();

  useEffect(() => {
    if (item) {
      setFormData({
        platform: item.platform,
        tipe: item.tipe,
        harga_modal: item.harga_modal.toString(),
        harga_jual: item.harga_jual.toString(),
        expired: item.expired.split('T')[0],
      });
      loadExistingAccounts(item.id, item.tipe);
    }
  }, [item]);

  const loadExistingAccounts = async (itemId, itemTipe) => {
    try {
      const res = await fetch(`${API_URL}/premium-accounts?item_id=${itemId}`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error('Gagal memuat akun/voucher yang ada.');
      const data = await res.json();
      const existingData = itemTipe === 'akun' ? data.premium_accounts : data.voucher_codes;
      setAccounts(existingData.map(d => ({ ...d, isNew: false }))); // Tandai sebagai tidak baru
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAccountChange = (index, field, value) => {
    const updated = [...accounts];
    updated[index][field] = value;
    setAccounts(updated);
  };

  const addAccountRow = () => {
    const newRow = formData.tipe === 'akun' 
      ? { id: `new-${Date.now()}`, username: '', password: '', notes: '', isNew: true }
      : { id: `new-${Date.now()}`, code: '', value: '', notes: '', isNew: true };
    setAccounts([...accounts, newRow]);
  };

  const removeAccountRow = (id) => {
    setAccounts(accounts.filter(acc => acc.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      if (item && accounts.length === 0) { // Jika edit, langsung load akun
        loadExistingAccounts(item.id, formData.tipe);
      }
      return;
    }

    if (accounts.filter(a => (a.username || a.code)).length === 0) {
      setError('Harap tambahkan setidaknya satu akun atau voucher.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const itemPayload = {
        ...formData,
        id: item?.id,
        stok: accounts.length,
      };

      const itemRes = await fetch(`${API_URL}/items`, {
        method: item ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(itemPayload),
      });

      if (!itemRes.ok) {
        const errData = await itemRes.json();
        throw new Error(errData.error || 'Gagal menyimpan item.');
      }

      const itemResult = await itemRes.json();
      const itemId = itemResult.item.id;

      // Hanya proses akun/voucher yang baru (isNew === true)
      const newAccounts = accounts.filter(acc => acc.isNew);
      for (const acc of newAccounts) {
        const accPayload = {
          item_id: itemId,
          platform: formData.platform,
          tipe: formData.tipe,
          notes: acc.notes,
          ...(formData.tipe === 'akun' 
            ? { username: acc.username, password: acc.password }
            : { code: acc.code, value: acc.value }),
        };

        const accRes = await fetch(`${API_URL}/premium-accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(accPayload),
        });

        if (!accRes.ok) {
          const errData = await accRes.json();
          throw new Error(`Gagal menyimpan ${formData.tipe}: ${acc.username || acc.code}. Error: ${errData.error}`);
        }
      }

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="text-xl font-bold">
            {item ? 'Edit' : 'Tambah'} Item {step === 2 && `- Tambah ${formData.tipe === 'akun' ? 'Akun' : 'Voucher'}`}
          </h2>
          <button onClick={onClose} className="modal-close-button">×</button>
        </div>

        <div className="flex mb-6">
          <div className={`flex-1 h-2 rounded-l ${step >= 1 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
          <div className={`flex-1 h-2 rounded-r ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
        </div>

        {error && <div className="alert-danger mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 ? (
            <Step1 formData={formData} handleChange={handleChange} />
          ) : (
            <Step2 
              formData={formData} 
              accounts={accounts} 
              onAccountChange={handleAccountChange}
              onAddRow={addAccountRow}
              onRemoveRow={removeAccountRow}
            />
          )}

          <div className="modal-footer">
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                ← Kembali
              </button>
            )}
            <div className="flex-grow" />
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Menyimpan...' : (step === 1 ? 'Lanjut →' : (item ? 'Update Item' : 'Simpan Item'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Sub-components for steps ---

const Step1 = ({ formData, handleChange }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Informasi Dasar Item</h3>
    <div>
      <label className="label">Platform</label>
      <input type="text" name="platform" value={formData.platform} onChange={handleChange} placeholder="Contoh: Netflix, Spotify" className="input" required />
    </div>
    <div>
      <label className="label">Tipe</label>
      <select name="tipe" value={formData.tipe} onChange={handleChange} className="input" required>
        <option value="akun">Akun Premium</option>
        <option value="voucher">Voucher</option>
        <option value="kode_redeem">Kode Redeem</option>
      </select>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="label">Harga Modal (Rp)</label>
        <input type="number" name="harga_modal" value={formData.harga_modal} onChange={handleChange} className="input" required />
      </div>
      <div>
        <label className="label">Harga Jual (Rp)</label>
        <input type="number" name="harga_jual" value={formData.harga_jual} onChange={handleChange} className="input" required />
      </div>
    </div>
    <div>
      <label className="label">Tanggal Expired</label>
      <input type="date" name="expired" value={formData.expired} onChange={handleChange} className="input" required />
    </div>
    <div className="bg-blue-50 p-3 rounded-lg">
      <p className="text-sm text-blue-700">
        💡 <b>Langkah selanjutnya:</b> Anda akan menambahkan detail untuk setiap {formData.tipe === 'akun' ? 'akun' : 'kode'}. Stok akan dihitung otomatis.
      </p>
    </div>
  </div>
);

const Step2 = ({ formData, accounts, onAccountChange, onAddRow, onRemoveRow }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold">Detail {formData.tipe === 'akun' ? 'Akun' : 'Voucher/Kode'}</h3>
      <span className="badge-blue">Stok: {accounts.length}</span>
    </div>

    <div className="space-y-3 max-h-72 overflow-y-auto p-1">
      {accounts.map((acc, index) => (
        <div key={acc.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center bg-gray-50 p-2 rounded">
          {formData.tipe === 'akun' ? (
            <>
              <input type="email" value={acc.username} onChange={(e) => onAccountChange(index, 'username', e.target.value)} placeholder="Email/Username" className="input md:col-span-1" readOnly={!acc.isNew} />
              <input type="text" value={acc.password} onChange={(e) => onAccountChange(index, 'password', e.target.value)} placeholder="Password" className="input md:col-span-1" />
              <input type="text" value={acc.notes} onChange={(e) => onAccountChange(index, 'notes', e.target.value)} placeholder="Catatan (opsional)" className="input md:col-span-1" />
            </>
          ) : (
            <>
              <input type="text" value={acc.code} onChange={(e) => onAccountChange(index, 'code', e.target.value)} placeholder="Kode Voucher/Redeem" className="input md:col-span-1" readOnly={!acc.isNew} />
              <input type="text" value={acc.value} onChange={(e) => onAccountChange(index, 'value', e.target.value)} placeholder="Nilai (opsional)" className="input md:col-span-1" />
              <input type="text" value={acc.notes} onChange={(e) => onAccountChange(index, 'notes', e.target.value)} placeholder="Catatan (opsional)" className="input md:col-span-1" />
            </>
          )}
          <button type="button" onClick={() => onRemoveRow(acc.id)} className="text-red-500 hover:text-red-700 justify-self-end p-2">
            🗑️
          </button>
        </div>
      ))}
    </div>

    <button type="button" onClick={onAddRow} className="btn-secondary w-full">
      + Tambah Baris
    </button>

    {accounts.length === 0 && (
      <div className="text-center py-6 text-gray-500">Belum ada {formData.tipe === 'akun' ? 'akun' : 'kode'} ditambahkan.</div>
    )}
  </div>
);