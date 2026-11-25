const { pool, auth, fail, err } = require('./_lib');
const { tgl } = require('./_impor');
const { bersih, t } = require('./_siswa');
const JENIS = ['aktif', 'diterima', 'mutasi'];

module.exports = async (req, res) => {
  const u = await auth(req, res, req.method === 'GET' ? 'surat.lihat' : req.method === 'DELETE' ? 'surat.hapus' : 'surat.buat'); if (!u) return;
  try {
    if (req.method === 'GET') {
      const { jenis = '', tahun = '', q = '', urut = '' } = req.query;
      if (urut) { // nomor urut berikutnya untuk jenis surat dan tahun tertentu
        if (!JENIS.includes(urut)) throw err(400, 'Jenis surat tidak valid');
        const th = +tahun || new Date().getFullYear();
        const r = await pool.query('select coalesce(max(urut),0)+1 n from surat where jenis=$1 and tahun=$2', [urut, th]);
        return res.json({ urut: r.rows[0].n, tahun: th });
      }
      const like = '%' + String(q).replace(/[\\%_]/g, '\\$&') + '%';
      const r = await pool.query(`select id,jenis,nomor,tahun,urut,tgl_surat,siswa_id,nama,data,oleh,dibuat from surat
        where ($1='' or jenis=$1) and ($2='' or tahun::text=$2) and ($3='' or nama ilike $4 or nomor ilike $4) order by tgl_surat desc, id desc limit 300`, [jenis, tahun, q, like]);
      return res.json(r.rows);
    }
    if (req.method === 'DELETE') {
      const id = +req.query.id; if (!Number.isInteger(id)) throw err(400, 'ID tidak valid');
      const r = await pool.query('delete from surat where id=$1', [id]);
      if (!r.rowCount) throw err(404, 'Surat tidak ditemukan');
      return res.json({ ok: 1 });
    }
    if (req.method !== 'POST') return res.status(405).end();
    const b = req.body || {};
    if (!JENIS.includes(b.jenis)) throw err(400, 'Jenis surat tidak valid');
    const nomor = t(b.nomor); if (!nomor || nomor.length > 120) throw err(400, 'Nomor surat wajib diisi (maksimal 120 karakter)');
    const tg = tgl(String(b.tgl_surat || '').trim()); if (!tg) throw err(400, 'Tanggal surat tidak valid');
    const data = b.data && typeof b.data === 'object' && !Array.isArray(b.data) ? b.data : {};
    if (JSON.stringify(data).length > 20000) throw err(400, 'Data surat terlalu besar');
    const nama = t(data.nama); if (!nama) throw err(400, 'Nama siswa wajib diisi');
    const th = +tg.slice(0, 4), urut = Number.isInteger(+b.urut) && +b.urut > 0 ? +b.urut : null;
    let siswaId = Number.isInteger(+b.siswa_id) && +b.siswa_id > 0 ? +b.siswa_id : null;
    const c = await pool.connect();
    try {
      await c.query('begin');
      if (b.jenis === 'mutasi') {
        if (!siswaId) throw err(400, 'Pilih siswa yang dimutasi dari Data Siswa');
        const r = await c.query(`update siswa set status='pindah', tgl_status=$1, diubah=now() where id=$2 returning id`, [tgl(String(data.tgl_mutasi || '').trim()) || tg, siswaId]);
        if (!r.rowCount) throw err(404, 'Data siswa tidak ditemukan');
      } else if (b.jenis === 'aktif') {
        if (siswaId) { const r = await c.query('select 1 from siswa where id=$1', [siswaId]); if (!r.rowCount) siswaId = null; }
      } else if (b.jenis === 'diterima' && b.tambah_siswa) {
        const { v, galat } = bersih({ nama: data.nama, nisn: data.nisn, tempat_lahir: data.tempat_lahir, tgl_lahir: data.tgl_lahir, jk: data.jk, ayah: data.ayah, ibu: data.ibu,
          alamat: data.alamat, hp: data.hp, jenjang: data.jenjang, asal_sekolah: data.asal_sekolah, kelas: data.kelas });
        if (galat.length) throw err(400, galat[0]);
        const k = ['nama', 'nisn', 'tempat_lahir', 'tgl_lahir', 'jk', 'ayah', 'ibu', 'alamat', 'hp', 'jenjang', 'asal_sekolah', 'kelas'];
        const r = await c.query(`insert into siswa(${k},angkatan,status,tgl_status) values(${k.map((_, i) => '$' + (i + 1))},$${k.length + 1},'aktif',$${k.length + 2}) returning id`, [...k.map(x => v[x]), th, tg]);
        siswaId = r.rows[0].id;
      }
      const r = await c.query(`insert into surat(jenis,nomor,tahun,urut,tgl_surat,siswa_id,nama,data,oleh) values($1,$2,$3,$4,$5,$6,$7,$8,$9)
        returning id,jenis,nomor,tahun,urut,tgl_surat,siswa_id,nama,data,oleh,dibuat`, [b.jenis, nomor, th, urut, tg, siswaId, nama, JSON.stringify(data), u.oleh]);
      await c.query('commit');
      return res.json(r.rows[0]);
    } catch (e) {
      await c.query('rollback').catch(() => {});
      if (e.code === '23505') throw err(409, e.constraint === 'surat_jenis_nomor_uq' ? 'Nomor surat ini sudah dipakai untuk jenis surat yang sama' : 'NISN dengan jenjang yang sama sudah ada di Data Siswa');
      throw e;
    } finally { c.release(); }
  } catch (e) { fail(res, e); }
};
