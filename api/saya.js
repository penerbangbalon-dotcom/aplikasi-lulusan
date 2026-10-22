const { pool, authSiswa, fail } = require('./_lib');
module.exports = async (req, res) => {
  if (!authSiswa(req, res)) return;
  try {
    const r = await pool.query(`select l.nama,l.nis,l.nisn,l.nik,l.tempat_lahir,l.tgl_lahir,l.ortu,l.jenjang,l.jurusan,l.tahun_lulus,l.no_ijazah,b.no_seri,
      l.tgl_terbit,l.tgl_diambil,l.penerima,l.status,l.catatan,l.dibuat,l.blanko_id from lulusan l left join blanko b on b.id=l.blanko_id where l.id=$1`, [req.uid]);
    const d = r.rows[0] || {};
    // riwayat blanko milik siswa sendiri (tanpa nama petugas dan rincian internal)
    d.riwayat = d.blanko_id ? (await pool.query('select aksi,waktu from blanko_log where blanko_id=$1 order by id desc', [d.blanko_id])).rows : [];
    delete d.blanko_id;
    // identitas lembaga + logo ikut dikirim agar nama lembaga dan tanda tangan kepala tampil di cetakan siswa
    const pg = await pool.query("select kunci,nilai from pengaturan where kunci in ('identitas','logo')");
    const o = Object.fromEntries(pg.rows.map(x => [x.kunci, x.nilai]));
    let idn = {}; try { idn = JSON.parse(o.identitas || '{}'); } catch (e) {}
    d.lembaga = { identitas: idn, logo: o.logo || '' };
    res.json(d);
  } catch (e) { fail(res, e); }
};
