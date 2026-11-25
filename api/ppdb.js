const { pool, auth, limit, gagal, fail, err } = require('./_lib');
const { bersih, KOLOM, JENJANG, t } = require('./_siswa');
const FP = ['nama', 'nik', 'nisn', 'jk', 'tempat_lahir', 'tgl_lahir', 'ayah', 'ibu', 'alamat', 'hp', 'asal_sekolah', 'jenjang'];
const STATUS = ['baru', 'diverifikasi', 'diterima', 'ditolak'];

async function konfig() {
  const r = (await pool.query("select nilai from pengaturan where kunci='ppdb'")).rows[0];
  let k = {}; try { k = JSON.parse((r && r.nilai) || '{}'); } catch (e) {}
  const idn = (await pool.query("select nilai from pengaturan where kunci='identitas'")).rows[0]; let i = {}; try { i = JSON.parse((idn && idn.nilai) || '{}'); } catch (e) {}
  return { buka: !!k.buka, tahun_ajaran: k.tahun_ajaran || '', info: k.info || '', lembaga: i.nama || '', alamat: i.alamat || '' };
}
const noDaftar = (id, th) => 'PPDB-' + String(th || new Date().getFullYear()).slice(0, 4) + '-' + String(id).padStart(4, '0');

module.exports = async (req, res) => {
  try {
    // ---- bagian publik: tanpa login ----
    if (req.method === 'GET' && req.query.konfigurasi !== undefined) { res.setHeader('Cache-Control', 'no-store'); return res.json(await konfig()); }
    if (req.method === 'POST' && (req.body || {}).aksi === 'daftar') {
      const b = req.body, cfg = await konfig();
      if (!cfg.buka) throw err(403, 'Pendaftaran sedang ditutup');
      if (t(b.website)) return res.json({ ok: 1, no_daftar: 'PPDB-0000-0000' }); // kolom jebakan untuk robot: pura-pura berhasil
      const ip = await limit(req, res); if (!ip) return;
      const { v, galat } = bersih(b);
      if (!v.jenjang) galat.push('Pilih jenjang yang dituju');
      if (!v.tgl_lahir) galat.push('Tanggal lahir wajib diisi');
      if (!v.jk) galat.push('Jenis kelamin wajib diisi');
      if (!v.hp) galat.push('Nomor HP wajib diisi');
      if (galat.length) throw err(400, galat[0]);
      const jenis = b.jenis === 'pindahan' ? 'pindahan' : 'baru';
      const dup = await pool.query(`select 1 from pendaftar where tahun_ajaran=$1 and status<>'ditolak' and ((nik is not null and nik=$2) or (lower(nama)=lower($3) and tgl_lahir=$4))`, [cfg.tahun_ajaran, v.nik, v.nama, v.tgl_lahir]);
      if (dup.rowCount) throw err(409, 'Pendaftaran dengan data yang sama sudah ada. Silakan hubungi petugas.');
      await gagal(ip); // menghitung percobaan: batas 10 pendaftaran per 15 menit per alamat IP
      const r = await pool.query(`insert into pendaftar(jenis,${FP},tahun_ajaran,ip) values($1,${FP.map((_, i) => '$' + (i + 2))},$${FP.length + 2},$${FP.length + 3}) returning id`, [jenis, ...FP.map(k => v[k]), cfg.tahun_ajaran, ip]);
      const no = noDaftar(r.rows[0].id, (cfg.tahun_ajaran || '').slice(0, 4));
      await pool.query('update pendaftar set no_daftar=$1 where id=$2', [no, r.rows[0].id]);
      return res.json({ ok: 1, no_daftar: no });
    }

    // ---- bagian petugas ----
    const u = await auth(req, res, req.method === 'GET' ? 'ppdb.lihat' : 'ppdb.kelola'); if (!u) return;
    if (req.method === 'GET') {
      if (req.query.pengaturan !== undefined) return res.json(await konfig());
      const { status = '', q = '', tahun = '' } = req.query, like = '%' + String(q).replace(/[\\%_]/g, '\\$&') + '%';
      const r = await pool.query(`select id,no_daftar,jenis,${FP},tahun_ajaran,status,catatan,siswa_id,dibuat from pendaftar
        where ($1='' or status=$1) and ($2='' or tahun_ajaran=$2) and ($3='' or nama ilike $4 or no_daftar ilike $4 or nisn ilike $4 or nik ilike $4) order by id desc limit 500`, [status, tahun, q, like]);
      return res.json(r.rows);
    }
    if (req.method === 'DELETE') {
      const id = +req.query.id; if (!Number.isInteger(id)) throw err(400, 'ID tidak valid');
      const r = await pool.query('delete from pendaftar where id=$1', [id]);
      if (!r.rowCount) throw err(404, 'Pendaftar tidak ditemukan');
      return res.json({ ok: 1 });
    }
    if (req.method !== 'POST') return res.status(405).end();
    const b = req.body || {};
    if (b.aksi === 'pengaturan') {
      const k = { buka: !!b.buka, tahun_ajaran: String(b.tahun_ajaran || '').trim().slice(0, 20), info: String(b.info || '').trim().slice(0, 600) };
      if (k.buka && !k.tahun_ajaran) throw err(400, 'Isi tahun ajaran sebelum membuka pendaftaran (contoh 2027/2028)');
      await pool.query("insert into pengaturan(kunci,nilai) values('ppdb',$1) on conflict (kunci) do update set nilai=excluded.nilai", [JSON.stringify(k)]);
      return res.json({ ok: 1 });
    }
    const id = +b.id; if (!Number.isInteger(id)) throw err(400, 'ID tidak valid');
    if (b.aksi === 'status') {
      if (!STATUS.includes(b.status) || b.status === 'diterima') throw err(400, 'Status tidak valid (untuk menerima, pakai tombol Terima)');
      const r = await pool.query('update pendaftar set status=$1, catatan=coalesce($2,catatan), diubah=now() where id=$3 and status<>\'diterima\'', [b.status, t(b.catatan), id]);
      if (!r.rowCount) throw err(404, 'Pendaftar tidak ditemukan atau sudah diterima');
      return res.json({ ok: 1 });
    }
    if (b.aksi === 'terima') { // jadikan siswa aktif
      const c = await pool.connect();
      try {
        await c.query('begin');
        const p = (await c.query('select * from pendaftar where id=$1 for update', [id])).rows[0];
        if (!p) throw err(404, 'Pendaftar tidak ditemukan');
        if (p.siswa_id) throw err(409, 'Pendaftar ini sudah dijadikan siswa');
        const th = +String(p.tahun_ajaran || '').slice(0, 4) || new Date().getFullYear();
        const kelas = t(b.kelas);
        const r = await c.query(`insert into siswa(nama,nik,nisn,jk,tempat_lahir,tgl_lahir,ayah,ibu,alamat,hp,asal_sekolah,jenjang,kelas,angkatan,status,tgl_status)
          values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'aktif',current_date) returning id`,
          [p.nama, p.nik, p.nisn, p.jk, p.tempat_lahir, p.tgl_lahir, p.ayah, p.ibu, p.alamat, p.hp, p.asal_sekolah, p.jenjang, kelas, th]);
        await c.query("update pendaftar set status='diterima', siswa_id=$1, diubah=now() where id=$2", [r.rows[0].id, id]);
        await c.query('commit');
        return res.json({ ok: 1, siswa_id: r.rows[0].id });
      } catch (e) {
        await c.query('rollback').catch(() => {});
        throw e.code === '23505' ? err(409, 'NISN dengan jenjang yang sama sudah ada di Data Siswa') : e;
      } finally { c.release(); }
    }
    if (b.aksi === 'ubah') { // perbaiki salah ketik
      const { v, galat } = bersih(b); if (galat.length) throw err(400, galat[0]);
      const r = await pool.query(`update pendaftar set ${FP.map((k, i) => k + '=$' + (i + 1))}, diubah=now() where id=$${FP.length + 1} and status<>'diterima'`, [...FP.map(k => v[k]), id]);
      if (!r.rowCount) throw err(404, 'Pendaftar tidak ditemukan atau sudah diterima');
      return res.json({ ok: 1 });
    }
    throw err(400, 'Aksi tidak dikenal');
  } catch (e) { fail(res, e); }
};
