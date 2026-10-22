// Riwayat perubahan data lulusan. Selalu dipanggil di dalam transaksi yang sama dengan perubahannya,
// jadi tidak mungkin ada perubahan tanpa catatan (atau sebaliknya).

// daftar: [{ id, aksi, nama, nisn, jenjang, detail, oleh }]
exports.catat = async (c, daftar) => {
  if (!daftar.length) return;
  const kol = f => daftar.map(f);
  await c.query(`insert into lulusan_log(lulusan_id,aksi,nama,nisn,jenjang,detail,oleh)
    select i,a,n,s,j,d::jsonb,o from unnest($1::int[],$2::text[],$3::text[],$4::text[],$5::text[],$6::text[],$7::text[]) as t(i,a,n,s,j,d,o)`,
    [kol(x => x.id ?? null), kol(x => x.aksi), kol(x => x.nama ?? null), kol(x => x.nisn ?? null), kol(x => x.jenjang ?? null),
     kol(x => x.detail ? JSON.stringify(x.detail) : null), kol(x => x.oleh || null)]);
};

// kolom yang berbeda antara data lama dan baru (nilai dibandingkan sebagai teks; kosong = null)
exports.selisih = (lama, baru, kolom) => kolom.filter(k => String(baru[k] ?? '') !== String(lama[k] ?? '')).map(k => ({ k, lama: lama[k] ?? null, baru: baru[k] ?? null }));
