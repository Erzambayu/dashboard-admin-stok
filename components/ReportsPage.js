export default function ReportsPage({ reports }) {
  if (!reports) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Laporan</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900">Total Modal Tersisa</h3>
          <p className="text-2xl font-bold text-primary-600">
            {formatCurrency(reports.summary.total_modal_tersisa)}
          </p>
          <p className="text-sm text-gray-500">{reports.summary.total_items} items</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900">Total Pendapatan</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(reports.summary.total_pendapatan)}
          </p>
          <p className="text-sm text-gray-500">{reports.summary.total_transactions} transaksi</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900">Total Profit</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(reports.summary.total_profit)}
          </p>
          <p className="text-sm text-gray-500">Margin: {reports.summary.margin_profit}%</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900">Modal Terjual</h3>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(reports.summary.total_modal_terjual)}
          </p>
          <p className="text-sm text-gray-500">Cost of goods sold</p>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-medium text-red-800 mb-4">⚠️ Item Expired</h3>
          {reports.alerts.expired_items.length > 0 ? (
            <div className="space-y-2">
              {reports.alerts.expired_items.slice(0, 5).map(item => (
                <div key={item.id} className="text-sm text-red-600">
                  <div className="font-medium">{item.platform} - {item.tipe}</div>
                  <div className="text-xs">Stok: {item.stok}, Expired: {new Date(item.expired).toLocaleDateString('id-ID')}</div>
                </div>
              ))}
              {reports.alerts.expired_items.length > 5 && (
                <div className="text-xs text-red-500">
                  +{reports.alerts.expired_items.length - 5} lainnya
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Tidak ada item expired</p>
          )}
        </div>
        
        <div className="card">
          <h3 className="text-lg font-medium text-yellow-800 mb-4">⏰ Akan Expired</h3>
          {reports.alerts.expiring_soon.length > 0 ? (
            <div className="space-y-2">
              {reports.alerts.expiring_soon.slice(0, 5).map(item => (
                <div key={item.id} className="text-sm text-yellow-600">
                  <div className="font-medium">{item.platform} - {item.tipe}</div>
                  <div className="text-xs">
                    Stok: {item.stok}, {Math.ceil((new Date(item.expired) - new Date()) / (1000 * 60 * 60 * 24))} hari lagi
                  </div>
                </div>
              ))}
              {reports.alerts.expiring_soon.length > 5 && (
                <div className="text-xs text-yellow-500">
                  +{reports.alerts.expiring_soon.length - 5} lainnya
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Tidak ada item akan expired</p>
          )}
        </div>
        
        <div className="card">
          <h3 className="text-lg font-medium text-orange-800 mb-4">📦 Stok Rendah</h3>
          {reports.alerts.low_stock_items.length > 0 ? (
            <div className="space-y-2">
              {reports.alerts.low_stock_items.slice(0, 5).map(item => (
                <div key={item.id} className="text-sm text-orange-600">
                  <div className="font-medium">{item.platform} - {item.tipe}</div>
                  <div className="text-xs">Stok: {item.stok}</div>
                </div>
              ))}
              {reports.alerts.low_stock_items.length > 5 && (
                <div className="text-xs text-orange-500">
                  +{reports.alerts.low_stock_items.length - 5} lainnya
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Semua item stok mencukupi</p>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7 Days Performance */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">📈 Performa 7 Hari Terakhir</h3>
          <div className="space-y-4">
            {reports.charts.last_7_days.map((day, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <div className="font-medium text-sm">{formatDate(day.date)}</div>
                  <div className="text-xs text-gray-500">{day.count} transaksi</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">{formatCurrency(day.revenue)}</div>
                  <div className="text-xs text-blue-600">Profit: {formatCurrency(day.profit)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">🏆 Top 5 Item Terlaris</h3>
          <div className="space-y-4">
            {reports.charts.top_selling_items.length > 0 ? (
              reports.charts.top_selling_items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <div className="font-medium text-sm">{item.platform} - {item.tipe}</div>
                    <div className="text-xs text-gray-500">Terjual: {item.total_sold} unit</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">{formatCurrency(item.total_revenue)}</div>
                    <div className="text-xs text-blue-600">Profit: {formatCurrency(item.total_profit)}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Belum ada penjualan</p>
            )}
          </div>
        </div>
      </div>

      {/* Financial Analysis */}
      <div className="card mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">💰 Analisis Keuangan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Struktur Modal</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Modal Tersisa (Inventory):</span>
                <span className="font-medium">{formatCurrency(reports.summary.total_modal_tersisa)}</span>
              </div>
              <div className="flex justify-between">
                <span>Modal Terjual:</span>
                <span className="font-medium">{formatCurrency(reports.summary.total_modal_terjual)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Total Modal:</span>
                <span className="font-medium">{formatCurrency(reports.summary.total_modal_tersisa + reports.summary.total_modal_terjual)}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Performa Penjualan</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Pendapatan:</span>
                <span className="font-medium text-green-600">{formatCurrency(reports.summary.total_pendapatan)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Profit:</span>
                <span className="font-medium text-blue-600">{formatCurrency(reports.summary.total_profit)}</span>
              </div>
              <div className="flex justify-between">
                <span>Margin Profit:</span>
                <span className="font-medium">{reports.summary.margin_profit}%</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">ROI:</span>
                <span className="font-medium">
                  {reports.summary.total_modal_terjual > 0 
                    ? ((reports.summary.total_profit / reports.summary.total_modal_terjual) * 100).toFixed(2)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}