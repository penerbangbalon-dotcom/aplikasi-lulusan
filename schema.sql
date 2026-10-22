create table blanko(
 id serial primary key, no_seri text unique not null,
 status text not null default 'tersedia' check (status in ('tersedia','terpakai','rusak','hilang','dikembalikan')),
 keterangan text, diubah timestamptz default now());
create table lulusan(
 id serial primary key, nis text, nisn text, peserta_upk text, nik text, nama text not null, tempat_lahir text, tgl_lahir date, ortu text,
 jenjang text, jurusan text, tahun_lulus int, no_ijazah text unique,
 blanko_id int unique references blanko(id), tgl_terbit date, tgl_diambil date, penerima text,
 status text default 'lulus', catatan text, dibuat timestamptz default now());
create table blanko_log(
 id serial primary key, blanko_id int references blanko(id), aksi text, detail text, oleh text, waktu timestamptz default now());
create index on lulusan(tahun_lulus);
create unique index lulusan_nisn_jenjang_uq on lulusan(nisn, lower(coalesce(jenjang,''))) where nisn is not null;
create table login_gagal(ip text, waktu timestamptz default now());
create index on login_gagal(ip, waktu);
-- Blokir akses lewat API publik Supabase (anon key). Aplikasi tetap bisa mengakses lewat koneksi database.
alter table lulusan enable row level security;
alter table blanko enable row level security;
alter table blanko_log enable row level security;
alter table login_gagal enable row level security;
-- v4: pengguna, peran, pengaturan
create table peran(
 id serial primary key, nama text unique not null, keterangan text,
 izin text[] not null default '{}', sistem boolean not null default false, dibuat timestamptz default now());
create table pengguna(
 id serial primary key, username text unique not null, nama text not null, sandi text not null,
 peran_id int not null references peran(id), aktif boolean not null default true, dibuat timestamptz default now());
create table pengaturan(kunci text primary key, nilai text);
insert into peran(nama,keterangan,izin,sistem) values
 ('Administrator','Semua hak akses, termasuk kelola pengguna','{}',true),
 ('Operator','Input data lulusan, pakai blanko, dan laporan','{lulusan.lihat,lulusan.ubah,blanko.lihat,blanko.pakai,laporan.lihat}',false);
alter table peran enable row level security;
alter table pengguna enable row level security;
alter table pengaturan enable row level security;
create table lulusan_log(
  id bigserial primary key, lulusan_id int,
  aksi text not null check (aksi in ('tambah','ubah','hapus','impor-tambah','impor-ubah')),
  nama text, nisn text, jenjang text, detail jsonb, oleh text, waktu timestamptz not null default now());
create index on lulusan_log(lulusan_id, id desc);
create index on lulusan_log(id desc);
alter table lulusan_log enable row level security;
