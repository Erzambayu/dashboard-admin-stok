import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import SmartItemForm from './SmartItemForm';
import ConfirmationModal from './ConfirmationModal'; // Asumsi komponen ini dibuat

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

const ItemRow = ({ item, onEdit, onDelete }) => {
  const statusBadge = useMemo(() => {
    if (item.is_expired) {
      return <span className="badge-danger">Expired</span>;
    }
    if (item.days_to_expire <= 30 && item.days_to_expire > 0) {
      return <span className="badge-warning">Akan Expired ({item.days_to_expire} hari)</span>;
    }
    if (item.stok < 5) {
      return <span className="badge-orange">Stok Rendah</span>;
    }
    return <span className="badge-success">Normal</span>;
  }, [item.is_expired, item.days_to_expire, item.stok]);

  return (
    <tr className={item.is_expired ? 'bg-red-50/50' : ''}>
      <td className="cell-id">{item.id}</td>
      <td className="cell-main">{item.platform}</td>
      <td className="cell-common capitalize">{item.tipe.replace('_', ' ')}</td>
      <td className="cell-common">{item.stok}</td>
      <td className="cell-common">{formatCurrency(item.harga_modal)}</td>
      <td className="cell-common">{formatCurrency(item.harga_jual)}</td>
      <td className="cell-common">{new Date(item.expired).toLocaleDateString('id-ID')}</td>
      <td className="cell-common">{statusBadge}</td>
      <td className="cell-common space-x-2">
        <button onClick={() => onEdit(item)} className="link-primary">Edit</button>
        <button onClick={() => onDelete(item.id)} className="link-danger">Hapus</button>
      </td>
    </tr>
  );
};

export default function ItemsTable({ items, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState(null);
  const { getAuthHeader } = useAuth();

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDeleteRequest = async (id) => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/items?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      if (response.ok) {
        onRefresh();
        setDeleteConfirm(null);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Gagal menghapus item.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(null);
    onRefresh();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Kelola Stok</h1>
        <button onClick={() => { setEditingItem(null); setShowForm(true); }} className="btn-primary">
          + Tambah Item
        </button>
      </div>

      {error && <div className="alert-danger mb-4">{error}</div>}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="header-id">ID</th>
                <th className="header-main">Platform</th>
                <th className="header-common">Tipe</th>
                <th className="header-common">Stok</th>
                <th className="header-common">Harga Modal</th>
                <th className="header-common">Harga Jual</th>
                <th className="header-common">Expired</th>
                <th className="header-common">Status</th>
                <th className="header-common">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <ItemRow key={item.id} item={item} onEdit={handleEdit} onDelete={setDeleteConfirm} />
              ))}
            </tbody>
          </table>
          
          {items.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Belum ada item yang ditambahkan.</p>
            </div>
          )}
        </div>
      </div>

      {showForm && <SmartItemForm item={editingItem} onClose={handleFormClose} />}

      {deleteConfirm && (
        <ConfirmationModal
          title="Konfirmasi Hapus"
          message="Apakah Anda yakin ingin menghapus item ini? Tindakan ini juga akan menghapus semua akun/kode terkait dan tidak dapat dibatalkan."
          onConfirm={() => handleDeleteRequest(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Hapus"
          confirmVariant="danger"
        />
      )}
    </div>
  );
}