import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ItemForm({ item, onClose }) {
  const [formData, setFormData] = useState({
    platform: '',
    tipe: 'akun',
    stok: '',
    harga_modal: '',
    harga_jual: '',
    expired: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { getAuthHeader } = useAuth();

  useEffect(() => {
    if (item) {
      setFormData({
        platform: item.platform,
        tipe: item.tipe,
        stok: item.stok.toString(),
        harga_modal: item.harga_modal.toString(),
        harga_jual: item.harga_jual.toString(),
        expired: item.expired.split('T')[0]
      });
    }
  }, [item]);

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

    try {
      const url = item ? '/api/items' : '/api/items';
      const method = item ? 'PUT' : 'POST';
      const body = item 
        ? { ...formData, id: item.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(body)
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

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 text-center">
            {item ? 'Edit Item' : 'Tambah Item'}
          </h3>
          
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Platform</label>
              <input
                type="text"
                name="platform"
                value={formData.platform}
                onChange={handleChange}
                required
                className="input-field w-full"
                placeholder="e.g. Netflix, CapCut, Spotify"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tipe</label>
              <select
                name="tipe"
                value={formData.tipe}
                onChange={handleChange}
                required
                className="input-field w-full"
              >
                <option value="akun">Akun</option>
                <option value="voucher">Voucher</option>
                <option value="kode_redeem">Kode Redeem</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Stok</label>
              <input
                type="number"
                name="stok"
                value={formData.stok}
                onChange={handleChange}
                required
                min="0"
                className="input-field w-full"
                placeholder="Jumlah stok"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Harga Modal (Rp)</label>
              <input
                type="number"
                name="harga_modal"
                value={formData.harga_modal}
                onChange={handleChange}
                required
                min="0"
                className="input-field w-full"
                placeholder="Harga modal per item"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Harga Jual (Rp)</label>
              <input
                type="number"
                name="harga_jual"
                value={formData.harga_jual}
                onChange={handleChange}
                required
                min="0"
                className="input-field w-full"
                placeholder="Harga jual per item"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tanggal Expired</label>
              <input
                type="date"
                name="expired"
                value={formData.expired}
                onChange={handleChange}
                required
                className="input-field w-full"
              />
            </div>

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
                disabled={loading}
              >
                {loading ? 'Loading...' : (item ? 'Update' : 'Tambah')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}