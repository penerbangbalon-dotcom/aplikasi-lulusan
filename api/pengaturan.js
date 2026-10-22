const { pool, auth, authSiswa, fail, err } = require('./_lib');
// Identitas lembaga dan logo disimpan di server agar tampil juga pada cetakan siswa.
// GET: semua yang sudah masuk (staf maupun siswa). POST: perlu hak akses lembaga.ubah.
const KUNCI = ['identitas', 'logo'];
module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const t = (req.headers.authorization || '').split('.')[0].replace('Bearer ', '');
      if (t === 'siswa') { if (!authSiswa(req, res)) return; } else if (!(await auth(req, res))) return;
      const r = await pool.query('select kunci,nilai from pengaturan where kunci=any($1)', [KUNCI]);
      const o = Object.fromEntries(r.rows.map(x => [x.kunci, x.nilai]));
      let idn = {}; try { idn = JSON.parse(o.identitas || '{}'); } catch (e) {}
      return res.json({ identitas: idn, logo: o.logo || '' });
    }
    if (req.method !== 'POST') return res.status(405).end();
    if (!(await auth(req, res, 'lembaga.ubah'))) return;
    const b = req.body || {};
    for (const k of KUNCI) {
      if (b[k] === undefined) continue;
      const v = k === 'identitas' ? JSON.stringify(b[k] || {}) : String(b[k] || '');
      if (v.length > 600000) throw err(400, 'Data terlalu besar');
      if (k === 'logo' && v && !/^data:image\/(png|jpeg|webp|gif);base64,/.test(v)) throw err(400, 'Format logo tidak valid');
      await pool.query('insert into pengaturan(kunci,nilai) values($1,$2) on conflict (kunci) do update set nilai=excluded.nilai', [k, v]);
    }
    res.json({ ok: 1 });
  } catch (e) { fail(res, e); }
};
