const { pool, auth, fail } = require('./_lib');
module.exports = async (req, res) => {
  if (!auth(req, res, true)) return;
  try {
    const r = await pool.query(`select l.nama,l.nisn,l.tempat_lahir,l.tgl_lahir,l.ortu,l.jenjang,l.jurusan,l.tahun_lulus,l.no_ijazah,b.no_seri,
      l.tgl_terbit,l.tgl_diambil,l.penerima,l.status from lulusan l left join blanko b on b.id=l.blanko_id where l.id=$1`, [req.uid]);
    res.json(r.rows[0] || {});
  } catch (e) { fail(res, e); }
};
