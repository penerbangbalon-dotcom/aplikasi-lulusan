const { pool, auth, fail, err, cocok, hash } = require('./_lib');
// GET: profil dan hak akses akun yang sedang masuk. POST: ganti kata sandi sendiri.
module.exports = async (req, res) => {
  const u = await auth(req, res); if (!u) return;
  try {
    if (req.method === 'GET') return res.json({ role: u.role, nama: u.nama, username: u.username || null, peran: u.peran, izin: [...u.izin] });
    if (req.method !== 'POST') return res.status(405).end();
    if (u.role !== 'user') throw err(400, 'Kata sandi bawaan diubah lewat Environment Variables di Vercel');
    const { lama, baru } = req.body || {};
    if (String(baru || '').length < 8) throw err(400, 'Kata sandi baru minimal 8 karakter');
    const r = (await pool.query('select sandi from pengguna where id=$1', [u.id])).rows[0];
    if (!r || !cocok(lama || '', r.sandi)) throw err(400, 'Kata sandi lama salah');
    await pool.query('update pengguna set sandi=$1 where id=$2', [hash(baru), u.id]);
    res.json({ ok: 1 });
  } catch (e) { fail(res, e); }
};
