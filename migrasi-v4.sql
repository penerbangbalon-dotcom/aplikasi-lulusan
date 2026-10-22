-- v4: pengguna + peran (hak akses dapat diatur) + pengaturan lembaga di server.
-- Aman dijalankan pada database v1/v2/v3 yang sudah ada.
create table if not exists peran(
 id serial primary key, nama text unique not null, keterangan text,
 izin text[] not null default '{}', sistem boolean not null default false, dibuat timestamptz default now());
create table if not exists pengguna(
 id serial primary key, username text unique not null, nama text not null, sandi text not null,
 peran_id int not null references peran(id), aktif boolean not null default true, dibuat timestamptz default now());
create table if not exists pengaturan(kunci text primary key, nilai text);
-- Administrator selalu memiliki semua hak akses (kolom izin diabaikan, tidak dapat diubah atau dihapus).
insert into peran(nama,keterangan,izin,sistem) values
 ('Administrator','Semua hak akses, termasuk kelola pengguna','{}',true),
 ('Operator','Input data lulusan, pakai blanko, dan laporan','{lulusan.lihat,lulusan.ubah,blanko.lihat,blanko.pakai,laporan.lihat}',false)
on conflict (nama) do nothing;
alter table peran enable row level security;
alter table pengguna enable row level security;
alter table pengaturan enable row level security;
