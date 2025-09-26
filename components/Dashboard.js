import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import ItemsTable from './ItemsTable';
import TransactionsTable from './TransactionsTable';
import ReportsPage from './ReportsPage';
import AuditLogsPage from './AuditLogsPage';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getAuthHeader } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load items
      const itemsResponse = await fetch('/api/items', {
        headers: getAuthHeader()
      });
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        setItems(itemsData.items);
      }

      // Load transactions
      const transactionsResponse = await fetch('/api/transactions', {
        headers: getAuthHeader()
      });
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions);
      }

      // Load reports
      const reportsResponse = await fetch('/api/reports', {
        headers: getAuthHeader()
      });
      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setReports(reportsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>
            
            {reports && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Summary Cards */}
                <div className="card">
                  <h3 className="text-lg font-medium text-gray-900">Total Modal Tersisa</h3>
                  <p className="text-2xl font-bold text-primary-600">
                    Rp {reports.summary.total_modal_tersisa.toLocaleString('id-ID')}
                  </p>
                </div>
                
                <div className="card">
                  <h3 className="text-lg font-medium text-gray-900">Total Pendapatan</h3>
                  <p className="text-2xl font-bold text-green-600">
                    Rp {reports.summary.total_pendapatan.toLocaleString('id-ID')}
                  </p>
                </div>
                
                <div className="card">
                  <h3 className="text-lg font-medium text-gray-900">Total Profit</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    Rp {reports.summary.total_profit.toLocaleString('id-ID')}
                  </p>
                </div>
                
                <div className="card">
                  <h3 className="text-lg font-medium text-gray-900">Margin Profit</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {reports.summary.margin_profit}%
                  </p>
                </div>
              </div>
            )}

            {/* Alerts */}
            {reports && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {reports.alerts.expired_items.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-red-800 mb-2">Item Expired</h3>
                    <p className="text-red-600">{reports.alerts.expired_items.length} item sudah expired</p>
                  </div>
                )}
                
                {reports.alerts.expiring_soon.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">Akan Expired</h3>
                    <p className="text-yellow-600">{reports.alerts.expiring_soon.length} item akan expired dalam 30 hari</p>
                  </div>
                )}
                
                {reports.alerts.low_stock_items.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-orange-800 mb-2">Stok Rendah</h3>
                    <p className="text-orange-600">{reports.alerts.low_stock_items.length} item stok &lt; 5</p>
                  </div>
                )}
              </div>
            )}

            {/* Recent Items */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Item Terbaru</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.slice(0, 5).map(item => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.platform}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tipe}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.stok}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.is_expired ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Expired
                            </span>
                          ) : item.days_to_expire <= 30 ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Akan Expired
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'items' && (
          <ItemsTable items={items} onRefresh={refreshData} />
        )}
        
        {activeTab === 'transactions' && (
          <TransactionsTable 
            transactions={transactions} 
            items={items} 
            onRefresh={refreshData} 
          />
        )}
        
        {activeTab === 'reports' && (
          <ReportsPage reports={reports} />
        )}
        
        {activeTab === 'audit' && (
          <AuditLogsPage />
        )}
      </main>
    </div>
  );
}