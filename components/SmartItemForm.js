import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function SmartItemForm({ item, onClose }) {
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Add Accounts/Vouchers
  const [formData, setFormData] = useState({
    platform: '',
    tipe: 'akun',
    harga_modal: '',
    harga_jual: '',
    expired: ''
  });
  
  // Dynamic accounts/vouchers data
  const [accounts, setAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState({
    username: '',
    password: '',
    notes: ''
  });
  const [newVoucher, setNewVoucher] = useState({
    code: '',
    value: '',
    notes: ''
  });
  
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
        expired: item.expired.split('T')[0]
      });
      // Load existing accounts if editing
      loadExistingAccounts(item.id);
    }
  }, [item]);

  const loadExistingAccounts = async (itemId) => {
    try {
      const response = await fetch(`/api/premium-accounts?item_id=${itemId}`, {
        headers: getAuthHeader()
      });
      if (response.ok) {
        const data = await response.json();
        if (formData.tipe === 'akun') {
          setAccounts(data.premium_accounts || []);
        } else {
          setAccounts(data.voucher_codes || []);
        }
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleNewAccountChange = (e) => {
    setNewAccount({
      ...newAccount,
      [e.target.name]: e.target.value
    });
  };

  const handleNewVoucherChange = (e) => {
    setNewVoucher({
      ...newVoucher,
      [e.target.name]: e.target.value
    });
  };

  const addAccount = () => {
    if (formData.tipe === 'akun') {
      if (newAccount.username && newAccount.password) {
        setAccounts([...accounts, { ...newAccount, id: Date.now() }]);
        setNewAccount({ username: '', password: '', notes: '' });
      }
    } else {
      if (newVoucher.code) {
        setAccounts([...accounts, { ...newVoucher, id: Date.now() }]);
        setNewVoucher({ code: '', value: '', notes: '' });
      }
    }
  };

  const removeAccount = (id) => {
    setAccounts(accounts.filter(acc => acc.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    if (accounts.length === 0) {
      setError('Minimal tambahkan 1 akun/voucher');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Create/Update item with auto-calculated stock
      const itemData = {
        ...formData,
        stok: accounts.length // Auto-calculated stock
      };

      const itemUrl = item ? '/api/items' : '/api/items';
      const itemMethod = item ? 'PUT' : 'POST';
      const itemBody = item 
        ? { ...itemData, id: item.id }
        : itemData;

      const itemResponse = await fetch(itemUrl, {
        method: itemMethod,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(itemBody)
      });

      if (!itemResponse.ok) {
        const errorData = await itemResponse.json();
        throw new Error(errorData.error || 'Gagal menyimpan item');
      }

      const itemResult = await itemResponse.json();
      const itemId = item ? item.id : itemResult.item.id;

      // Step 2: Add all accounts/vouchers
      for (const account of accounts) {
        if (account.isNew !== false) { // Skip existing accounts when editing
          const accountData = {
            item_id: itemId,
            platform: formData.platform,
            tipe: formData.tipe,
            ...(formData.tipe === 'akun' 
              ? { username: account.username, password: account.password }
              : { code: account.code, value: account.value }
            ),
            notes: account.notes || ''
          };

          await fetch('/api/premium-accounts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeader()
            },
            body: JSON.stringify(accountData)
          });
        }
      }

      onClose();
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep(1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {item ? 'Edit' : 'Tambah'} Item {step === 2 && `- Tambah ${formData.tipe === 'akun' ? 'Akun' : 'Voucher'}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex mb-6">
          <div className={`flex-1 h-2 rounded-l ${step >= 1 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
          <div className={`flex-1 h-2 rounded-r ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informasi Dasar Item</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform
                </label>
                <input
                  type="text"
                  name="platform"
                  value={formData.platform}
                  onChange={handleChange}
                  placeholder="Netflix, CapCut, Spotify, Steam, dll"
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipe
                </label>
                <select
                  name="tipe"
                  value={formData.tipe}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="akun">Akun Premium</option>
                  <option value="voucher">Voucher</option>
                  <option value="kode_redeem">Kode Redeem</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Harga Modal (Rp)
                  </label>
                  <input
                    type="number"
                    name="harga_modal"
                    value={formData.harga_modal}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="number"
                    name="harga_jual"
                    value={formData.harga_jual}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Expired
                </label>
                <input
                  type="date"
                  name="expired"
                  value={formData.expired}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div className="bg-blue-50 p-4 rounded">
                <p className="text-sm text-blue-700">
                  💡 <strong>Step selanjutnya:</strong> Anda akan menambahkan detail {formData.tipe === 'akun' ? 'akun premium (email/password)' : 'voucher/kode'} yang akan dijual. Stok akan otomatis terhitung dari jumlah {formData.tipe === 'akun' ? 'akun' : 'voucher'} yang Anda input.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {formData.tipe === 'akun' ? 'Akun Premium' : 'Voucher/Kode'} untuk {formData.platform}
                </h3>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  Stok: {accounts.length}
                </span>
              </div>

              {/* Add new account/voucher form */}
              <div className="border rounded p-4 bg-gray-50">
                <h4 className="font-medium mb-3">
                  Tambah {formData.tipe === 'akun' ? 'Akun' : (formData.tipe === 'voucher' ? 'Voucher' : 'Kode Redeem')} Baru
                </h4>
                
                {formData.tipe === 'akun' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="email"
                      name="username"
                      value={newAccount.username}
                      onChange={handleNewAccountChange}
                      placeholder="Email/Username"
                      className="border rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      name="password"
                      value={newAccount.password}
                      onChange={handleNewAccountChange}
                      placeholder="Password"
                      className="border rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      name="notes"
                      value={newAccount.notes}
                      onChange={handleNewAccountChange}
                      placeholder="Catatan (opsional)"
                      className="border rounded px-3 py-2"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      name="code"
                      value={newVoucher.code}
                      onChange={handleNewVoucherChange}
                      placeholder="Kode Voucher/Redeem"
                      className="border rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      name="value"
                      value={newVoucher.value}
                      onChange={handleNewVoucherChange}
                      placeholder="Nilai (3 months, 50k, dll)"
                      className="border rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      name="notes"
                      value={newVoucher.notes}
                      onChange={handleNewVoucherChange}
                      placeholder="Catatan (opsional)"
                      className="border rounded px-3 py-2"
                    />
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={addAccount}
                  className="mt-3 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  + Tambah {formData.tipe === 'akun' ? 'Akun' : 'Voucher'}
                </button>
              </div>

              {/* List of added accounts/vouchers */}
              {accounts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">
                    {formData.tipe === 'akun' ? 'Akun' : 'Voucher'} yang Ditambahkan ({accounts.length})
                  </h4>
                  <div className="max-h-60 overflow-y-auto">
                    {accounts.map((account, index) => (
                      <div key={account.id || index} className="flex items-center justify-between bg-white border rounded p-3">
                        <div className="flex-1">
                          {formData.tipe === 'akun' ? (
                            <div>
                              <span className="font-medium">{account.username}</span>
                              <span className="text-gray-500 ml-2">••••••••</span>
                              {account.notes && <span className="text-sm text-gray-500 block">{account.notes}</span>}
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium">{account.code}</span>
                              {account.value && <span className="text-gray-500 ml-2">({account.value})</span>}
                              {account.notes && <span className="text-sm text-gray-500 block">{account.notes}</span>}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAccount(account.id)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {accounts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Belum ada {formData.tipe === 'akun' ? 'akun' : 'voucher'} yang ditambahkan
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between mt-6">
            {step === 2 ? (
              <button
                type="button"
                onClick={goBack}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                ← Kembali
              </button>
            ) : (
              <div></div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Loading...' : (step === 1 ? 'Lanjut →' : (item ? 'Update Item' : 'Simpan Item'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}