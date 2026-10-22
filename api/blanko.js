const { pool, auth, fail, err } = require('./_lib');
module.exports = async (req, res) => {
  const u = await auth(req, res); if (!u) return;
  const perlu = k => { if (!u.izin.has(k)) throw err(403, 'Peran Anda tidak punya hak akses untuk ini'); };
  const c = await pool.connect();
  try {
    if (req.method === 'GET') {
      perlu('blanko.lihat');
      if (req.query.log) return res.json((await c.query('select * from blanko_log where blanko_id=$1 order by id desc', [req.query.log])).rows);
      const st = req.query.status || '';
      const ringkas = Object.fromEntries((await c.query('select status, count(*)::int n from blanko group by 1')).rows.map(r => [r.status, r.n]));
      const data = (await c.query(`select b.*, l.nama, l.nisn from blanko b left join lulusan l on l.blanko_id=b.id
        where ($1='' or b.status=$1) order by b.no_seri limit ${req.query.semua ? 5000 : 500}`, [st])).rows;
      return res.json({ ringkas, data });
    }
    if (req.method !== 'POST') return res.status(405).end();
    const b = req.body, log = (id, aksi, d) => c.query('insert into blanko_log(blanko_id,aksi,detail,oleh) values($1,$2,$3,$4)', [id, aksi, d, u.oleh]);
    await c.query('begin');
    if (b.aksi === 'tambah') {
      perlu('blanko.stok');
      const dari = +b.dari, sampai = +b.sampai, pj = +b.panjang || 0;
      if (!(sampai >= dari) || sampai - dari > 2000) throw err(400, 'Rentang nomor tidak valid (maksimal 2001 blanko)');
      for (let i = dari; i <= sampai; i++) {
        const r = await c.query('insert into blanko(no_seri) values($1) on conflict do nothing returning id', [(b.awalan || '') + String(i).padStart(pj, '0')]);
        if (r.rows[0]) await log(r.rows[0].id, 'masuk', 'Stok baru');
      }
    } else if (b.aksi === 'pakai') {
      perlu('blanko.pakai');
      const l = (await c.query('select blanko_id from lulusan where id=$1 for update', [b.lulusan_id])).rows[0];
      if (!l) throw err(404, 'Data lulusan tidak ada');
      if (l.blanko_id) throw err(400, 'Lulusan ini sudah memegang blanko');
      const k = (await c.query(`select id,no_seri from blanko where status='tersedia' order by no_seri limit 1 for update skip locked`)).rows[0];
      if (!k) throw err(400, 'Stok blanko habis');
      await c.query(`update blanko set status='terpakai', diubah=now() where id=$1`, [k.id]);
      await c.query('update lulusan set blanko_id=$1, tgl_terbit=current_date where id=$2', [k.id, b.lulusan_id]);
      await log(k.id, 'dipakai', 'Lulusan id ' + b.lulusan_id);
    } else if (b.aksi === 'status') {
      perlu('blanko.status');
      if (!['rusak', 'hilang', 'dikembalikan'].includes(b.status)) throw err(400, 'Status tidak valid');
      if (b.status !== 'dikembalikan' && !b.keterangan) throw err(400, 'Alasan wajib diisi');
      const k = (await c.query('select status from blanko where id=$1 for update', [b.blanko_id])).rows[0];
      if (!k || ['rusak', 'hilang', 'dikembalikan'].includes(k.status)) throw err(400, 'Status blanko ini sudah final');
      if (k.status === 'terpakai' && b.status !== 'rusak') throw err(400, 'Blanko terpakai hanya bisa ditandai rusak (salah cetak)');
      await c.query('update lulusan set blanko_id=null, tgl_terbit=null where blanko_id=$1', [b.blanko_id]);
      await c.query('update blanko set status=$1, keterangan=$2, diubah=now() where id=$3', [b.status, b.keterangan || null, b.blanko_id]);
      await log(b.blanko_id, b.status, b.keterangan || '');
    } else throw err(400, 'Aksi tidak dikenal');
    await c.query('commit'); res.json({ ok: 1 });
  } catch (e) { await c.query('rollback').catch(() => {}); fail(res, e); } finally { c.release(); }
};
