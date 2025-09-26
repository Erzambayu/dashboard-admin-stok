import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function TransactionForm({ items, onClose }) {
  const [formData, setFormData] = useState({
    item_id: '',
    jumlah: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { getAuthHeader } = useAuth();

  const availableItems = items.filter(item => item.stok > 0 && !item.is_expired);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const selectedItem = items.find(item => item.id === parseInt(formData.item_id));
    
    if (!selectedItem) {
      setError('Item tidak ditemukan');
      setLoading(false);
      return;
    }

    if (parseInt(formData.jumlah) > selectedItem.stok) {
      setError('Jumlah melebihi stok tersedia');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          item_id: parseInt(formData.item_id),
          jumlah: parseInt(formData.jumlah)
        })
      });

      const data = await response.json();

      if (response.ok) {
        onClose();
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = items.find(item => item.id === parseInt(formData.item_id));

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateTotal = () => {
    if (!selectedItem || !formData.jumlah) return null;
    
    const jumlah = parseInt(formData.jumlah);
    const totalModal = selectedItem.harga_modal * jumlah;
    const totalJual = selectedItem.harga_jual * jumlah;
    const profit = totalJual - totalModal;
    
    return { totalModal, totalJual, profit };
  };

  const totals = calculateTotal();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 text-center">
            Transaksi Keluar
          </h3>
          
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Pilih Item</label>
              <select
                name="item_id"
                value={formData.item_id}
                onChange={handleChange}
                required
                className="input-field w-full"
              >
                <option value="">-- Pilih Item --</option>
                {availableItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.platform} - {item.tipe.replace('_', ' ')} (Stok: {item.stok})
                  </option>
                ))}
              </select>
              {availableItems.length === 0 && (
                <p className="text-sm text-red-600 mt-1">Tidak ada item dengan stok tersedia</p>
              )}
            </div>

            {selectedItem && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium text-gray-900">Detail Item</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Platform: {selectedItem.platform}</p>
                  <p>Tipe: {selectedItem.tipe.replace('_', ' ')}</p>
                  <p>Stok tersedia: {selectedItem.stok}</p>
                  <p>Harga modal: {formatCurrency(selectedItem.harga_modal)}</p>
                  <p>Harga jual: {formatCurrency(selectedItem.harga_jual)}</p>
                  <p>Expired: {new Date(selectedItem.expired).toLocaleDateString('id-ID')}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Jumlah</label>
              <input
                type="number"
                name="jumlah"
                value={formData.jumlah}
                onChange={handleChange}
                required
                min="1"
                max={selectedItem?.stok || 1}
                className="input-field w-full"
                placeholder="Jumlah yang akan dijual"
              />
            </div>

            {totals && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-gray-900">Ringkasan Transaksi</h4>
                <div className="text-sm space-y-1">
                  <p className="flex justify-between">
                    <span>Total Modal:</span>
                    <span className="text-red-600">{formatCurrency(totals.totalModal)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Total Jual:</span>
                    <span className="text-green-600">{formatCurrency(totals.totalJual)}</span>
                  </p>
                  <p className="flex justify-between font-medium">
                    <span>Profit:</span>
                    <span className="text-blue-600">{formatCurrency(totals.profit)}</span>
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading || availableItems.length === 0}
              >
                {loading ? 'Processing...' : 'Buat Transaksi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}