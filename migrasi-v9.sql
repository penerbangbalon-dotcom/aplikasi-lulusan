-- v9: kesiswaan (data siswa aktif), register surat (aktif, menerima siswa pindahan, mutasi), dan pendaftaran siswa baru.
-- Aman dijalankan berulang. Tidak mengubah atau menghapus data lulusan, blanko, maupun pengguna.
create table if not exists siswa(
  id serial primary key,
  nis text, nisn text, nik text, nama text not null,
  jk text check (jk in ('L','P')),
  tempat_lahir text, tgl_lahir date, ayah text, ibu text, alamat text, hp text,
  jenjang text check (jenjang in ('Paket A','Paket B','Paket C')),
  kelas text, angkatan int, asal_sekolah text,
  status text not null default 'aktif' check (status in ('aktif','pindah','lulus','nonaktif')),
  tgl_status date, catatan text,
  dibuat timestamptz not null default now(), diubah timestamptz not null default now());
create unique index if not exists siswa_nisn_jenjang_uq on siswa(nisn, lower(coalesce(jenjang,''))) where nisn is not null;
create index if not exists siswa_status_idx on siswa(status);
create index if not exists siswa_nama_idx on siswa(lower(nama));

create table if not exists surat(
  id serial primary key,
  jenis text not null check (jenis in ('aktif','diterima','mutasi')),
  nomor text not null, tahun int not null, urut int, tgl_surat date not null,
  siswa_id int references siswa(id) on delete set null,
  nama text, data jsonb not null default '{}',
  oleh text, dibuat timestamptz not null default now());
create unique index if not exists surat_jenis_nomor_uq on surat(jenis, nomor);
create index if not exists surat_jenis_tahun_idx on surat(jenis, tahun, urut desc);

create table if not exists pendaftar(
  id serial primary key, no_daftar text unique,
  jenis text not null default 'baru' check (jenis in ('baru','pindahan')),
  nama text not null, nik text, nisn text,
  jk text check (jk in ('L','P')),
  tempat_lahir text, tgl_lahir date, ayah text, ibu text, alamat text, hp text, asal_sekolah text,
  jenjang text check (jenjang in ('Paket A','Paket B','Paket C')),
  tahun_ajaran text,
  status text not null default 'baru' check (status in ('baru','diverifikasi','diterima','ditolak')),
  catatan text, siswa_id int references siswa(id) on delete set null, ip text,
  dibuat timestamptz not null default now(), diubah timestamptz not null default now());
create index if not exists pendaftar_status_idx on pendaftar(status, dibuat desc);

-- Blokir akses lewat API publik Supabase (anon key). Aplikasi tetap bisa mengakses lewat koneksi database.
alter table siswa enable row level security;
alter table surat enable row level security;
alter table pendaftar enable row level security;
