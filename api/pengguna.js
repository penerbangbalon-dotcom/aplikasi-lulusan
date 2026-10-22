const { pool, auth, fail, err, hash, IZIN, SEMUA } = require('./_lib');
// Kelola pengguna dan peran. Semua aksi perlu hak akses pengguna.kelola.
module.exports = async (req, res) => {
  const u = await auth(req, res, 'pengguna.kelola'); if (!u) return;
  try {
    if (req.method === 'GET') {
      const pengguna = (await pool.query(`select g.id,g.username,g.nama,g.aktif,g.peran_id,p.nama peran,g.dibuat from pengguna g join peran p on p.id=g.peran_id order by g.nama`)).rows;
      const peran = (await pool.query(`select p.id,p.nama,p.keterangan,p.izin,p.sistem,(select count(*)::int from pengguna g where g.peran_id=p.id) jumlah from peran p order by p.sistem desc, p.nama`)).rows;
      return res.json({ pengguna, peran, daftarIzin: IZIN, saya: u.id || 0 });
    }
    if (req.method !== 'POST') return res.status(405).end();
    const b = req.body || {}, s = x => String(x == null ? '' : x).trim();

    if (b.aksi === 'pengguna') {
      const username = s(b.username).toLowerCase(), nama = s(b.nama), sandi = String(b.sandi || '');
      if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw err(400, 'Username 3-30 karakter: huruf kecil, angka, titik, garis bawah, atau strip');
      if (!nama) throw err(400, 'Nama wajib diisi');
      if (!(+b.peran_id > 0)) throw err(400, 'Pilih peran');
      if (sandi && sandi.length < 8) throw err(400, 'Kata sandi minimal 8 karakter');
      if (b.id) {
        // akun sendiri: peran dan status aktif tidak boleh diubah agar tidak mengunci diri sendiri
        const diri = +b.id === u.id, set = { username, nama };
        if (!diri) { set.peran_id = +b.peran_id; set.aktif = !!b.aktif; }
        if (sandi) set.sandi = hash(sandi);
        const k = Object.keys(set);
        const r = await pool.query(`update pengguna set ${k.map((x, i) => x + '=$' + (i + 1))} where id=$${k.length + 1}`, [...k.map(x => set[x]), +b.id]);
        if (!r.rowCount) throw err(404, 'Pengguna tidak ditemukan');
      } else {
        if (!sandi) throw err(400, 'Kata sandi wajib diisi untuk pengguna baru');
        await pool.query('insert into pengguna(username,nama,sandi,peran_id,aktif) values($1,$2,$3,$4,$5)', [username, nama, hash(sandi), +b.peran_id, b.aktif !== false]);
      }
      return res.json({ ok: 1 });
    }
    if (b.aksi === 'hapus_pengguna') {
      if (+b.id === u.id) throw err(400, 'Akun yang sedang dipakai tidak dapat dihapus');
      await pool.query('delete from pengguna where id=$1', [+b.id]);
      return res.json({ ok: 1 });
    }
    if (b.aksi === 'peran') {
      const nama = s(b.nama), izin = [...new Set((Array.isArray(b.izin) ? b.izin : []).filter(x => SEMUA.includes(x)))];
      if (!nama) throw err(400, 'Nama peran wajib diisi');
      if (b.id) {
        const p = (await pool.query('select sistem from peran where id=$1', [+b.id])).rows[0];
        if (!p) throw err(404, 'Peran tidak ditemukan');
        if (p.sistem) throw err(400, 'Peran Administrator selalu memiliki semua hak akses dan tidak dapat diubah');
        await pool.query('update peran set nama=$1, keterangan=$2, izin=$3 where id=$4', [nama, s(b.keterangan) || null, izin, +b.id]);
      } else await pool.query('insert into peran(nama,keterangan,izin) values($1,$2,$3)', [nama, s(b.keterangan) || null, izin]);
      return res.json({ ok: 1 });
    }
    if (b.aksi === 'hapus_peran') {
      const p = (await pool.query('select sistem from peran where id=$1', [+b.id])).rows[0];
      if (!p) throw err(404, 'Peran tidak ditemukan');
      if (p.sistem) throw err(400, 'Peran Administrator tidak dapat dihapus');
      const n = (await pool.query('select count(*)::int n from pengguna where peran_id=$1', [+b.id])).rows[0].n;
      if (n) throw err(400, `Peran ini masih dipakai ${n} pengguna. Pindahkan dulu penggunanya ke peran lain.`);
      await pool.query('delete from peran where id=$1', [+b.id]);
      return res.json({ ok: 1 });
    }
    throw err(400, 'Aksi tidak dikenal');
  } catch (e) {
    fail(res, e.code === '23505' ? err(400, 'Username atau nama peran sudah dipakai') : e.code === '23503' ? err(400, 'Peran tidak valid') : e);
  }
};
