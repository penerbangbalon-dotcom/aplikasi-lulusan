-- v7: riwayat perubahan data lulusan (siapa mengubah apa dan kapan).
-- Aman dijalankan berulang. Tidak mengubah data yang sudah ada.
-- lulusan_id sengaja TANPA foreign key supaya riwayat tetap ada setelah data lulusan dihapus.
create table if not exists lulusan_log(
  id bigserial primary key,
  lulusan_id int,
  aksi text not null check (aksi in ('tambah','ubah','hapus','impor-tambah','impor-ubah')),
  nama text, nisn text, jenjang text,
  detail jsonb,            -- ubah: {perubahan:[{k,lama,baru}]}; hapus: {salinan:{...seluruh data...}}
  oleh text,               -- "Nama (username)", atau admin/operator untuk kata sandi bawaan
  waktu timestamptz not null default now());
create index if not exists lulusan_log_lulusan on lulusan_log(lulusan_id, id desc);
create index if not exists lulusan_log_waktu on lulusan_log(id desc);
-- Blokir akses lewat API publik Supabase (anon key). Aplikasi tetap bisa mengakses lewat koneksi database.
alter table lulusan_log enable row level security;
