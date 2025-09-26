import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import ItemsTable from './ItemsTable';
import TransactionsTable from './TransactionsTable';
import ReportsPage from './ReportsPage';
import AuditLogsPage from './AuditLogsPage';
import DashboardOverview from './DashboardOverview'; // Asumsi komponen ini dibuat

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getAuthHeader } = useAuth();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeader();
      const [itemsRes, transactionsRes, reportsRes] = await Promise.all([
        fetch(`${API_URL}/items`, { headers }),
        fetch(`${API_URL}/transactions`, { headers }),
        fetch(`${API_URL}/reports`, { headers }),
      ]);

      if (!itemsRes.ok || !transactionsRes.ok || !reportsRes.ok) {
        throw new Error('Gagal memuat semua data. Periksa koneksi atau coba lagi.');
      }

      const itemsData = await itemsRes.json();
      const transactionsData = await transactionsRes.json();
      const reportsData = await reportsRes.json();

      setItems(itemsData.items || []);
      setTransactions(transactionsData.transactions || []);
      setReports(reportsData);

    } catch (err) {
      setError(err.message);
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-10">
          <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center p-10 bg-red-50 text-red-700 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Terjadi Kesalahan</h2>
          <p>{error}</p>
          <button onClick={loadData} className="mt-4 btn-primary">Coba Lagi</button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview reports={reports} items={items} />;
      case 'items':
        return <ItemsTable items={items} onRefresh={loadData} />;
      case 'transactions':
        return <TransactionsTable transactions={transactions} items={items} onRefresh={loadData} />;
      case 'reports':
        return <ReportsPage reports={reports} />;
      case 'audit':
        return <AuditLogsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {renderContent()}
      </main>
    </div>
  );
}