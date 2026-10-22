const { Pool } = require('pg'); const crypto = require('crypto');
const pool = global.__p || (global.__p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_NOSSL ? false : { rejectUnauthorized: false }, max: 3 }));
const sign = s => crypto.createHmac('sha256', process.env.SECRET).update(s).digest('hex');
exports.pool = pool;

// Daftar hak akses: [kunci, keterangan, kelompok]. Tambah baris di sini bila ada fitur baru.
const IZIN = [
  ['lulusan.lihat', 'Melihat data lulusan', 'Data lulusan'],
  ['lulusan.ubah', 'Menambah, mengubah, dan impor CSV data lulusan', 'Data lulusan'],
  ['lulusan.hapus', 'Menghapus data lulusan', 'Data lulusan'],
  ['riwayat.lihat', 'Melihat riwayat perubahan data lulusan (siapa mengubah apa)', 'Data lulusan'],
  ['blanko.lihat', 'Melihat stok dan riwayat blanko', 'Blanko ijazah'],
  ['blanko.pakai', 'Memakai blanko untuk lulusan', 'Blanko ijazah'],
  ['blanko.stok', 'Menambah stok blanko', 'Blanko ijazah'],
  ['blanko.status', 'Menandai blanko rusak, hilang, atau dikembalikan', 'Blanko ijazah'],
  ['laporan.lihat', 'Melihat dan mencetak laporan', 'Laporan'],
  ['lembaga.ubah', 'Mengubah identitas lembaga dan logo', 'Pengaturan'],
  ['pengguna.kelola', 'Mengelola pengguna dan peran', 'Pengaturan'],
];
const SEMUA = IZIN.map(x => x[0]);
const OPERATOR = ['lulusan.lihat', 'lulusan.ubah', 'blanko.lihat', 'blanko.pakai', 'laporan.lihat'];
exports.IZIN = IZIN; exports.SEMUA = SEMUA;

// ---- kata sandi pengguna (scrypt + salt acak) ----
exports.hash = p => { const s = crypto.randomBytes(16).toString('hex'); return s + ':' + crypto.scryptSync(String(p), s, 32).toString('hex'); };
exports.cocok = (p, h) => {
  const [s, k] = String(h || '').split(':'); if (!s || !k) return false;
  const a = Buffer.from(crypto.scryptSync(String(p), s, 32).toString('hex')), b = Buffer.from(k);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// role: siswa | user (pengguna di database, id = pengguna.id) | admin | operator (kata sandi bawaan di Environment Variables)
exports.token = (role, id = 0) => { const p = role + '.' + id + '.' + (Date.now() + 12 * 3600e3); return p + '.' + sign(p); };
const baca = req => {
  const [role, id, exp, sig] = (req.headers.authorization || '').replace('Bearer ', '').split('.');
  return sig && Date.now() < +exp && sig === sign(role + '.' + id + '.' + exp) ? { role, id: +id } : null;
};
// Siswa: hanya untuk token siswa. Mengembalikan true/false (respons error sudah dikirim bila false).
exports.authSiswa = (req, res) => {
  const t = baca(req);
  if (!t) { res.status(401).json({ error: 'Sesi habis, silakan masuk lagi' }); return null; }
  if (t.role !== 'siswa') { res.status(403).json({ error: 'Tidak punya akses' }); return null; }
  req.uid = t.id; return t;
};
// Staf: kembalikan { role, id, nama, izin:Set } atau null (respons error sudah dikirim).
// Hak akses dibaca dari database pada setiap permintaan, sehingga perubahan peran langsung berlaku.
exports.auth = async (req, res, izin) => {
  const t = baca(req);
  if (!t) { res.status(401).json({ error: 'Sesi habis, silakan masuk lagi' }); return null; }
  let u;
  if (t.role === 'admin') u = { nama: 'Admin', peran: 'Administrator', izin: new Set(SEMUA) };
  else if (t.role === 'operator') u = { nama: 'Operator', peran: 'Operator', izin: new Set(OPERATOR) };
  else if (t.role === 'user') {
    const r = (await pool.query(`select g.id,g.username,g.nama,g.aktif,p.nama peran,p.izin,p.sistem from pengguna g join peran p on p.id=g.peran_id where g.id=$1`, [t.id])).rows[0];
    if (!r || !r.aktif) { res.status(401).json({ error: 'Akun tidak aktif atau sudah dihapus' }); return null; }
    u = { id: r.id, username: r.username, nama: r.nama, peran: r.peran, izin: new Set(r.sistem ? SEMUA : (r.izin || []).filter(x => SEMUA.includes(x))) };
  } else { res.status(403).json({ error: 'Tidak punya akses' }); return null; }
  u.role = t.role;
  u.oleh = t.role === 'user' ? u.nama + ' (' + u.username + ')' : t.role;
  if (izin && !u.izin.has(izin)) { res.status(403).json({ error: 'Peran Anda tidak punya hak akses untuk ini' }); return null; }
  return u;
};
exports.limit = async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const n = (await pool.query(`select count(*)::int n from login_gagal where ip=$1 and waktu>now()-interval '15 minutes'`, [ip])).rows[0].n;
  if (n >= 10) { res.status(429).json({ error: 'Terlalu banyak percobaan gagal. Coba lagi 15 menit lagi.' }); return null; }
  return ip;
};
exports.gagal = async ip => { await pool.query(`delete from login_gagal where waktu<now()-interval '1 day'`); await pool.query('insert into login_gagal(ip) values($1)', [ip]); };
exports.fail = (res, e) => res.status(e.status || 500).json({ error: e.status ? e.message : 'Kesalahan server: ' + e.message });
exports.err = (status, message) => Object.assign(new Error(message), { status });
