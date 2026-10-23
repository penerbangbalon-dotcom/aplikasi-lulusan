# Data Lulusan dan Kendali Blanko
1. Buat database PostgreSQL gratis (Neon atau Supabase), jalankan isi schema.sql. Jika sudah memakai versi sebelumnya (v1 sampai v3), cukup jalankan migrasi-v4.sql (tabel pengguna, peran, dan pengaturan lembaga).
2. Push folder ini ke GitHub, impor ke Vercel.
3. Environment Variables di Vercel: DATABASE_URL, SECRET (teks acak panjang), ADMIN_PASSWORD, OPERATOR_PASSWORD.
4. Laporan (menu Laporan): isi Identitas lembaga dulu (nama, kota, alamat, provinsi, rayon, kode satuan pendidikan, kepala). Laporan "Kendali blanko ijazah" berorientasi landscape, lalu Unduh Word (.doc) atau Cetak atau simpan PDF.
5. Impor CSV: baris pertama berisi nama kolom (nama, nisn, nik, tempat_lahir, tgl_lahir, ortu, jenjang, jurusan, tahun_lulus, no_ijazah, status). Aturan lengkap ada di bagian Versi 4.2.
6. Login siswa: pilih tahun lulusan, isi nama lengkap persis seperti di data, kata sandi = tanggal lahir (17082008, 17-08-2008, atau 2008-08-17). Siswa hanya melihat datanya sendiri. Tanggal lahir di data lulusan wajib terisi.
7. Jika database menumpang di proyek Supabase yang sudah dipakai aplikasi lain: pastikan nama tabel lulusan, blanko, blanko_log, login_gagal belum ada. schema.sql sudah memuat pengaman RLS (keamanan.sql). Untuk proyek yang sudah menjalankan schema.sql lama, jalankan keamanan.sql saja.

## Versi 4: pengguna, peran, dan cetak
8. Masuk pertama kali sebagai admin dengan username dikosongkan dan kata sandi = ADMIN_PASSWORD. Buka menu Pengguna & Peran untuk membuat pengguna. Kata sandi ADMIN_PASSWORD dan OPERATOR_PASSWORD tetap berfungsi sebagai akun cadangan (username dikosongkan), jadi Anda tidak terkunci jika lupa kata sandi pengguna.
9. Peran: Administrator (bawaan, selalu semua hak akses) dan Operator (bawaan, dapat diubah). Anda dapat membuat peran baru dan mencentang hak akses: lihat/ubah/hapus lulusan, lihat/pakai/stok/status blanko, laporan, identitas lembaga, kelola pengguna. Perubahan peran langsung berlaku tanpa pengguna perlu masuk ulang. Server memeriksa hak akses pada setiap permintaan, bukan hanya menyembunyikan tombol.
10. Pengguna dapat mengganti kata sandi sendiri lewat menu Ganti Kata Sandi (minimal 8 karakter). Admin dapat mengatur ulang kata sandi pengguna lewat tombol Ubah.
11. Halaman siswa kini sama dengan halaman Detail Lulusan (hanya baca). Menu Cetak tersedia di halaman siswa, detail lulusan (admin), dan Laporan: Cetak PDF (jendela cetak peramban, pilih Simpan sebagai PDF) atau Simpan JPG.
12. Identitas lembaga dan logo kini disimpan di server (sebelumnya di peramban admin) supaya muncul juga di cetakan siswa. Data lama di peramban admin dipindahkan otomatis saat admin yang berhak mengubah lembaga masuk pertama kali.
13. Simpan JPG memuat pustaka html2canvas 1.4.1 dari cdn.jsdelivr.net saat dipakai pertama kali, jadi perlu koneksi internet.

## Versi 4.1
14. Jalankan migrasi-v5.sql (menambah kolom NIS) SEBELUM memakai versi ini. NIS = NIPD di Dapodik. Pada impor CSV, kolom bernama nis atau nipd sama-sama masuk ke NIS; kolom peserta_upk (atau upk) masuk ke Nomor Peserta UPK. migrasi-v5.sql juga menambah kolom peserta_upk.
15. (Diganti oleh versi 4.2, lihat di bawah.) Pilihan tahun di login siswa otomatis bertambah.
16. Cetakan siswa kini memuat nama lembaga, logo, dan tanda tangan kepala (dari Identitas lembaga). Jika masih bertuliskan NAMA LEMBAGA, buka login admin, menu Laporan, Identitas lembaga, lalu klik Simpan sekali.
17. Dashboard siswa dikembalikan seperti v3.8 (Beranda, Data Diri, Ijazah, progres ijazah). Tombol Cetak Data di Beranda membuka halaman detail dengan menu Cetak PDF/JPG, dan tombol Kembali kembali ke dashboard.

## Versi 4.2: impor CSV aman, bisa memperbarui, NISN unik per jenjang
18. Jalankan migrasi-v6.sql di database SEBELUM memakai versi ini (aman dijalankan berulang, data lama tidak berubah). Instalasi baru cukup schema.sql.
19. NISN kini unik per jenjang, bukan di seluruh database. Siswa yang lulus Paket B lalu Paket C dapat tercatat dua kali dengan NISN yang sama. Pasangan NISN + jenjang yang sama tetap ditolak. Nomor ijazah tetap unik di seluruh database.
20. Impor CSV kini bertahap: (a) pilih berkas, (b) server memeriksa SEMUA baris dan menampilkan pratinjau (baru, diperbarui, dilewati, salah, peringatan) tanpa menyimpan apa pun, (c) tombol Simpan menyimpan semuanya dalam satu transaksi. Bila ada satu baris salah, tombol Simpan nonaktif dan tidak ada data yang masuk. Server memeriksa ulang saat Simpan, jadi pratinjau tidak bisa dilewati.
21. Dua mode impor. "Lewati data yang sudah ada" (bawaan): baris yang NISN + jenjangnya sudah ada diabaikan. "Perbarui data yang sudah ada": data lama dicocokkan lewat NISN + jenjang lalu diperbarui. Hanya kolom yang terisi di CSV yang menimpa; sel kosong TIDAK menghapus data lama. Pratinjau menampilkan nilai lama dan baru per kolom.
22. Aturan pemeriksaan baris. Salah (memblokir simpan): nama kosong; tanggal tidak valid (misalnya 31-02-2005); jenjang bukan Paket A/B/C; jurusan bukan IPA/IPS; status tidak dikenal; tahun lulus bukan 4 digit; NISN atau NIK rusak oleh Excel (contoh 1.23E+09); jenjang kosong padahal NISN terisi; NISN + jenjang atau nomor ijazah ganda di dalam berkas; nomor ijazah sudah dipakai orang lain; jumlah kolom lebih banyak dari judul. Peringatan (tidak memblokir): NISN bukan 10 digit, NIK bukan 16 digit, baris tanpa NISN (tidak bisa dicocokkan, selalu dihitung baru). Kolom yang judulnya tidak dikenal ditampilkan dan diabaikan.
23. Format tanggal yang diterima: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY (urutan hari-bulan-tahun). Berkas CSV dari Excel (UTF-8 dengan BOM), pemisah koma, titik koma, atau tab, dan sel bertanda kutip yang memuat koma sudah didukung. Maksimal 10.000 baris per berkas (cukup untuk impor banyak tahun sekaligus; bila lebih, pecah per beberapa tahun).

## Versi 4.3: riwayat perubahan, ekspor CSV, batas impor 10.000 baris
24. Jalankan migrasi-v7.sql (tabel lulusan_log) SEBELUM memakai versi ini. Instalasi baru cukup schema.sql. Urutan untuk database lama: migrasi-v6.sql lalu migrasi-v7.sql.
25. Riwayat perubahan data lulusan: setiap tambah, ubah, hapus (manual maupun lewat impor CSV) dicatat bersama nama petugas dan waktunya, dalam transaksi yang sama dengan perubahannya. Rincian ubah memuat nilai lama dan baru per kolom. Rincian hapus menyimpan salinan lengkap data yang dihapus. Dibuka lewat tombol Riwayat di Data Lulusan (semua data) atau di form edit (satu data).
26. Hak akses baru: "Melihat riwayat perubahan data lulusan" (riwayat.lihat). Administrator otomatis memilikinya. Peran lain, termasuk Operator bawaan, TIDAK memilikinya sampai dicentang di menu Pengguna & Peran.
27. Batasan riwayat: perubahan sebelum v7 tidak tercatat. Login dengan kata sandi bawaan (ADMIN_PASSWORD atau OPERATOR_PASSWORD) hanya tercatat sebagai "admin" atau "operator", jadi untuk melacak orangnya buatlah pengguna sendiri di menu Pengguna & Peran. Pemakaian blanko tetap tercatat di riwayat blanko, bukan di riwayat lulusan.
28. Ekspor CSV (tombol di Data Lulusan): mengunduh seluruh data lulusan, memakai pemisah titik koma dan UTF-8, sehingga langsung terbuka benar di Excel Indonesia. Kolomnya sama dengan format impor: berkas bisa diedit lalu diimpor lagi dengan mode "Perbarui". Ekspor BUKAN cadangan lengkap (tidak memuat blanko, riwayat, dan pengguna). Lihat PANDUAN-CADANGAN.md.
29. Impor CSV: batas naik menjadi 10.000 baris per berkas. Pratinjau menampilkan paling banyak 3.000 baris (baris salah didahulukan), tetapi SEMUA baris tetap diperiksa dan disimpan. NISN yang kehilangan angka 0 di depan akibat Excel (12345678 menjadi 0012345678) dilengkapi otomatis, termasuk saat mencocokkan dengan data lama.

## Versi 4.5: tampilan dashboard, pencarian nama, privasi siswa
- Kartu "Lulusan per Jenjang" kini setinggi kartu Data Lembaga dan Perkembangan Kelulusan. Tiap jenjang menampilkan jumlah dan persentase dari total.
- Data Lulusan: kolom pencarian nama di bagian atas. Bawaannya mencari di nama saja (beberapa kata, urutan bebas, misalnya "santoso budi"). Pilih "Cari juga NIS, NISN, NIK, no. ijazah, dll." untuk mencari di semua kolom seperti sebelumnya. Tidak perlu migrasi database.
- Login siswa: NIK, Tanggal Diambil, dan Nama Penerima tidak lagi tampil di Data Diri, Ijazah, detail, maupun hasil cetak (PDF/JPG). Data ini juga tidak lagi dikirim oleh api/saya.js, jadi tidak bisa dilihat lewat inspeksi peramban. Tampilan admin tidak berubah.

## Versi 4.6: data lulusan dianggap sudah tercetak, pengambilan dicatat terpisah
- Jalankan migrasi-v8.sql SEBELUM memakai versi ini (aman dijalankan berulang). Data berstatus "lulus" menjadi "ijazah tercetak", dan yang sudah punya tanggal diambil menjadi "sudah diambil". Instalasi baru cukup schema.sql.
- Lulusan baru (manual maupun impor CSV) otomatis berstatus "ijazah tercetak", tanpa perlu memakai blanko. Bila tanggal diambil terisi (di form atau kolom tgl_diambil pada CSV), statusnya otomatis "sudah diambil".
- Kartu Perkembangan Kelulusan: "Ijazah Tercetak" = tercetak + sudah diambil; "Belum Pegang Blanko" diganti "Belum Diambil". Persentase = sudah diambil dari total lulusan.
- Data Lulusan: tombol "Tandai diambil" per lulusan (tanggal dan nama pengambil, bisa diwakilkan), "Batal diambil", dan "Tandai semua yang tampil diambil" untuk satu gelombang (atur filter dulu). Semua tercatat di riwayat perubahan. Filter status "belum diambil" sama dengan status ijazah tercetak.
- Modul blanko menjadi opsional: ijazah lama tidak wajib punya catatan nomor blanko, dan dashboard tidak lagi menampilkan kekurangan stok untuk data historis.
- Revisi 4.6: dua tombol di Data Lulusan. "Tandai semua diambil" (semua yang tampil sesuai filter) dan "Tandai satu per satu" (mode centang: centang lulusan yang sudah mengambil, lalu "Tandai terpilih diambil"). Nomor ijazah memakai kolom no_ijazah dari data yang diunggah, sehingga format berbeda tiap tahun tidak masalah. Tampilan daftar dan detail lulusan tidak lagi memakai nomor seri blanko.
