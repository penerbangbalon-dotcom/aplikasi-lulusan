create table login_gagal(ip text, waktu timestamptz default now());
create index on login_gagal(ip, waktu);
