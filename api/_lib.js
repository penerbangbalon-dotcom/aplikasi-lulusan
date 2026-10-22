const { Pool } = require('pg'); const crypto = require('crypto');
const pool = global.__p || (global.__p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 }));
const sign = s => crypto.createHmac('sha256', process.env.SECRET).update(s).digest('hex');
exports.pool = pool;
exports.token = (role, id = 0) => { const p = role + '.' + id + '.' + (Date.now() + 12 * 3600e3); return p + '.' + sign(p); };
// siswa=true: hanya untuk token siswa; siswa=false: hanya untuk admin/operator
exports.auth = (req, res, siswa) => {
  const [role, id, exp, sig] = (req.headers.authorization || '').replace('Bearer ', '').split('.');
  if (sig && Date.now() < +exp && sig === sign(role + '.' + id + '.' + exp)) {
    if ((role === 'siswa') !== !!siswa) { res.status(403).json({ error: 'Tidak punya akses' }); return null; }
    req.uid = +id; return role;
  }
  res.status(401).json({ error: 'Sesi habis, silakan masuk lagi' }); return null;
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
