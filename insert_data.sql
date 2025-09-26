-- Data Seeding for Supabase
-- Hapus data lama (opsional, jika Anda ingin memulai dari awal)
-- DELETE FROM public.items;
-- DELETE FROM public.transactions;
-- DELETE FROM public.users;
-- DELETE FROM public.audit_logs;
-- DELETE FROM public.premium_accounts;
-- DELETE FROM public.voucher_codes;

-- 1. Masukkan data pengguna (user)
-- Password untuk 'admin' adalah 'erzam7302'
INSERT INTO public.users (id, username, password, role, created_at) VALUES
(1, 'admin', '$2a$10$i6lXVjFb5mAanALsxQdu.eyMbAHkeAW3IpCsLrkK3iAw.KrzvsQv.', 'admin', '2024-09-26T10:00:00Z');

-- 2. Masukkan data item
INSERT INTO public.items (id, platform, tipe, stok, harga_modal, harga_jual, expired, created_at, updated_at, updated_by) VALUES
(1, 'CapCut', 'akun', 3, 15000, 30000, '2025-10-30', '2024-09-26T10:00:00Z', '2024-09-26T10:00:00Z', 'admin'),
(2, 'Netflix', 'akun', 2, 25000, 50000, '2025-12-31', '2024-09-26T10:00:00Z', '2024-09-26T10:00:00Z', 'admin'),
(3, 'Spotify', 'voucher', 5, 35000, 60000, '2025-11-15', '2024-09-26T10:00:00Z', '2024-09-26T10:00:00Z', 'admin'),
(4, 'Steam', 'kode_redeem', 3, 40000, 75000, '2024-12-01', '2024-09-26T10:00:00Z', '2024-09-26T10:00:00Z', 'admin');

-- 3. Masukkan data akun premium
INSERT INTO public.premium_accounts (id, item_id, platform, username, password, status, notes, created_at, sold_at, sold_to) VALUES
(1, 1, 'CapCut', 'capcut_user1@email.com', 'pass123capcut', 'available', 'Akun premium sampai Des 2025', '2024-09-26T10:00:00Z', NULL, NULL),
(2, 1, 'CapCut', 'capcut_user2@gmail.com', 'mypass456', 'available', 'Fresh account', '2024-09-26T10:00:00Z', NULL, NULL),
(3, 1, 'CapCut', 'capcut_pro@yahoo.com', 'secure789', 'available', 'Pro features unlocked', '2024-09-26T10:00:00Z', NULL, NULL),
(4, 2, 'Netflix', 'netflix1@example.com', 'netflixpass1', 'available', '4K Ultra HD, 4 screens', '2024-09-26T10:00:00Z', NULL, NULL),
(5, 2, 'Netflix', 'netflix2@example.com', 'netflixpass2', 'available', 'Premium account', '2024-09-26T10:00:00Z', NULL, NULL);

-- 4. Masukkan data kode voucher
INSERT INTO public.voucher_codes (id, item_id, platform, code, value, status, notes, created_at, sold_at, sold_to) VALUES
(1, 3, 'Spotify', 'SPOT-1234-5678-ABCD', '3 months premium', 'available', 'Spotify Premium 3 bulan', '2024-09-26T10:00:00Z', NULL, NULL),
(2, 3, 'Spotify', 'SPOT-2345-6789-EFGH', '3 months premium', 'available', 'Valid until 2025', '2024-09-26T10:00:00Z', NULL, NULL),
(3, 4, 'Steam', 'STEAM-ABC123-DEF456', '50000 Steam Wallet', 'available', 'Steam wallet 50k', '2024-09-26T10:00:00Z', NULL, NULL);

-- 5. Masukkan data transaksi
INSERT INTO public.transactions (id, item_id, platform, tipe, jumlah, harga_modal, harga_jual, total_modal, total_jual, profit, tanggal, created_by) VALUES
(1, 1, 'CapCut', 'akun', 2, 15000, 30000, 30000, 60000, 30000, '2024-09-25T14:30:00Z', 'admin'),
(2, 2, 'Netflix', 'akun', 1, 25000, 50000, 25000, 50000, 25000, '2024-09-26T09:15:00Z', 'admin');

-- 6. Masukkan data log audit
INSERT INTO public.audit_logs (id, action, "user", timestamp, details, item_id, transaction_id) VALUES
(1, 'CREATE_ITEM', 'admin', '2024-09-26T10:00:00Z', 'Membuat item CapCut akun', 1, NULL),
(2, 'CREATE_TRANSACTION', 'admin', '2024-09-25T14:30:00Z', 'Transaksi keluar CapCut akun x2', NULL, 1);
