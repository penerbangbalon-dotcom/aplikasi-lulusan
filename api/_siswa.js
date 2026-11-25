// Pembersihan dan validasi data siswa/pendaftar (dipakai siswa.js dan ppdb.js).
const { err } = require('./_lib');
const { tgl } = require('./_impor');
const JENJANG = ['Paket A', 'Paket B', 'Paket C'];
const STATUS = ['aktif', 'pindah', 'lulus', 'nonaktif'];
const SD = { SD: 'Paket A', SMP: 'Paket B', SMA: 'Paket C', SMK: 'Paket C', MI: 'Paket A', MTS: 'Paket B', MA: 'Paket C' };
const pad10 = v => /^\d{1,9}$/.test(v) ? v.padStart(10, '0') : v;

// Nama kolom alternatif (huruf kecil, spasi jadi _) -> nama kolom di database. Mencakup hasil unduhan aplikasi absensi.
const ALIAS = { nipd: 'nis', no_hp: 'hp', nomor_hp: 'hp', telepon: 'hp', no_telp: 'hp', tanggal_lahir: 'tgl_lahir', 'tempat,_tanggal_lahir': '',
  nama_ayah: 'ayah', nama_ibu: 'ibu', nama_lengkap: 'nama', jenis_kelamin: 'jk', program: 'program', tahun_masuk: 'angkatan', asal: 'asal_sekolah' };
const KOLOM = ['nis', 'nisn', 'nik', 'nama', 'jk', 'tempat_lahir', 'tgl_lahir', 'ayah', 'ibu', 'alamat', 'hp', 'jenjang', 'kelas', 'angkatan', 'asal_sekolah', 'status', 'tgl_status', 'catatan'];

const t = v => { v = v == null ? '' : String(v).trim().replace(/\s+/g, ' '); return v === '' ? null : v; };

// Ubah satu baris mentah menjadi objek siswa. Mengembalikan { v, galat:[], peringatan:[] }.
exports.bersih = (mentah, { wajibNama = true } = {}) => {
  const o = {}, galat = [], peringatan = [];
  for (const [k0, val] of Object.entries(mentah || {})) {
    if (k0.startsWith('_')) continue;
    let k = String(k0).trim().toLowerCase().replace(/\s+/g, '_'); if (k in ALIAS) k = ALIAS[k]; if (k) o[k] = val;
  }
  const v = {};
  for (const k of KOLOM) v[k] = t(o[k]);
  if (wajibNama && !v.nama) galat.push('Nama wajib diisi');
  if (v.nis && /^\d+[.,]\d+$|e[+-]?\d/i.test(v.nis)) galat.push('NIS rusak oleh Excel (angka panjang berubah format)');
  if (v.nisn) { if (/e[+-]?\d/i.test(v.nisn) || /^\d+[.,]\d+$/.test(v.nisn)) galat.push('NISN rusak oleh Excel (angka panjang berubah format)'); else { v.nisn = pad10(v.nisn); if (!/^\d{10}$/.test(v.nisn)) peringatan.push('NISN bukan 10 digit angka'); } }
  if (v.nik) { if (/e[+-]?\d/i.test(v.nik)) galat.push('NIK rusak oleh Excel'); else if (!/^\d{16}$/.test(v.nik)) peringatan.push('NIK bukan 16 digit angka'); }
  if (v.jk) { const j = v.jk.toLowerCase(); v.jk = /^(l|laki|pria)/.test(j) ? 'L' : /^(p|perempuan|wanita)/.test(j) ? 'P' : (galat.push('Jenis kelamin harus L atau P'), null); }
  // jenjang: terima "Paket B", atau jenjang SD/SMP/SMA; kolom program (Paket B/Paket C/Umum) didahulukan
  const prog = t(o.program);
  let jen = v.jenjang;
  if (prog && /paket\s*[abc]/i.test(prog)) jen = 'Paket ' + prog.match(/paket\s*([abc])/i)[1].toUpperCase();
  else if (!jen && prog && /umum/i.test(prog)) jen = null;
  if (jen) { const m = JENJANG.find(x => x.toLowerCase() === jen.toLowerCase()) || SD[jen.toUpperCase()]; if (m) jen = m; else { galat.push('Jenjang tidak dikenal: ' + jen); jen = null; } }
  else if (t(o.jenjang_sekolah)) jen = SD[String(o.jenjang_sekolah).toUpperCase()] || null;
  v.jenjang = jen;
  if (v.status) { const s = v.status.toLowerCase(); v.status = STATUS.includes(s) ? s : s == 'non aktif' || s == 'tidak aktif' ? 'nonaktif' : s == 'keluar' || s == 'mutasi' ? 'pindah' : (galat.push('Status tidak dikenal: ' + v.status), null); }
  if (v.tgl_lahir) { const d = tgl(v.tgl_lahir); if (d) v.tgl_lahir = d; else { galat.push('Tanggal lahir tidak valid (pakai DD-MM-YYYY atau YYYY-MM-DD)'); v.tgl_lahir = null; } }
  if (v.tgl_status) { const d = tgl(v.tgl_status); if (d) v.tgl_status = d; else { galat.push('Tanggal status tidak valid'); v.tgl_status = null; } }
  if (v.angkatan) { const a = +v.angkatan; if (Number.isInteger(a) && a >= 1990 && a <= 2100) v.angkatan = a; else { galat.push('Angkatan tidak valid'); v.angkatan = null; } }
  for (const k of ['nama', 'tempat_lahir', 'ayah', 'ibu', 'asal_sekolah', 'kelas']) if (v[k] && v[k].length > 150) galat.push(k + ' terlalu panjang');
  if (v.alamat && v.alamat.length > 400) galat.push('Alamat terlalu panjang');
  if (v.catatan && v.catatan.length > 400) galat.push('Catatan terlalu panjang');
  return { v, galat, peringatan };
};
exports.KOLOM = KOLOM; exports.JENJANG = JENJANG; exports.STATUS = STATUS; exports.t = t;
