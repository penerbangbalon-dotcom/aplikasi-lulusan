const { pool, auth, fail, err } = require('./_lib');
const { F, SEL, impor } = require('./_impor');
const { catat, selisih } = require('./_log');
// kolom NIPD (istilah Dapodik) dianggap sama dengan NIS
const clean = o => F.map(k => { let v = o[k]; if (k === 'nis' && (v === undefined || v === '')) v = o.nipd;
  if (k === 'peserta_upk' && (v === undefined || v === '')) v = o.upk; return v === '' || v === undefined ? null : v; });
module.exports = async (req, res) => {
  const u = await auth(req, res, req.method === 'GET' ? (req.query.riwayat !== undefined ? 'riwayat.lihat' : 'lulusan.lihat') : req.method === 'DELETE' ? 'lulusan.hapus' : 'lulusan.ubah'); if (!u) return;
  try {
    if (req.method === 'GET' && req.query.riwayat !== undefined) { // riwayat perubahan: semua, atau satu data lulusan (id)
      const { id = '', aksi = '', q = '' } = req.query, like = '%' + q + '%';
      const r = await pool.query(`select id,lulusan_id,aksi,nama,nisn,jenjang,detail,oleh,waktu from lulusan_log
        where ($1='' or lulusan_id=nullif($1,'')::int) and ($2='' or aksi=$2) and ($3='' or nama ilike $4 or nisn ilike $4 or oleh ilike $4) order by id desc limit 300`, [id, aksi, q, like]);
      return res.json(r.rows);
    }
    if (req.method === 'GET' && req.query.ekspor !== undefined) { // ekspor seluruh data per 5000 baris (ekspor=<offset>) agar respons tidak melewati batas ukuran Vercel
      return res.json((await pool.query(`select ${SEL} from lulusan order by tahun_lulus, jenjang, nama, id limit 5000 offset $1`, [Math.max(0, +req.query.ekspor || 0)])).rows);
    }
    if (req.method === 'GET') {
      const { q = '', tahun = '', status = '', jenjang = '', jurusan = '', blanko = '', mode = 'nama' } = req.query, like = '%' + q + '%';
      // mode "nama" (bawaan): setiap kata yang diketik harus ada di nama, urutan bebas. mode "semua": cari di semua kolom.
      const kata = String(q).trim().split(/\s+/).filter(Boolean).map(k => '%' + k.replace(/[\\%_]/g, '\\$&') + '%');
      const cocokQ = mode === 'semua'
        ? `($1='' or l.nama ilike $2 or l.nis ilike $2 or l.peserta_upk ilike $2 or l.nisn ilike $2 or l.nik ilike $2 or l.no_ijazah ilike $2 or b.no_seri ilike $2 or l.tempat_lahir ilike $2 or l.ortu ilike $2 or l.penerima ilike $2) and $8::text[] is not null`
        : `($1='' or l.nama ilike all($8::text[])) and $2::text is not null`;
      const r = await pool.query(`select l.*, b.no_seri from lulusan l left join blanko b on b.id=l.blanko_id
        where ${cocokQ}
        and ($3='' or l.tahun_lulus::text=$3) and ($4='' or l.status=$4) and ($5='' or l.jenjang=$5) and ($6='' or l.jurusan=$6) and ($7='' or ($7='ada' and l.blanko_id is not null) or ($7='belum' and l.blanko_id is null)) order by l.tahun_lulus desc, l.nama limit ${req.query.semua ? 5000 : 300}`, [q, like, tahun, status, jenjang, jurusan, blanko, kata]);
      return res.json(r.rows);
    }
    if (req.method === 'POST') {
      const b = req.body;
      if (b.aksi === 'impor') { // impor CSV: semua baris divalidasi dulu; simpan=true menyimpan SEMUANYA dalam satu transaksi
        const c = await pool.connect();
        try {
          await c.query('begin');
          const h = await impor(c, b, u.oleh);
          await c.query(b.simpan ? 'commit' : 'rollback'); // pratinjau (simpan=false) tidak pernah menulis apa pun
          return res.json(h);
        } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
      }
      if (!b.nama) throw err(400, 'Nama wajib diisi');
      const v = clean(b), baru = Object.fromEntries(F.map((k, i) => [k, v[i]])), c = await pool.connect();
      try {
        await c.query('begin');
        if (b.id) {
          const lama = (await c.query(`select ${SEL} from lulusan where id=$1 for update`, [b.id])).rows[0];
          if (!lama) throw err(404, 'Data lulusan tidak ditemukan');
          await c.query(`update lulusan set ${F.map((k, i) => k + '=$' + (i + 1))} where id=$${F.length + 1}`, [...v, b.id]);
          const s = selisih(lama, baru, F);
          if (s.length) await catat(c, [{ id: +b.id, aksi: 'ubah', nama: baru.nama, nisn: baru.nisn, jenjang: baru.jenjang, detail: { perubahan: s }, oleh: u.oleh }]);
        } else {
          const r = await c.query(`insert into lulusan(${F}) values(${F.map((_, i) => '$' + (i + 1))}) returning id`, v);
          await catat(c, [{ id: r.rows[0].id, aksi: 'tambah', nama: baru.nama, nisn: baru.nisn, jenjang: baru.jenjang, oleh: u.oleh }]);
        }
        await c.query('commit');
      } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
      return res.json({ ok: 1 });
    }
    if (req.method === 'DELETE') {
      const c = await pool.connect();
      try {
        await c.query('begin');
        const x = (await c.query(`select blanko_id,${SEL} from lulusan where id=$1 for update`, [req.query.id])).rows[0];
        if (x && x.blanko_id) throw err(400, 'Lulusan ini sudah memegang blanko. Tandai blankonya rusak dulu.');
        if (x) {
          await c.query('delete from lulusan where id=$1', [req.query.id]);
          await catat(c, [{ id: +req.query.id, aksi: 'hapus', nama: x.nama, nisn: x.nisn, jenjang: x.jenjang, detail: { salinan: Object.fromEntries(F.map(k => [k, x[k] ?? null])) }, oleh: u.oleh }]);
        }
        await c.query('commit');
      } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
      return res.json({ ok: 1 });
    }
    res.status(405).end();
  } catch (e) {
    fail(res, e.code === '23505' ? err(400, 'NISN pada jenjang yang sama, atau nomor ijazah, sudah dipakai data lain') : e);
  }
};
