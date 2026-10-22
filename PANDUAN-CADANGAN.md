# Panduan cadangan data

Data lulusan adalah data yang tidak boleh hilang. Gunakan minimal dua lapis di bawah ini.

## Lapis 1: cadangan otomatis Supabase (cek paket Anda)
Buka Dashboard Supabase, pilih proyek, lalu Database > Backups.
- Paket Pro: cadangan harian, disimpan 7 hari, bisa dipulihkan dari Dashboard.
- Paket Free: tidak ada cadangan yang bisa Anda pulihkan sendiri. Dokumentasi Supabase menyarankan proyek Free rutin mengekspor data dan menyimpannya di luar Supabase (lapis 2 dan 3 di bawah menjawab ini).
- Proyek Free juga dijeda otomatis bila lama tidak dipakai (sekitar satu minggu). Data tidak hilang, tetapi aplikasi tidak bisa dibuka sampai proyek diaktifkan kembali lewat Dashboard. Hal ini penting karena aplikasi ini sering sepi di luar musim kelulusan.
- Periksa kebijakan terbaru di https://supabase.com/docs/guides/platform/backups karena paket dan batasnya bisa berubah.

## Lapis 2: ekspor CSV dari aplikasi (mudah, tanpa alat tambahan)
Masuk sebagai pengguna yang berhak, buka Data Lulusan, klik Ekspor CSV. Nama berkas otomatis memuat tanggal.
- Kapan: setiap selesai impor besar atau koreksi massal, dan minimal sebulan sekali (sekali seminggu saat musim kelulusan).
- Simpan di dua tempat berbeda (misalnya Google Drive dan flashdisk). Jangan menimpa berkas lama.
- Ekspor memuat data lulusan saja. TIDAK memuat stok dan riwayat blanko, hubungan lulusan dengan blanko, riwayat perubahan, dan pengguna.
- Memulihkan dari CSV: kosongkan tabel hanya bila perlu, lalu Impor CSV. Hubungan lulusan dengan nomor seri blanko harus ditata ulang.

## Lapis 3: cadangan penuh dengan pg_dump (disarankan sebulan sekali)
Memuat semua tabel. Perlu PostgreSQL client terpasang di komputer.
1. Di Supabase: Project Settings > Database > Connection string. Pakai Direct connection atau Session pooler (port 5432). Bila perintah gagal dengan Transaction pooler (port 6543), ganti ke yang itu.
2. Jalankan (ganti teks dalam kurung dengan connection string Anda, lengkap dengan kata sandi):

       pg_dump "[CONNECTION_STRING]" --no-owner --no-privileges -F c -f cadangan-2026-10-22.dump

   Alternatif memakai Supabase CLI:

       supabase db dump --db-url "[CONNECTION_STRING]" -f cadangan-2026-10-22.sql

3. Simpan berkasnya di tempat aman dan jangan dibagikan: isinya data pribadi siswa dan kata sandi pengguna dalam bentuk hash.
4. Pemulihan ke database baru:

       pg_restore --no-owner --no-privileges -d "[CONNECTION_STRING_BARU]" cadangan-2026-10-22.dump

## Uji pemulihan
Cadangan yang belum pernah diuji dipulihkan belum bisa disebut cadangan. Sekali setahun, pulihkan berkas terbaru ke proyek Supabase kosong dan periksa jumlah data lulusan sama dengan aslinya.
