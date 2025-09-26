import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import TransactionForm from './TransactionForm';
import ConfirmationModal from './ConfirmationModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
const formatDate = (dateString) => new Date(dateString).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

const TransactionRow = ({ transaction, onDelete }) => (
  <tr>
    <td className="cell-id">{transaction.id}</td>
    <td className="cell-main">{transaction.platform}</td>
    <td className="cell-common capitalize">{transaction.tipe.replace('_', ' ')}</td>
    <td className="cell-common">{transaction.jumlah}</td>
    <td className="cell-common">{formatCurrency(transaction.harga_modal)}</td>
    <td className="cell-common">{formatCurrency(transaction.harga_jual)}</td>
    <td className="cell-common">{formatCurrency(transaction.total_modal)}</td>
    <td className="cell-common font-medium text-green-600">{formatCurrency(transaction.total_jual)}</td>
    <td className="cell-common font-medium text-blue-600">{formatCurrency(transaction.profit)}</td>
    <td className="cell-common">{formatDate(transaction.tanggal)}</td>
    <td className="cell-common">
      <button onClick={() => onDelete(transaction.id)} className="link-danger" title="Hapus transaksi (akan mengembalikan stok)">
        Hapus
      </button>
    </td>
  </tr>
);

const SummaryCard = ({ title, value, className }) => (
  <div className="card">
    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
    <p className={`text-2xl font-bold ${className}`}>{value}</p>
  </div>
);

export default function TransactionsTable({ transactions, items, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState(null);
  const { getAuthHeader } = useAuth();

  const sortedTransactions = useMemo(() => 
    [...transactions].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)), 
    [transactions]
  );

  const summaryStats = useMemo(() => {
    const totalRevenue = transactions.reduce((sum, t) => sum + t.total_jual, 0);
    const totalProfit = transactions.reduce((sum, t) => sum + t.profit, 0);
    return { totalRevenue, totalProfit };
  }, [transactions]);

  const handleDelete = async (id) => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/transactions?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      if (response.ok) {
        onRefresh();
        setDeleteConfirm(null);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Gagal menghapus transaksi.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Riwayat Transaksi</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Catat Transaksi
        </button>
      </div>

      {error && <div className="alert-danger mb-4">{error}</div>}

      {transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <SummaryCard title="Total Transaksi" value={transactions.length} className="text-primary-600" />
          <SummaryCard title="Total Pendapatan" value={formatCurrency(summaryStats.totalRevenue)} className="text-green-600" />
          <SummaryCard title="Total Profit" value={formatCurrency(summaryStats.totalProfit)} className="text-blue-600" />
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="header-id">ID</th>
                <th className="header-main">Platform</th>
                <th className="header-common">Tipe</th>
                <th className="header-common">Jumlah</th>
                <th className="header-common">H. Modal</th>
                <th className="header-common">H. Jual</th>
                <th className="header-common">T. Modal</th>
                <th className="header-common">T. Jual</th>
                <th className="header-common">Profit</th>
                <th className="header-common">Tanggal</th>
                <th className="header-common">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTransactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} onDelete={setDeleteConfirm} />
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="text-center py-8"><p className="text-gray-500">Belum ada transaksi.</p></div>
          )}
        </div>
      </div>

      {showForm && <TransactionForm items={items} onClose={() => { setShowForm(false); onRefresh(); }} />}

      {deleteConfirm && (
        <ConfirmationModal
          title="Konfirmasi Hapus Transaksi"
          message="Apakah Anda yakin ingin menghapus transaksi ini? Stok item akan dikembalikan secara otomatis."
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Hapus"
          confirmVariant="danger"
        />
      )}
    </div>
  );
}