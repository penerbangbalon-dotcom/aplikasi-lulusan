create table blanko(
 id serial primary key, no_seri text unique not null,
 status text not null default 'tersedia' check (status in ('tersedia','terpakai','rusak','hilang','dikembalikan')),
 keterangan text, diubah timestamptz default now());
create table lulusan(
 id serial primary key, nisn text unique, nik text, nama text not null, tempat_lahir text, tgl_lahir date, ortu text,
 jenjang text, jurusan text, tahun_lulus int, no_ijazah text unique,
 blanko_id int unique references blanko(id), tgl_terbit date, tgl_diambil date, penerima text,
 status text default 'lulus', catatan text, dibuat timestamptz default now());
create table blanko_log(
 id serial primary key, blanko_id int references blanko(id), aksi text, detail text, oleh text, waktu timestamptz default now());
create index on lulusan(tahun_lulus);
create table login_gagal(ip text, waktu timestamptz default now());
create index on login_gagal(ip, waktu);
-- Blokir akses lewat API publik Supabase (anon key). Aplikasi tetap bisa mengakses lewat koneksi database.
alter table lulusan enable row level security;
alter table blanko enable row level security;
alter table blanko_log enable row level security;
alter table login_gagal enable row level security;
