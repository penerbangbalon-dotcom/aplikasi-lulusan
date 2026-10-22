-- v5: kolom NIS (sama dengan NIPD di Dapodik) pada data lulusan.
-- Aman dijalankan berulang. Data lama tidak berubah (NIS lama kosong sampai diisi/diimpor).
alter table lulusan add column if not exists nis text;
