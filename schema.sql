-- Supabase Schema Setup
-- Jalankan seluruh query ini di Supabase SQL Editor.

-- 1. Membuat tabel items
CREATE TABLE public.items (
    id BIGINT NOT NULL,
    platform TEXT,
    tipe TEXT,
    stok INT,
    harga_modal INT,
    harga_jual INT,
    expired TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    updated_by TEXT,
    CONSTRAINT items_pkey PRIMARY KEY (id)
);

-- 2. Membuat tabel transactions
CREATE TABLE public.transactions (
    id BIGINT NOT NULL,
    item_id BIGINT,
    platform TEXT,
    tipe TEXT,
    jumlah INT,
    harga_modal INT,
    harga_jual INT,
    total_modal INT,
    total_jual INT,
    profit INT,
    tanggal TIMESTAMPTZ,
    created_by TEXT,
    CONSTRAINT transactions_pkey PRIMARY KEY (id)
);

-- 3. Membuat tabel users
CREATE TABLE public.users (
    id BIGINT NOT NULL,
    username TEXT,
    password TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_username_key UNIQUE (username)
);

-- 4. Membuat tabel audit_logs
CREATE TABLE public.audit_logs (
    id BIGINT NOT NULL,
    action TEXT,
    "user" TEXT, -- Menggunakan tanda kutip karena "user" adalah kata kunci SQL
    timestamp TIMESTAMPTZ,
    details TEXT,
    item_id BIGINT,
    transaction_id BIGINT,
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- 5. Membuat tabel premium_accounts
CREATE TABLE public.premium_accounts (
    id BIGINT NOT NULL,
    item_id BIGINT,
    platform TEXT,
    username TEXT,
    password TEXT,
    status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ,
    sold_at TIMESTAMPTZ,
    sold_to TEXT,
    CONSTRAINT premium_accounts_pkey PRIMARY KEY (id)
);

-- 6. Membuat tabel voucher_codes
CREATE TABLE public.voucher_codes (
    id BIGINT NOT NULL,
    item_id BIGINT,
    platform TEXT,
    code TEXT,
    value TEXT,
    status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ,
    sold_at TIMESTAMPTZ,
    sold_to TEXT,
    CONSTRAINT voucher_codes_pkey PRIMARY KEY (id)
);

-- 7. Mengaktifkan Row Level Security (RLS) - Praktik terbaik Supabase
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_codes ENABLE ROW LEVEL SECURITY;

-- 8. Membuat kebijakan (policy) untuk mengizinkan akses penuh dari sisi server (menggunakan service_role)
-- Ini penting agar API Next.js Anda dapat mengakses data
CREATE POLICY "Allow full access for service role" ON public.items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role" ON public.premium_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role" ON public.voucher_codes FOR ALL USING (true) WITH CHECK (true);