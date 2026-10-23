-- v8: data lulusan dianggap SUDAH tercetak. Pengambilan ijazah dicatat terpisah (tgl_diambil + penerima).
-- Aman dijalankan berulang. Tidak menghapus data apa pun.
alter table lulusan alter column status set default 'ijazah tercetak';
-- Data lama berstatus 'lulus' dianggap sudah tercetak, tetapi belum diambil.
update lulusan set status='ijazah tercetak' where status='lulus' or status is null;
-- Yang sudah punya tanggal ambil otomatis berstatus 'sudah diambil' (status 'duplikat' tidak diubah).
update lulusan set status='sudah diambil' where tgl_diambil is not null and status='ijazah tercetak';
