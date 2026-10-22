# Data Lulusan dan Kendali Blanko
1. Buat database PostgreSQL gratis (Neon atau Supabase), jalankan isi schema.sql. Jika sudah memakai v1 atau v2, cukup jalankan migrasi-v3.sql.
2. Push folder ini ke GitHub, impor ke Vercel.
3. Environment Variables di Vercel: DATABASE_URL, SECRET (teks acak panjang), ADMIN_PASSWORD, OPERATOR_PASSWORD.
4. Laporan (menu Laporan): isi Identitas lembaga dulu, lalu Unduh Word (.doc) atau Cetak atau simpan PDF.
5. Impor CSV: baris pertama berisi nama kolom (nama, nisn, nik, tempat_lahir, tgl_lahir, ortu, jenjang, jurusan, tahun_lulus, no_ijazah, status), tanggal format YYYY-MM-DD.
6. Login siswa: pilih tahun lulusan, isi nama lengkap persis seperti di data, kata sandi = tanggal lahir (17082008, 17-08-2008, atau 2008-08-17). Siswa hanya melihat datanya sendiri. Tanggal lahir di data lulusan wajib terisi.
7. Jika database menumpang di proyek Supabase yang sudah dipakai aplikasi lain: pastikan nama tabel lulusan, blanko, blanko_log, login_gagal belum ada. schema.sql sudah memuat pengaman RLS (keamanan.sql). Untuk proyek yang sudah menjalankan schema.sql lama, jalankan keamanan.sql saja.
