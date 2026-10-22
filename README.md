# Data Lulusan dan Kendali Blanko
1. Buat database PostgreSQL gratis (Neon atau Supabase), jalankan isi schema.sql. Jika sudah memakai versi sebelumnya (v1 sampai v3), cukup jalankan migrasi-v4.sql (tabel pengguna, peran, dan pengaturan lembaga).
2. Push folder ini ke GitHub, impor ke Vercel.
3. Environment Variables di Vercel: DATABASE_URL, SECRET (teks acak panjang), ADMIN_PASSWORD, OPERATOR_PASSWORD.
4. Laporan (menu Laporan): isi Identitas lembaga dulu (nama, kota, alamat, provinsi, rayon, kode satuan pendidikan, kepala). Laporan "Kendali blanko ijazah" berorientasi landscape, lalu Unduh Word (.doc) atau Cetak atau simpan PDF.
5. Impor CSV: baris pertama berisi nama kolom (nama, nisn, nik, tempat_lahir, tgl_lahir, ortu, jenjang, jurusan, tahun_lulus, no_ijazah, status), tanggal format YYYY-MM-DD.
6. Login siswa: pilih tahun lulusan, isi nama lengkap persis seperti di data, kata sandi = tanggal lahir (17082008, 17-08-2008, atau 2008-08-17). Siswa hanya melihat datanya sendiri. Tanggal lahir di data lulusan wajib terisi.
7. Jika database menumpang di proyek Supabase yang sudah dipakai aplikasi lain: pastikan nama tabel lulusan, blanko, blanko_log, login_gagal belum ada. schema.sql sudah memuat pengaman RLS (keamanan.sql). Untuk proyek yang sudah menjalankan schema.sql lama, jalankan keamanan.sql saja.

## Versi 4: pengguna, peran, dan cetak
8. Masuk pertama kali sebagai admin dengan username dikosongkan dan kata sandi = ADMIN_PASSWORD. Buka menu Pengguna & Peran untuk membuat pengguna. Kata sandi ADMIN_PASSWORD dan OPERATOR_PASSWORD tetap berfungsi sebagai akun cadangan (username dikosongkan), jadi Anda tidak terkunci jika lupa kata sandi pengguna.
9. Peran: Administrator (bawaan, selalu semua hak akses) dan Operator (bawaan, dapat diubah). Anda dapat membuat peran baru dan mencentang hak akses: lihat/ubah/hapus lulusan, lihat/pakai/stok/status blanko, laporan, identitas lembaga, kelola pengguna. Perubahan peran langsung berlaku tanpa pengguna perlu masuk ulang. Server memeriksa hak akses pada setiap permintaan, bukan hanya menyembunyikan tombol.
10. Pengguna dapat mengganti kata sandi sendiri lewat menu Ganti Kata Sandi (minimal 8 karakter). Admin dapat mengatur ulang kata sandi pengguna lewat tombol Ubah.
11. Halaman siswa kini sama dengan halaman Detail Lulusan (hanya baca). Menu Cetak tersedia di halaman siswa, detail lulusan (admin), dan Laporan: Cetak PDF (jendela cetak peramban, pilih Simpan sebagai PDF) atau Simpan JPG.
12. Identitas lembaga dan logo kini disimpan di server (sebelumnya di peramban admin) supaya muncul juga di cetakan siswa. Data lama di peramban admin dipindahkan otomatis saat admin yang berhak mengubah lembaga masuk pertama kali.
13. Simpan JPG memuat pustaka html2canvas 1.4.1 dari cdn.jsdelivr.net saat dipakai pertama kali, jadi perlu koneksi internet.
