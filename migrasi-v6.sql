-- v6: NISN unik per jenjang (bukan di seluruh database).
-- Siswa yang lulus Paket B lalu Paket C dapat memiliki NISN yang sama pada dua jenjang berbeda.
-- Aman dijalankan berulang. Data lama tidak berubah. Tidak akan gagal karena data lama,
-- sebab sebelumnya NISN sudah unik di seluruh database.

-- 1) Buang aturan lama "NISN unik di seluruh tabel" (apa pun nama constraint-nya).
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.lulusan'::regclass
      and c.contype = 'u'
      and (select array_agg(a.attname::text) from pg_attribute a
           where a.attrelid = c.conrelid and a.attnum = any(c.conkey)) = array['nisn']
  loop
    execute format('alter table public.lulusan drop constraint %I', r.conname);
  end loop;
end $$;

-- 2) Aturan baru: pasangan NISN + jenjang harus unik (huruf besar/kecil pada jenjang diabaikan).
--    Baris tanpa NISN tidak dibatasi.
create unique index if not exists lulusan_nisn_jenjang_uq
  on public.lulusan (nisn, lower(coalesce(jenjang, '')))
  where nisn is not null;
