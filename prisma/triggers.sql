-- ==========================================
-- SQL TRIGGERS FOR SISTEM INFORMASI AKUNTANSI
-- MediCare Pro - PostgreSQL / Neon Tech DDL
-- ==========================================

-- Skrip ini mendefinisikan trigger asli di level database PostgreSQL.
-- Ketika ada transaksi atau aktivitas keuangan baru (INSERT, UPDATE, DELETE),
-- database akan secara otomatis membuat dan menyinkronkan baris Jurnal Umum (journal_entries & journal_lines).

-- 1. FUNGSI DAN TRIGGER UNTUK AKTIVITAS KEUANGAN (financial_activities)
CREATE OR REPLACE FUNCTION sync_financial_activity_to_journal_fn()
RETURNS TRIGGER AS $$
DECLARE
    entry_id VARCHAR(50);
    id_kas VARCHAR(50);
    id_modal VARCHAR(50);
    id_peralatan VARCHAR(50);
    id_prive VARCHAR(50);
    id_beban VARCHAR(50);
    type_label VARCHAR(100);
BEGIN
    -- Selalu hapus jurnal lama yang terkait dengan aktivitas ini (jika ada)
    DELETE FROM journal_entries WHERE "sourceType" = 'FINANCIAL_ACTIVITY' AND "sourceId" = COALESCE(OLD.id, NEW.id);

    -- Jika operasi adalah DELETE atau jumlah <= 0, selesai sampai di sini
    IF (TG_OP = 'DELETE') OR (NEW.amount <= 0) THEN
        IF (TG_OP = 'DELETE') THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    -- Ambil ID Akun berdasarkan Kode Akun standar
    SELECT id INTO id_kas FROM accounts WHERE code = '101';
    SELECT id INTO id_modal FROM accounts WHERE code = '301';
    SELECT id INTO id_peralatan FROM accounts WHERE code = '103';
    SELECT id INTO id_prive FROM accounts WHERE code = '302';
    SELECT id INTO id_beban FROM accounts WHERE code = '501';

    -- Tentukan label keterangan berdasarkan jenis aktivitas
    IF NEW.type = 'MODAL_AWAL' THEN
        type_label := 'Setoran Modal Awal';
    ELSIF NEW.type = 'PEMBELIAN_ASET' THEN
        type_label := 'Pembelian Aset/Peralatan';
    ELSIF NEW.type = 'PRIVE' THEN
        type_label := 'Pengambilan Pribadi (Prive)';
    ELSE
        type_label := 'Pembayaran Beban Operasional';
    END IF;

    -- Buat ID acak untuk JournalEntry (mensimulasikan CUID di level database)
    entry_id := 'trg_act_' || substring(md5(random()::text) from 1 for 25);

    -- Insert ke journal_entries
    INSERT INTO journal_entries (id, code, date, description, "sourceType", "sourceId", "createdAt", "updatedAt")
    VALUES (
        entry_id, 
        'JRN-' || NEW.code, 
        NEW.date, 
        type_label || ' - ' || NEW.description, 
        'FINANCIAL_ACTIVITY', 
        NEW.id, 
        NOW(), 
        NOW()
    );

    -- Insert ke journal_lines (Double Entry / Berpasangan)
    IF NEW.type = 'MODAL_AWAL' THEN
        -- Debet Kas (101), Kredit Modal (301)
        INSERT INTO journal_lines (id, "journalEntryId", "accountId", debit, credit)
        VALUES 
            ('line_d_' || substring(md5(random()::text) from 1 for 25), entry_id, id_kas, NEW.amount, 0),
            ('line_c_' || substring(md5(random()::text) from 1 for 25), entry_id, id_modal, 0, NEW.amount);
            
    ELSIF NEW.type = 'PEMBELIAN_ASET' THEN
        -- Debet Peralatan (103), Kredit Kas (101)
        INSERT INTO journal_lines (id, "journalEntryId", "accountId", debit, credit)
        VALUES 
            ('line_d_' || substring(md5(random()::text) from 1 for 25), entry_id, id_peralatan, NEW.amount, 0),
            ('line_c_' || substring(md5(random()::text) from 1 for 25), entry_id, id_kas, 0, NEW.amount);
            
    ELSIF NEW.type = 'PRIVE' THEN
        -- Debet Prive (302), Kredit Kas (101)
        INSERT INTO journal_lines (id, "journalEntryId", "accountId", debit, credit)
        VALUES 
            ('line_d_' || substring(md5(random()::text) from 1 for 25), entry_id, id_prive, NEW.amount, 0),
            ('line_c_' || substring(md5(random()::text) from 1 for 25), entry_id, id_kas, 0, NEW.amount);
            
    ELSE -- BEBAN_OPERASIONAL
        -- Debet Beban (501), Kredit Kas (101)
        INSERT INTO journal_lines (id, "journalEntryId", "accountId", debit, credit)
        VALUES 
            ('line_d_' || substring(md5(random()::text) from 1 for 25), entry_id, id_beban, NEW.amount, 0),
            ('line_c_' || substring(md5(random()::text) from 1 for 25), entry_id, id_kas, 0, NEW.amount);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pasang Trigger untuk financial_activities
DROP TRIGGER IF EXISTS trg_financial_activity_journal ON financial_activities;
CREATE TRIGGER trg_financial_activity_journal
AFTER INSERT OR UPDATE OR DELETE ON financial_activities
FOR EACH ROW
EXECUTE FUNCTION sync_financial_activity_to_journal_fn();


-- 2. FUNGSI MODULAR UNTUK SINKRONISASI TRANSAKSI (transactions)
-- Dibuat modular agar bisa dipicu baik dari tabel transactions maupun dari perubahan item obat di transaction_medicines
CREATE OR REPLACE FUNCTION sync_transaction_to_journal_by_id_fn(trx_id VARCHAR)
RETURNS VOID AS $$
DECLARE
    trx_rec RECORD;
    entry_id VARCHAR(50);
    id_kas VARCHAR(50);
    id_piutang VARCHAR(50);
    id_rev_layanan VARCHAR(50);
    id_rev_obat VARCHAR(50);
    id_rev_lain VARCHAR(50);
    svc_price DECIMAL(12,2) := 0;
    meds_price DECIMAL(12,2) := 0;
    other_price DECIMAL(12,2) := 0;
    svc_name VARCHAR(100);
BEGIN
    -- Hapus jurnal lama terkait transaksi ini
    DELETE FROM journal_entries WHERE "sourceType" = 'TRANSACTION' AND "sourceId" = trx_id;

    -- Ambil data transaksi
    SELECT * INTO trx_rec FROM transactions WHERE id = trx_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Jika transaksi BATAL atau jumlah <= 0, selesai (tidak ada jurnal)
    IF (trx_rec.status = 'BATAL') OR (trx_rec.amount <= 0) THEN
        RETURN;
    END IF;

    -- Ambil harga dan nama layanan
    SELECT price, name INTO svc_price, svc_name FROM services WHERE id = trx_rec."serviceId";
    IF NOT FOUND THEN
        svc_price := 0;
        svc_name := 'Layanan Medis';
    END IF;

    -- Hitung total harga obat dari tabel relasi transaction_medicines
    SELECT COALESCE(SUM(price * quantity), 0) INTO meds_price 
    FROM transaction_medicines 
    WHERE "transactionId" = trx_id;

    -- Sisa jumlah masuk ke pendapatan lain-lain
    other_price := trx_rec.amount - svc_price - meds_price;
    IF other_price < 0 THEN
        other_price := 0;
    END IF;

    -- Ambil ID Akun berdasarkan Kode Akun standar
    SELECT id INTO id_kas FROM accounts WHERE code = '101';
    SELECT id INTO id_piutang FROM accounts WHERE code = '102';
    SELECT id INTO id_rev_layanan FROM accounts WHERE code = '401';
    SELECT id INTO id_rev_obat FROM accounts WHERE code = '402';
    SELECT id INTO id_rev_lain FROM accounts WHERE code = '403';

    -- Buat ID acak untuk JournalEntry
    entry_id := 'trg_trx_' || substring(md5(random()::text) from 1 for 25);

    -- Insert ke journal_entries
    INSERT INTO journal_entries (id, code, date, description, "sourceType", "sourceId", "createdAt", "updatedAt")
    VALUES (
        entry_id, 
        'JRN-' || trx_rec.code, 
        trx_rec.date, 
        trx_rec."patientName" || ' - ' || svc_name, 
        'TRANSACTION', 
        trx_rec.id, 
        NOW(), 
        NOW()
    );

    -- Insert ke journal_lines (Debet Kas/Piutang)
    IF trx_rec.status = 'LUNAS' THEN
        INSERT INTO journal_lines (id, "journalEntryId", "accountId", debit, credit)
        VALUES ('line_d_' || substring(md5(random()::text) from 1 for 25), entry_id, id_kas, trx_rec.amount, 0);
    ELSE -- BELUM_LUNAS
        INSERT INTO journal_lines (id, "journalEntryId", "accountId", debit, credit)
        VALUES ('line_d_' || substring(md5(random()::text) from 1 for 25), entry_id, id_piutang, trx_rec.amount, 0);
    END IF;

    -- Insert ke journal_lines (Kredit Pendapatan)
    IF svc_price > 0 THEN
        INSERT INTO journal_lines (id, "journalEntryId", "accountId", debit, credit)
        VALUES ('line_c1_' || substring(md5(random()::text) from 1 for 25), entry_id, id_rev_layanan, 0, svc_price);
    END IF;

    IF meds_price > 0 THEN
        INSERT INTO journal_lines (id, "journalEntryId", "accountId", debit, credit)
        VALUES ('line_c2_' || substring(md5(random()::text) from 1 for 25), entry_id, id_rev_obat, 0, meds_price);
    END IF;

    IF other_price > 0 THEN
        INSERT INTO journal_lines (id, "journalEntryId", "accountId", debit, credit)
        VALUES ('line_c3_' || substring(md5(random()::text) from 1 for 25), entry_id, id_rev_lain, 0, other_price);
    END IF;
END;
$$ LANGUAGE plpgsql;


-- 3. TRIGGER UNTUK TABEL transactions
CREATE OR REPLACE FUNCTION sync_transaction_to_journal_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM journal_entries WHERE "sourceType" = 'TRANSACTION' AND "sourceId" = OLD.id;
        RETURN OLD;
    END IF;

    -- Panggil fungsi sinkronisasi modular
    PERFORM sync_transaction_to_journal_by_id_fn(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transaction_journal ON transactions;
CREATE TRIGGER trg_transaction_journal
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION sync_transaction_to_journal_trigger_fn();


-- 4. TRIGGER UNTUK TABEL RELASI transaction_medicines
-- Menjamin sinkronisasi tetap berjalan sempurna saat data obat dalam transaksi ditambahkan, diubah, atau dihapus
CREATE OR REPLACE FUNCTION sync_transaction_meds_to_journal_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
    target_trx_id VARCHAR(50);
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_trx_id := OLD."transactionId";
    ELSE
        target_trx_id := NEW."transactionId";
    END IF;

    -- Panggil sinkronisasi transaksi induk
    PERFORM sync_transaction_to_journal_by_id_fn(target_trx_id);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transaction_meds_journal ON transaction_medicines;
CREATE TRIGGER trg_transaction_meds_journal
AFTER INSERT OR UPDATE OR DELETE ON transaction_medicines
FOR EACH ROW
EXECUTE FUNCTION sync_transaction_meds_to_journal_trigger_fn();
