const { pool, auth, fail, err } = require('./_lib');
const F = ['nisn','nik','nama','tempat_lahir','tgl_lahir','ortu','jenjang','jurusan','tahun_lulus','no_ijazah','tgl_terbit','tgl_diambil','penerima','status','catatan'];
const clean = o => F.map(k => (o[k] === '' || o[k] === undefined ? null : o[k]));
module.exports = async (req, res) => {
  const role = auth(req, res); if (!role) return;
  try {
    if (req.method === 'GET') {
      const { q = '', tahun = '', status = '', jenjang = '', jurusan = '', blanko = '' } = req.query, like = '%' + q + '%';
      const r = await pool.query(`select l.*, b.no_seri from lulusan l left join blanko b on b.id=l.blanko_id
        where ($1='' or l.nama ilike $2 or l.nisn ilike $2 or l.nik ilike $2 or l.no_ijazah ilike $2 or b.no_seri ilike $2 or l.tempat_lahir ilike $2 or l.ortu ilike $2 or l.penerima ilike $2)
        and ($3='' or l.tahun_lulus::text=$3) and ($4='' or l.status=$4) and ($5='' or l.jenjang=$5) and ($6='' or l.jurusan=$6) and ($7='' or ($7='ada' and l.blanko_id is not null) or ($7='belum' and l.blanko_id is null)) order by l.tahun_lulus desc, l.nama limit ${req.query.semua ? 5000 : 300}`, [q, like, tahun, status, jenjang, jurusan, blanko]);
      return res.json(r.rows);
    }
    if (req.method === 'POST') {
      const b = req.body;
      if (Array.isArray(b)) { // impor massal, NISN yang sudah ada dilewati
        let n = 0;
        for (const o of b.slice(0, 1000)) if (o.nama) n += (await pool.query(`insert into lulusan(${F}) values(${F.map((_, i) => '$' + (i + 1))}) on conflict do nothing`, clean(o))).rowCount;
        return res.json({ masuk: n, dilewati: b.length - n });
      }
      if (!b.nama) throw err(400, 'Nama wajib diisi');
      if (b.id) await pool.query(`update lulusan set ${F.map((k, i) => k + '=$' + (i + 1))} where id=$${F.length + 1}`, [...clean(b), b.id]);
      else await pool.query(`insert into lulusan(${F}) values(${F.map((_, i) => '$' + (i + 1))})`, clean(b));
      return res.json({ ok: 1 });
    }
    if (req.method === 'DELETE') {
      if (role !== 'admin') throw err(403, 'Hanya admin yang boleh menghapus');
      const x = await pool.query('select blanko_id from lulusan where id=$1', [req.query.id]);
      if (x.rows[0] && x.rows[0].blanko_id) throw err(400, 'Lulusan ini sudah memegang blanko. Tandai blankonya rusak dulu.');
      await pool.query('delete from lulusan where id=$1', [req.query.id]);
      return res.json({ ok: 1 });
    }
    res.status(405).end();
  } catch (e) {
    fail(res, e.code === '23505' ? err(400, 'NISN atau nomor ijazah sudah dipakai data lain') : e);
  }
};
