const { pool, auth, fail, err } = require('./_lib');
const { tgl } = require('./_impor');
const { bersih, KOLOM, STATUS } = require('./_siswa');
const SEL = 'id,' + KOLOM.join(',');
const uniq = e => e && e.code === '23505' ? err(409, 'NISN dengan jenjang yang sama sudah ada di Data Siswa') : e;

module.exports = async (req, res) => {
  const u = await auth(req, res, req.method === 'GET' ? 'siswa.lihat' : req.method === 'DELETE' ? 'siswa.hapus' : 'siswa.ubah'); if (!u) return;
  try {
    if (req.method === 'GET') {
      const { q = '', jenjang = '', status = '', kelas = '', angkatan = '' } = req.query;
      const kata = String(q).trim().split(/\s+/).filter(Boolean).map(k => '%' + k.replace(/[\\%_]/g, '\\$&') + '%');
      const r = await pool.query(`select ${SEL} from siswa where ($1::text[] = '{}' or (nama ilike all($1::text[]))) and ($2='' or jenjang=$2) and ($3='' or status=$3)
        and ($4='' or lower(kelas)=lower($4)) and ($5='' or angkatan::text=$5) order by nama, id limit ${req.query.semua ? 5000 : 300}`, [kata, jenjang, status, kelas, angkatan]);
      return res.json(r.rows);
    }
    if (req.method === 'DELETE') {
      const id = +req.query.id; if (!Number.isInteger(id)) throw err(400, 'ID tidak valid');
      const r = await pool.query('delete from siswa where id=$1', [id]);
      if (!r.rowCount) throw err(404, 'Data siswa tidak ditemukan');
      return res.json({ ok: 1 });
    }
    if (req.method !== 'POST') return res.status(405).end();
    const b = req.body || {};

    if (b.aksi === 'impor') { // pratinjau (simpan=false) tidak pernah menulis; simpan=true menyimpan semuanya dalam satu transaksi
      const rows = Array.isArray(b.baris) ? b.baris : [];
      if (!rows.length || rows.length > 10000) throw err(400, 'Kirim 1 sampai 10.000 baris');
      const perbarui = b.mode === 'perbarui', c = await pool.connect();
      try {
        await c.query('begin');
        const hasil = rows.map((m, i) => ({ n: m._baris || i + 2, ...bersih(m) }));
        const nisnList = [...new Set(hasil.map(h => h.v.nisn).filter(Boolean))];
        const ada = new Map((nisnList.length ? (await c.query('select id,nisn,lower(coalesce(jenjang,\'\')) j from siswa where nisn=any($1)', [nisnList])).rows : []).map(x => [x.nisn + '|' + x.j, x.id]));
        const lihat = new Set(); const ringkas = { baru: 0, perbarui: 0, lewati: 0, salah: 0 };
        for (const h of hasil) {
          if (h.v.nisn) { const k = h.v.nisn + '|' + (h.v.jenjang || '').toLowerCase(); if (lihat.has(k)) h.galat.push('NISN dan jenjang kembar di dalam berkas'); lihat.add(k); h.kunci = k; }
          if (h.galat.length) { h.hasil = 'salah'; ringkas.salah++; continue; }
          const id = h.kunci && ada.get(h.kunci);
          h.hasil = id ? (perbarui ? 'perbarui' : 'lewati') : 'baru'; h.id = id; ringkas[h.hasil]++;
        }
        const error = ringkas.salah > 0;
        if (b.simpan && !error) {
          for (const h of hasil) {
            if (h.hasil === 'baru') {
              const v = { ...h.v, status: h.v.status || 'aktif' };
              await c.query(`insert into siswa(${KOLOM}) values(${KOLOM.map((_, i) => '$' + (i + 1))})`, KOLOM.map(k => v[k]));
            } else if (h.hasil === 'perbarui') { // hanya kolom yang terisi di berkas yang diganti
              const ks = KOLOM.filter(k => h.v[k] != null);
              if (ks.length) await c.query(`update siswa set ${ks.map((k, i) => k + '=$' + (i + 1))}, diubah=now() where id=$${ks.length + 1}`, [...ks.map(k => h.v[k]), h.id]);
            }
          }
        }
        await c.query(b.simpan && !error ? 'commit' : 'rollback');
        return res.json({ ringkasan: ringkas, error, disimpan: !!b.simpan && !error,
          baris: hasil.filter(h => h.galat.length || h.peringatan.length).concat(hasil.filter(h => !h.galat.length && !h.peringatan.length)).slice(0, 2000)
            .map(h => ({ n: h.n, nama: h.v.nama, nisn: h.v.nisn, hasil: h.hasil, galat: h.galat, peringatan: h.peringatan })) });
      } catch (e) { await c.query('rollback').catch(() => {}); throw uniq(e); } finally { c.release(); }
    }

    if (b.aksi === 'status') { // ubah status banyak siswa sekaligus
      const ids = [...new Set((Array.isArray(b.ids) ? b.ids : []).map(Number).filter(Number.isInteger))];
      if (!ids.length || ids.length > 5000) throw err(400, 'Pilih 1 sampai 5000 siswa');
      if (!STATUS.includes(b.status)) throw err(400, 'Status tidak valid');
      const t = tgl(String(b.tgl || '').trim()) || new Date().toISOString().slice(0, 10);
      const r = await pool.query('update siswa set status=$1, tgl_status=$2, diubah=now() where id=any($3)', [b.status, t, ids]);
      return res.json({ ok: 1, diubah: r.rowCount });
    }

    const { v, galat } = bersih(b);
    if (galat.length) throw err(400, galat[0]);
    v.status = v.status || 'aktif';
    try {
      if (b.id) {
        const id = +b.id;
        const r = await pool.query(`update siswa set ${KOLOM.map((k, i) => k + '=$' + (i + 1))}, diubah=now() where id=$${KOLOM.length + 1} returning id`, [...KOLOM.map(k => v[k]), id]);
        if (!r.rowCount) throw err(404, 'Data siswa tidak ditemukan');
        return res.json({ ok: 1, id });
      }
      const r = await pool.query(`insert into siswa(${KOLOM}) values(${KOLOM.map((_, i) => '$' + (i + 1))}) returning id`, KOLOM.map(k => v[k]));
      return res.json({ ok: 1, id: r.rows[0].id });
    } catch (e) { throw uniq(e); }
  } catch (e) { fail(res, e); }
};
