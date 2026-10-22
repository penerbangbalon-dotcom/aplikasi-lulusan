const { pool, token, limit, gagal, fail, cocok } = require('./_lib');
const pad = x => String(x).padStart(2, '0');
const tglIso = s => { // terima 17082008, 17-08-2008, 17/08/2008, 2008-08-17
  s = String(s || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{1,2})[\/\-. ]?(\d{1,2})[\/\-. ]?(\d{4})$/); return m ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : null;
};
module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') { // daftar tahun lulusan untuk pilihan di halaman login
      const r = await pool.query('select distinct tahun_lulus from lulusan where tahun_lulus is not null order by 1 desc');
      return res.json(r.rows.map(x => x.tahun_lulus));
    }
    const ip = await limit(req, res); if (!ip) return;
    const b = req.body || {};
    if (b.peran === 'siswa') {
      const iso = tglIso(b.password), nm = String(b.nama || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const r = iso && nm && b.tahun ? await pool.query(
        `select id from lulusan where tahun_lulus=$1 and lower(regexp_replace(trim(nama),'\\s+',' ','g'))=$2 and tgl_lahir=$3`, [b.tahun, nm, iso]) : { rows: [] };
      if (r.rows.length !== 1) { await gagal(ip); return res.status(401).json({ error: 'Nama, tahun lulus, atau tanggal lahir tidak cocok' }); }
      return res.json({ token: token('siswa', r.rows[0].id), role: 'siswa' });
    }
    const p = b.password, un = String(b.username || '').trim().toLowerCase();
    if (un) { // pengguna di database
      const r = (await pool.query('select id,sandi,aktif from pengguna where username=$1', [un])).rows[0];
      // hash tiruan agar waktu respons sama baik username ada maupun tidak
      const ok = cocok(p || '', r ? r.sandi : '0:0') && r && r.aktif;
      if (!ok) { await gagal(ip); return res.status(401).json({ error: 'Username atau kata sandi salah, atau akun nonaktif' }); }
      return res.json({ token: token('user', r.id), role: 'user' });
    }
    // tanpa username: kata sandi bawaan dari Environment Variables (cadangan jika lupa kata sandi pengguna)
    const role = p && p === process.env.ADMIN_PASSWORD ? 'admin' : p && p === process.env.OPERATOR_PASSWORD ? 'operator' : null;
    if (!role) { await gagal(ip); return res.status(401).json({ error: 'Kata sandi salah' }); }
    res.json({ token: token(role), role });
  } catch (e) { fail(res, e); }
};
