// Impor massal data lulusan: validasi SEMUA baris dulu, lalu (jika diminta) simpan sekaligus.
// Dipanggil dari lulusan.js di dalam satu transaksi. Jika ada baris salah, tidak ada yang disimpan.
const { err } = require('./_lib');
const { catat } = require('./_log');

const F = ['nis','nisn','peserta_upk','nik','nama','tempat_lahir','tgl_lahir','ortu','jenjang','jurusan','tahun_lulus','no_ijazah','tgl_terbit','tgl_diambil','penerima','status','catatan'];
const TGL = ['tgl_lahir', 'tgl_terbit', 'tgl_diambil'], INT = ['tahun_lulus'];
const ALIAS = { nipd: 'nis', upk: 'peserta_upk' };           // nama kolom lain yang dianggap sama
const JENJANG = ['Paket A', 'Paket B', 'Paket C'], JURUSAN = ['IPA', 'IPS'];
const STATUS = ['lulus', 'ijazah tercetak', 'sudah diambil', 'duplikat'];
const MAKS = 10000;        // baris per berkas (batas praktis: isi permintaan Vercel 4,5 MB)
const MAKS_TAMPIL = 3000;  // baris yang dikirim balik untuk pratinjau (semua baris tetap diperiksa dan disimpan)
const pad = x => String(x).padStart(2, '0');

// YYYY-MM-DD atau DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY (urutan Indonesia). Hasil selalu YYYY-MM-DD, atau null bila tidak valid.
function tgl(s) {
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/), y, mo, d;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else return null;
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (y < 1900 || y > 2100 || t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}
const pilih = (v, daftar) => daftar.find(x => x.toLowerCase() === v.toLowerCase());
const rusakExcel = v => /e[+-]?\d/i.test(v) || /^\d+[.,]\d+$/.test(v);   // 1.23E+15 atau 1234.5: hasil Excel merusak angka panjang
// Excel sering membuang angka 0 di depan NISN (0012345678 menjadi 12345678). NISN resmi selalu 10 digit, jadi dilengkapi lagi.
const pad10 = v => /^\d{1,9}$/.test(v) ? v.padStart(10, '0') : v;
const kunci = (nisn, jenjang) => pad10(nisn) + '|' + String(jenjang || '').toLowerCase();

// Rapikan satu baris mentah -> { d: nilai bersih (null jika kosong), galat: [], peringatan: [] }
function periksa(o) {
  const d = {}, galat = [], peringatan = [];
  for (const k of F) {
    let v = o[k];
    if ((v === undefined || v === null || String(v).trim() === '')) { const a = Object.keys(ALIAS).find(x => ALIAS[x] === k); v = a ? o[a] : undefined; }
    v = v === undefined || v === null ? '' : String(v).trim().replace(/^'(?=[=+\-@])/, ''); // apostrof pelindung rumus dari file ekspor
    d[k] = v === '' ? null : v;
  }
  if (d.nama) d.nama = d.nama.replace(/\s+/g, ' ');
  else galat.push('Nama kosong');
  if (o._lebih) galat.push(`Kolom lebih banyak dari judul (${o._lebih} kelebihan). Biasanya ada koma di dalam isi sel yang tidak diberi tanda kutip`);
  if (d.nisn && /^\d{1,9}$/.test(d.nisn)) { const asal = d.nisn; d.nisn = pad10(asal); peringatan.push(`NISN ${asal} hanya ${asal.length} digit: angka 0 di depan ditambahkan otomatis menjadi ${d.nisn}`); }
  for (const k of ['nisn', 'nik']) if (d[k]) {
    if (rusakExcel(d[k])) galat.push(`${k.toUpperCase()} rusak ("${d[k]}"): format kolom di Excel harus Teks`);
    else if (!/^\d+$/.test(d[k])) peringatan.push(`${k.toUpperCase()} berisi bukan angka`);
    else if (d[k].length !== (k == 'nisn' ? 10 : 16)) peringatan.push(`${k.toUpperCase()} bukan ${k == 'nisn' ? 10 : 16} digit (angka 0 di depan hilang?)`);
  }
  if (d.jenjang) { const j = pilih(d.jenjang, JENJANG); if (j) d.jenjang = j; else galat.push(`Jenjang "${d.jenjang}" tidak dikenal (harus Paket A, Paket B, atau Paket C)`); }
  else if (d.nisn) galat.push('Jenjang wajib diisi bila NISN diisi (NISN unik per jenjang)');
  if (d.jurusan) { const j = pilih(d.jurusan, JURUSAN); if (j) d.jurusan = j; else galat.push(`Jurusan "${d.jurusan}" tidak dikenal (harus IPA atau IPS)`); }
  if (d.status) { const s = pilih(d.status, STATUS); if (s) d.status = s.toLowerCase(); else galat.push(`Status "${d.status}" tidak dikenal (${STATUS.join(', ')})`); }
  for (const k of TGL) if (d[k]) { const t = tgl(d[k]); if (t) d[k] = t; else galat.push(`${k} "${d[k]}" bukan tanggal yang valid (pakai YYYY-MM-DD atau DD-MM-YYYY)`); }
  for (const k of INT) if (d[k]) { if (/^\d{4}$/.test(d[k]) && +d[k] >= 1950 && +d[k] <= 2100) d[k] = String(+d[k]); else galat.push(`${k} "${d[k]}" tidak valid (harus tahun 4 digit)`); }
  if (!d.status && d.tgl_diambil) d.status = 'sudah diambil'; // ada tanggal ambil = sudah diambil
  if (!d.nisn) peringatan.push('Tanpa NISN: tidak bisa dicocokkan dengan data lama, selalu dihitung sebagai data baru');
  return { d, galat, peringatan };
}

const tipe = k => TGL.includes(k) ? 'date' : INT.includes(k) ? 'int' : 'text';
const SEL = F.map(k => TGL.includes(k) ? `to_char(${k},'YYYY-MM-DD') ${k}` : INT.includes(k) ? `${k}::text ${k}` : k).join(',');

// c = koneksi yang SUDAH di dalam transaksi (begin). Pemanggil yang melakukan commit/rollback.
async function impor(c, b, oleh) {
  const baris = b.baris, mode = b.mode || 'lewati';
  if (!Array.isArray(baris) || !baris.length) throw err(400, 'Berkas tidak berisi baris data');
  if (baris.length > MAKS) throw err(400, `Terlalu banyak baris (${baris.length}). Maksimal ${MAKS} baris per berkas, silakan pecah berkas (misalnya per beberapa tahun).`);
  if (!['lewati', 'perbarui'].includes(mode)) throw err(400, 'Mode impor tidak valid');

  const hasil = baris.map((o, i) => ({ n: o._baris || i + 2, ...periksa(o || {}) }));
  const dikenal = new Set([...F, ...Object.keys(ALIAS)]);
  const kolomAbaikan = [...new Set(baris.flatMap(o => Object.keys(o || {})).filter(k => !k.startsWith('_') && !dikenal.has(k)))];

  // data lama yang cocok (NISN + jenjang) dan pemilik nomor ijazah, dibaca dengan kunci baris (for update) supaya tidak bertabrakan dengan edit lain
  const nisnList = [...new Set(hasil.flatMap(h => h.d.nisn ? [h.d.nisn, h.d.nisn.replace(/^0+/, '')] : []))]; // juga versi tanpa angka 0 di depan, bila data lama pernah masuk dari Excel
  const ijazahList = [...new Set(hasil.map(h => h.d.no_ijazah).filter(Boolean))];
  const lama = new Map();
  if (nisnList.length) for (const r of (await c.query(`select id,${SEL} from lulusan where nisn = any($1) order by id for update`, [nisnList])).rows) lama.set(kunci(r.nisn, r.jenjang), r);
  const pemilik = new Map();
  if (ijazahList.length) for (const r of (await c.query('select id,nama,no_ijazah from lulusan where no_ijazah = any($1)', [ijazahList])).rows) pemilik.set(r.no_ijazah, r);

  const kunciFile = new Map(), ijazahFile = new Map();
  for (const h of hasil) {
    const { d } = h;
    const kk = d.nisn ? kunci(d.nisn, d.jenjang) : null;
    if (kk) { if (kunciFile.has(kk)) h.galat.push(`NISN + jenjang sama dengan baris ${kunciFile.get(kk)} di berkas ini`); else kunciFile.set(kk, h.n); }
    if (d.no_ijazah) { if (ijazahFile.has(d.no_ijazah)) h.galat.push(`Nomor ijazah sama dengan baris ${ijazahFile.get(d.no_ijazah)} di berkas ini`); else ijazahFile.set(d.no_ijazah, h.n); }
    const ada = kk && lama.get(kk);
    h.perubahan = [];
    if (ada && mode === 'lewati') { h.hasil = h.galat.length ? 'error' : 'lewati'; continue; }
    if (d.no_ijazah) { const p = pemilik.get(d.no_ijazah); if (p && (!ada || p.id !== ada.id)) h.galat.push(`Nomor ijazah "${d.no_ijazah}" sudah dipakai ${p.nama}`); }
    if (h.galat.length) { h.hasil = 'error'; continue; }
    if (!ada) { h.hasil = 'baru'; continue; }
    // mode perbarui: kolom yang kosong di CSV TIDAK menghapus data lama, hanya kolom terisi yang menimpa
    for (const k of F) if (d[k] !== null && String(d[k]) !== String(ada[k] ?? '')) h.perubahan.push({ k, lama: ada[k] ?? null, baru: d[k] });
    h.hasil = h.perubahan.length ? 'perbarui' : 'sama';
    h.id = ada.id; h.gabung = { ...ada, ...Object.fromEntries(h.perubahan.map(p => [p.k, p.baru])) };
  }

  const hitung = x => hasil.filter(h => h.hasil === x).length;
  const ringkasan = { total: hasil.length, baru: hitung('baru'), perbarui: hitung('perbarui'), sama: hitung('sama'), lewati: hitung('lewati'), error: hitung('error'), peringatan: hasil.filter(h => h.peringatan.length).length };
  let tampil = hasil;
  if (hasil.length > MAKS_TAMPIL) { // baris salah didahulukan, lalu sisanya sampai batas
    const e = hasil.filter(h => h.hasil === 'error').slice(0, MAKS_TAMPIL / 2), sisa = hasil.filter(h => h.hasil !== 'error').slice(0, MAKS_TAMPIL - e.length);
    tampil = [...e, ...sisa].sort((a, b) => a.n - b.n);
  }
  const keluar = { mode, ringkasan, kolomAbaikan, simpan: false, dipotong: tampil.length < hasil.length, baris: tampil.map(h => ({ n: h.n, nama: h.d.nama, nisn: h.d.nisn, jenjang: h.d.jenjang, hasil: h.hasil, galat: h.galat, peringatan: h.peringatan, perubahan: h.perubahan })) };
  if (!b.simpan) return keluar;

  if (ringkasan.error) throw err(400, `Impor dibatalkan: ${ringkasan.error} baris masih bermasalah. Tidak ada data yang disimpan.`);
  const baru = hasil.filter(h => h.hasil === 'baru').map(h => ({ ...h.d, status: h.d.status || 'ijazah tercetak' })), ubah = hasil.filter(h => h.hasil === 'perbarui');
  const log = [];
  if (baru.length) {
    const r = await c.query(`insert into lulusan(${F}) select * from unnest(${F.map((k, i) => `$${i + 1}::${tipe(k)}[]`)}) returning id,nama,nisn,jenjang`, F.map(k => baru.map(r => r[k] ?? null)));
    for (const x of r.rows) log.push({ id: x.id, aksi: 'impor-tambah', nama: x.nama, nisn: x.nisn, jenjang: x.jenjang, oleh });
  }
  if (ubah.length) {
    await c.query(`update lulusan l set ${F.map(k => `${k}=v.${k}`)} from unnest($1::int[],${F.map((k, i) => `$${i + 2}::${tipe(k)}[]`)}) as v(id,${F}) where l.id=v.id`,
      [ubah.map(h => h.id), ...F.map(k => ubah.map(h => h.gabung[k] ?? null))]);
    for (const h of ubah) log.push({ id: h.id, aksi: 'impor-ubah', nama: h.gabung.nama, nisn: h.gabung.nisn, jenjang: h.gabung.jenjang, detail: { perubahan: h.perubahan }, oleh });
  }
  await catat(c, log); // satu transaksi dengan perubahan datanya
  return { ...keluar, simpan: true };
}

module.exports = { F, SEL, impor, periksa, tgl };
