-- Blokir akses lewat API publik Supabase (anon key). Aplikasi tetap bisa mengakses lewat koneksi database.
alter table lulusan enable row level security;
alter table blanko enable row level security;
alter table blanko_log enable row level security;
alter table login_gagal enable row level security;
