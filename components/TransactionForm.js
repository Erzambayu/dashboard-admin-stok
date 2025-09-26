import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

export default function TransactionForm({ items, onClose }) {
  const [formData, setFormData] = useState({ item_id: '', jumlah: '1' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { getAuthHeader } = useAuth();

  const availableItems = useMemo(() => items.filter(item => item.stok > 0 && !item.is_expired), [items]);
  const selectedItem = useMemo(() => items.find(item => item.id === parseInt(formData.item_id)), [items, formData.item_id]);

  const totals = useMemo(() => {
    if (!selectedItem || !formData.jumlah) return null;
    const jumlah = parseInt(formData.jumlah, 10);
    if (isNaN(jumlah) || jumlah <= 0) return null;

    const totalModal = selectedItem.harga_modal * jumlah;
    const totalJual = selectedItem.harga_jual * jumlah;
    const profit = totalJual - totalModal;
    return { totalModal, totalJual, profit };
  }, [selectedItem, formData.jumlah]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedItem) {
      return setError('Harap pilih item yang valid.');
    }
    if (parseInt(formData.jumlah, 10) > selectedItem.stok) {
      return setError(`Jumlah melebihi stok yang tersedia (${selectedItem.stok}).`);
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          item_id: parseInt(formData.item_id, 10),
          jumlah: parseInt(formData.jumlah, 10),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Gagal membuat transaksi.');
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
      <div className="modal-container max-w-md">
        <div className="modal-header">
          <h3 className="text-lg font-medium text-gray-900">Buat Transaksi Keluar</h3>
          <button onClick={onClose} className="modal-close-button">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Pilih Item</label>
            <select name="item_id" value={formData.item_id} onChange={handleChange} required className="input w-full">
              <option value="">-- Pilih Item --</option>
              {availableItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.platform} - {item.tipe.replace('_', ' ')} (Stok: {item.stok})
                </option>
              ))}
            </select>
            {availableItems.length === 0 && (
              <p className="text-sm text-red-600 mt-1">Tidak ada item dengan stok tersedia.</p>
            )}
          </div>

          {selectedItem && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 space-y-1">
              <p><b>Stok Tersedia:</b> {selectedItem.stok}</p>
              <p><b>Harga Jual:</b> {formatCurrency(selectedItem.harga_jual)}</p>
            </div>
          )}

          <div>
            <label className="label">Jumlah</label>
            <input
              type="number"
              name="jumlah"
              value={formData.jumlah}
              onChange={handleChange}
              required
              min="1"
              max={selectedItem?.stok || 1}
              className="input w-full"
              placeholder="Jumlah yang dijual"
              disabled={!selectedItem}
            />
          </div>

          {totals && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm space-y-1">
              <div className="flex justify-between"><span>Total Modal:</span> <span className="text-red-600">{formatCurrency(totals.totalModal)}</span></div>
              <div className="flex justify-between"><span>Total Jual:</span> <span className="text-green-600">{formatCurrency(totals.totalJual)}</span></div>
              <div className="flex justify-between font-bold"><span>Profit:</span> <span className="text-blue-600">{formatCurrency(totals.profit)}</span></div>
            </div>
          )}

          {error && <div className="alert-danger text-center">{error}</div>}

          <div className="flex space-x-4 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>Batal</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading || !selectedItem || !formData.jumlah}>
              {loading ? 'Memproses...' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}