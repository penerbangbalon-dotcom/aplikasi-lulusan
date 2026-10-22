-- v5: kolom NIS (= NIPD di Dapodik) dan Peserta UPK pada data lulusan.
-- Aman dijalankan berulang. Data lama tidak berubah (kolom baru kosong sampai diisi/diimpor).
alter table lulusan add column if not exists nis text;
alter table lulusan add column if not exists peserta_upk text;
