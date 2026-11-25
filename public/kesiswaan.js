// Kesiswaan (v5.0): Data Siswa, Surat (aktif, menerima siswa pindahan, mutasi), dan Pendaftaran Siswa Baru.
// Memakai fungsi bawaan index.html: $, E, api, can, I, ini, tab, lgu, doc, keluarkan, pmenu, PR.
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const kd = d => d ? String(d).slice(0, 10) : '';
const kTg = d => { d = kd(d); const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); return m ? `${+m[3]} ${BLN[+m[2] - 1]} ${m[1]}` : ''; };
const kHari = () => { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); };
const kTA = () => { const n = new Date(), y = n.getFullYear(); return n.getMonth() >= 6 ? y + '/' + (y + 1) : (y - 1) + '/' + y; };
const kJK = v => v == 'L' ? 'Laki-laki' : v == 'P' ? 'Perempuan' : '';
const kSetara = (j, up) => j ? (up ? j.toUpperCase() : j) + ' setara ' + ({ A: 'SD', B: 'SMP', C: 'SMA' }[j.slice(-1)] || '') : '................';
const kStat = { aktif: 's-diambil', pindah: 's-tercetak', lulus: 's-lulus', nonaktif: 's-duplikat', baru: 's-lulus', diverifikasi: 's-tercetak', diterima: 's-diambil', ditolak: 's-duplikat' };
const kSel = (id, opts, v) => `<select id="${id}">${opts.map(([a, b]) => `<option value="${a}" ${a == v ? 'selected' : ''}>${b}</option>`).join('')}</select>`;
const kTbl = 'style="padding:4px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;font-size:13px"';

// ================= kerangka halaman (dibuat sekali) =================
document.addEventListener('DOMContentLoaded', () => {
  $('#t5').innerHTML = `<div class="mc up srch"><div class="sbx"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="ks-q" type="search" placeholder="Cari nama siswa..." autocomplete="off" oninput="ksTunda()" onkeydown="if(event.key=='Enter')ksCari()"></div>
<div class="chips" id="ks-jc"><button class="on" onclick="ksJen('',this)">Semua</button><button onclick="ksJen('Paket A',this)">Paket A</button><button onclick="ksJen('Paket B',this)">Paket B</button><button onclick="ksJen('Paket C',this)">Paket C</button></div>
<div class="fr"><select id="ks-st" onchange="ksCari()"><option value="aktif">Siswa aktif</option><option value="">Semua status</option><option value="pindah">Pindah (mutasi)</option><option value="lulus">Lulus</option><option value="nonaktif">Nonaktif</option></select><input id="ks-kl" placeholder="Kelas (mis. 9 B)" oninput="ksTunda()"><input id="ks-an" type="number" placeholder="Angkatan" oninput="ksTunda()"></div>
<div class="fr"><button class="p" onclick="ksCari()">Tampilkan</button><button onclick="ksReset()">Reset filter</button><button data-iz="siswa.ubah" onclick="ksForm()">+ Tambah siswa</button><button data-iz="siswa.ubah" onclick="$('#ks-csv').click()">Impor CSV</button><input id="ks-csv" type="file" accept=".csv" hidden onchange="ksImpor(this)"><button onclick="ksEkspor()">Ekspor CSV</button></div>
<div class="cnt" id="ks-cnt"></div><div id="ks-rows"></div></div>`;
  $('#t6').innerHTML = `<div class="mc up srch"><div class="fr"><button class="p" data-iz="surat.buat" onclick="srForm('aktif')">+ Surat Keterangan Aktif</button><button class="p" data-iz="surat.buat" onclick="srForm('diterima')">+ Menerima Siswa Pindahan</button><button class="p" data-iz="surat.buat" onclick="srForm('mutasi')">+ Surat Mutasi (Keluar)</button></div>
<div class="fr"><select id="sr-j" onchange="srCari()"><option value="">Semua jenis surat</option><option value="aktif">Surat Keterangan Aktif</option><option value="diterima">Menerima Siswa Pindahan</option><option value="mutasi">Mutasi (Keluar)</option></select><input id="sr-t" type="number" placeholder="Tahun surat" oninput="srTunda()"><input id="sr-q" type="search" placeholder="Cari nama atau nomor surat" oninput="srTunda()"></div>
<div class="cnt" id="sr-cnt"></div><div id="sr-rows"></div></div>`;
  $('#t7').innerHTML = `<div class="mc up srch"><div id="kp-info" class="dc" style="margin:0 0 10px"></div>
<div class="fr"><select id="kp-st" onchange="kpCari()"><option value="">Semua status</option><option value="baru">Baru masuk</option><option value="diverifikasi">Diverifikasi</option><option value="diterima">Diterima</option><option value="ditolak">Ditolak</option></select><input id="kp-q" type="search" placeholder="Cari nama, no. pendaftaran, NISN, NIK" oninput="kpTunda()"></div>
<div class="cnt" id="kp-cnt"></div><div id="kp-rows"></div></div>`;
  document.body.insertAdjacentHTML('beforeend', `
<dialog id="ks-d"><form method="dialog" onsubmit="ksSimpan(event);return false"><h3 id="ks-dt" style="margin:0 0 12px;font-size:16px">Data siswa</h3><div class="g" id="ks-f"></div>
<div class="bar" style="margin:14px 0 0;justify-content:end"><button type="button" class="adm" id="ks-hp" onclick="ksHapus()">Hapus</button><button type="button" onclick="this.closest('dialog').close()">Batal</button><button class="p">Simpan</button></div></form></dialog>
<dialog id="ks-di" style="max-width:980px"><h3 style="margin:0 0 2px;font-size:16px">Pratinjau impor data siswa</h3><div id="ks-if" style="font-size:13px;color:var(--mut);margin-bottom:10px"></div>
<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:8px;font-size:14px"><label style="display:flex;gap:6px;align-items:center;color:var(--ink);font-size:14px"><input type="radio" name="ks-m" value="lewati" checked style="width:auto;margin:0" onchange="ksMode(this.value)">Lewati siswa yang sudah ada</label><label style="display:flex;gap:6px;align-items:center;color:var(--ink);font-size:14px"><input type="radio" name="ks-m" value="perbarui" style="width:auto;margin:0" onchange="ksMode(this.value)">Perbarui siswa yang sudah ada (hanya kolom yang terisi)</label></div>
<div class="tg" id="ks-is" style="margin-bottom:8px"></div><div style="max-height:44vh;overflow:auto;border:1px solid var(--line);border-radius:6px"><table id="ks-it" style="width:100%;border-collapse:collapse"></table></div>
<div class="bar" style="margin:14px 0 0;justify-content:end"><button type="button" onclick="$('#ks-di').close()">Batal</button><button type="button" class="p" id="ks-iok" onclick="ksImporSimpan()" disabled>Simpan</button></div></dialog>
<dialog id="sr-d" style="max-width:820px"><form method="dialog" onsubmit="srSimpan(event);return false"><h3 id="sr-dt" style="margin:0 0 12px;font-size:16px"></h3><div id="sr-pk"></div><div class="g" id="sr-f"></div>
<div class="bar" style="margin:14px 0 0;justify-content:end"><button type="button" onclick="this.closest('dialog').close()">Batal</button><button class="p">Simpan ke register</button></div></form></dialog>
<dialog id="kp-d"><form method="dialog" onsubmit="kpSimpanPeng(event);return false"><h3 style="margin:0 0 12px;font-size:16px">Pengaturan pendaftaran siswa baru</h3>
<label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="kp-buka" style="width:auto;margin:0"> Pendaftaran dibuka (formulir publik aktif)</label>
<label style="margin-top:8px">Tahun ajaran<input id="kp-ta" placeholder="2027/2028"></label><label style="margin-top:8px">Informasi untuk pendaftar (opsional)<input id="kp-if" maxlength="600" placeholder="mis. Bawa fotokopi KK dan akta lahir saat daftar ulang"></label>
<div class="bar" style="margin:14px 0 0;justify-content:end"><button type="button" onclick="this.closest('dialog').close()">Batal</button><button class="p">Simpan</button></div></form></dialog>`);
  terap();
});

// ================= DATA SISWA =================
let KS = [], ksJ = '', ksT;
const KF = [['nama', 'Nama lengkap'], ['nis', 'NIS / NIPD'], ['nisn', 'NISN'], ['nik', 'NIK'], ['jk', 'Jenis kelamin', 'sel:,L,P'], ['tempat_lahir', 'Tempat lahir'], ['tgl_lahir', 'Tanggal lahir', 'date'],
  ['ayah', 'Nama ayah'], ['ibu', 'Nama ibu'], ['alamat', 'Alamat'], ['hp', 'No HP'], ['jenjang', 'Jenjang', 'sel:,Paket A,Paket B,Paket C'], ['kelas', 'Kelas'], ['angkatan', 'Angkatan (tahun masuk)', 'number'],
  ['asal_sekolah', 'Asal sekolah'], ['status', 'Status', 'sel:aktif,pindah,lulus,nonaktif'], ['catatan', 'Catatan']];
const siswaMuat = () => { if (!$('#ks-rows').innerHTML) ksCari(); else ksCari(); };
function ksTunda() { clearTimeout(ksT); ksT = setTimeout(ksCari, 300); }
function ksJen(v, el) { ksJ = v; document.querySelectorAll('#ks-jc button').forEach(x => x.classList.toggle('on', x == el)); ksCari(); }
function ksReset() { ksJ = ''; document.querySelectorAll('#ks-jc button').forEach((x, i) => x.classList.toggle('on', i == 0)); $('#ks-q').value = $('#ks-kl').value = $('#ks-an').value = ''; $('#ks-st').value = 'aktif'; ksCari(); }
const ksQuery = () => new URLSearchParams({ q: $('#ks-q').value.trim(), jenjang: ksJ, status: $('#ks-st').value, kelas: $('#ks-kl').value.trim(), angkatan: $('#ks-an').value.trim() });
async function ksCari() {
  clearTimeout(ksT); KS = await api('siswa?' + ksQuery());
  $('#ks-cnt').textContent = KS.length + ' siswa' + (KS.length >= 300 ? ' (menampilkan 300 pertama, persempit dengan filter)' : '');
  $('#ks-rows').innerHTML = KS.map((r, i) => `<div class="lc"><div class="lav j${E((r.jenjang || '').slice(-1))}">${E(ini(r.nama))}</div><div class="lb"><b>${E(r.nama)}</b><small>NISN ${E(r.nisn) || '-'} · NIS ${E(r.nis) || '-'}</small>
<div class="tg"><span class="tag j${E((r.jenjang || '').slice(-1))}">${E(r.jenjang) || '-'}</span><span class="tag">${r.kelas ? 'Kelas ' + E(r.kelas) : 'Kelas -'}</span><span class="tag ${kStat[r.status] || ''}">${E(r.status)}</span></div>
<small>${E([r.tempat_lahir, kTg(r.tgl_lahir)].filter(Boolean).join(', ')) || '-'}${r.hp ? ' · HP ' + E(r.hp) : ''}</small>
<div class="ac">${can('siswa.ubah') ? `<button class="p" onclick="ksForm(${i})">Ubah</button>` : ''}${can('surat.buat') && r.status == 'aktif' ? `<button onclick="srDari(${i},'aktif')">Surat aktif</button><button onclick="srDari(${i},'mutasi')">Mutasi</button>` : ''}</div></div></div>`).join('')
    || '<div class="kosong">Belum ada siswa yang cocok. Tambah siswa atau impor CSV (hasil unduhan aplikasi absensi bisa langsung dipakai).</div>';
}
function ksForm(i) {
  const r = i == null ? { status: 'aktif', angkatan: new Date().getFullYear() } : KS[i];
  $('#ks-dt').textContent = i == null ? 'Tambah siswa' : 'Ubah data siswa';
  $('#ks-f').innerHTML = KF.map(([k, l, t]) => { const v = E(String(r[k] ?? '').slice(0, t == 'date' ? 10 : 200));
    return t && t.startsWith('sel') ? `<label>${l}<select name="${k}">${t.slice(4).split(',').map(o => `<option ${o == r[k] ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`
      : `<label style="${k == 'alamat' || k == 'catatan' ? 'grid-column:1/3' : ''}">${l}<input name="${k}" type="${t || 'text'}" value="${v}" ${k == 'nama' ? 'required' : ''}></label>`; }).join('') + `<input type="hidden" name="id" value="${r.id || ''}">`;
  $('#ks-hp').hidden = !r.id || !can('siswa.hapus'); $('#ks-d').showModal();
}
async function ksSimpan(e) { const o = Object.fromEntries(new FormData(e.target)); await api('siswa', o); $('#ks-d').close(); ksCari(); }
async function ksHapus() { const id = $('#ks-f [name=id]').value; if (!id || !confirm('Hapus data siswa ini? Surat yang sudah dibuat tetap tersimpan di register.')) return; await api('siswa?id=' + id, null, 'DELETE'); $('#ks-d').close(); ksCari(); }
const kCsv = (d, kolom) => { const sel = v => { v = v == null ? '' : String(v); if (/^[=+@]|^-./.test(v)) v = "'" + v; return /[;"\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return '\ufeff' + [kolom.join(';')].concat(d.map(r => kolom.map(k => sel(/^tgl_/.test(k) ? kd(r[k]) : r[k])).join(';'))).join('\r\n'); };
async function ksEkspor() {
  const p = ksQuery(); p.set('semua', 1); const d = await api('siswa?' + p);
  if (!d.length) return alert('Tidak ada data untuk diekspor');
  const kolom = KF.map(x => x[0]), a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([kCsv(d, kolom)], { type: 'text/csv;charset=utf-8' })); a.download = 'data-siswa-' + kHari() + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
// ---- impor CSV siswa ----
let KI = null;
async function ksImpor(el) {
  const f = el.files[0]; el.value = ''; if (!f) return;
  let t; try { t = (await f.text()).replace(/^\uFEFF/, ''); } catch (e) { return alert('Berkas tidak bisa dibaca'); }
  const l1 = t.split(/\r?\n/, 1)[0], s = [';', '\t', ','].map(c => [c, l1.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  let rows; try { rows = csv(t, s); } catch (e) { return alert(e.message); }
  if (rows.length < 2) return alert('Berkas kosong atau hanya berisi baris judul kolom');
  const h = rows[0].v.map(x => x.trim());
  if (!h.some(x => /^nama( lengkap)?$/i.test(x))) return alert('Baris pertama harus berisi judul kolom, minimal "Nama". Judul yang terbaca: ' + h.join(', '));
  if (rows.length - 1 > 10000) return alert('Terlalu banyak baris (' + (rows.length - 1) + '). Maksimal 10.000 baris per berkas.');
  KI = { mode: 'lewati', seq: 0, baris: rows.slice(1).map(({ v, n }) => { const o = { _baris: n }; h.forEach((k, i) => { if (k) o[k] = (v[i] || '').trim(); }); return o; }) };
  if (JSON.stringify(KI.baris).length > 4e6) { KI = null; return alert('Berkas terlalu besar untuk dikirim sekali. Pecah menjadi beberapa berkas.'); }
  $('#ks-if').textContent = f.name + ' • ' + KI.baris.length + ' baris data'; $('[name=ks-m][value=lewati]').checked = true; $('#ks-di').showModal(); await ksPrat();
}
function ksMode(m) { KI.mode = m; ksPrat(); }
async function ksPrat() {
  const id = ++KI.seq; $('#ks-iok').disabled = true; $('#ks-it').innerHTML = ''; $('#ks-is').textContent = 'Memeriksa...';
  let d; try { d = await api('siswa', { aksi: 'impor', baris: KI.baris, mode: KI.mode, simpan: false }); } catch (e) { $('#ks-is').textContent = ''; return; }
  if (id != KI.seq) return; KI.d = d; const r = d.ringkasan, tulis = r.baru + r.perbarui;
  const chip = (l, n, c) => n ? `<span class="tag" style="background:${c[0]};color:${c[1]}">${l}: ${n}</span>` : '';
  $('#ks-is').innerHTML = chip('Baru', r.baru, ['#dcfce7', '#166534']) + chip('Diperbarui', r.perbarui, ['#dbeafe', '#1e40af']) + chip('Dilewati', r.lewati, ['#e6eaef', '#475569']) + chip('Salah', r.salah, ['#fee2e2', '#991b1b']);
  const HI = { baru: 'Baru', perbarui: 'Diperbarui', lewati: 'Dilewati', salah: 'Salah' };
  $('#ks-it').innerHTML = `<tr><th ${kTbl}>Baris</th><th ${kTbl}>Nama</th><th ${kTbl}>NISN</th><th ${kTbl}>Hasil</th><th ${kTbl}>Catatan</th></tr>` + d.baris.map(x => `<tr><td ${kTbl}>${x.n}</td><td ${kTbl}>${E(x.nama)}</td><td ${kTbl}>${E(x.nisn) || '-'}</td><td ${kTbl}>${HI[x.hasil] || ''}</td><td ${kTbl}>${x.galat.map(g => `<div style="color:#991b1b">✕ ${E(g)}</div>`).join('')}${x.peringatan.map(g => `<div style="color:#92400e">⚠ ${E(g)}</div>`).join('')}</td></tr>`).join('');
  const b = $('#ks-iok'); b.disabled = !!d.error || !tulis; b.textContent = d.error ? 'Perbaiki dulu baris yang salah' : tulis ? `Simpan ${tulis} data` : 'Tidak ada yang perlu disimpan';
}
async function ksImporSimpan() {
  const r = KI.d.ringkasan; if (!confirm(`Simpan ${r.baru} siswa baru dan perbarui ${r.perbarui} siswa?`)) return;
  const d = await api('siswa', { aksi: 'impor', baris: KI.baris, mode: KI.mode, simpan: true });
  $('#ks-di').close(); alert(d.disimpan ? 'Impor selesai.' : 'Tidak ada yang disimpan.'); KI = null; ksCari();
}

// ================= SURAT =================
let KR = [], srT;
const JN = { aktif: 'Surat Keterangan Aktif', diterima: 'Menerima Siswa Pindahan', mutasi: 'Surat Mutasi (Keluar)' };
const PAT = { aktif: () => I.no_aktif || '421.9/{n}/PKBM-NI/{bulan}/{tahun}', diterima: () => I.no_diterima || '400.3.3/{nnn}/PKBM-NI/{bulan}/{tahun}', mutasi: () => I.no_mutasi || '421.3/{nnn}/PKBM-NI/{bulan}/{tahun}' };
const nomorDari = (jenis, urut, tg) => { const [y, m] = kd(tg).split('-'); return PAT[jenis]().replace(/\{nnn\}/g, String(urut).padStart(3, '0')).replace(/\{n\}/g, urut).replace(/\{bulan\}/g, ROM[+m - 1] || '').replace(/\{tahun\}/g, y); };
const SF = {
  aktif: [['nama', 'Nama lengkap'], ['nik', 'NIK'], ['nis', 'NIS'], ['nisn', 'NISN'], ['tempat_lahir', 'Tempat lahir'], ['tgl_lahir', 'Tanggal lahir', 'date'], ['jk', 'Jenis kelamin', 'sel:,L,P'], ['kelas', 'Rombel / kelas'],
    ['ayah', 'Nama ayah'], ['ibu', 'Nama ibu'], ['alamat', 'Alamat rumah', 'wide'], ['jenjang', 'Jenjang', 'sel:,Paket A,Paket B,Paket C'], ['tahun_ajaran', 'Tahun pelajaran']],
  diterima: [['nama', 'Nama lengkap'], ['tempat_lahir', 'Tempat lahir'], ['tgl_lahir', 'Tanggal lahir', 'date'], ['jk', 'Jenis kelamin', 'sel:,L,P'], ['asal_sekolah', 'Asal sekolah'], ['wilayah_asal', 'Kecamatan / kota asal sekolah'], ['nisn', 'NISN'], ['hp', 'No telp'],
    ['ayah', 'Nama ayah'], ['ibu', 'Nama ibu'], ['alamat', 'Alamat', 'wide'], ['jenjang', 'Diterima di jenjang', 'sel:,Paket A,Paket B,Paket C'], ['tahun_ajaran', 'Tahun pelajaran'], ['kelas', 'Kelas (bila ditambahkan ke Data Siswa)']],
  mutasi: [['nama', 'Nama lengkap'], ['nis', 'NIS'], ['nisn', 'NISN'], ['tempat_lahir', 'Tempat lahir'], ['tgl_lahir', 'Tanggal lahir', 'date'], ['jk', 'Jenis kelamin', 'sel:,L,P'], ['kelas', 'Kelas terakhir'], ['jenjang', 'Jenjang', 'sel:,Paket A,Paket B,Paket C'],
    ['ayah', 'Nama ayah'], ['ibu', 'Nama ibu'], ['alamat', 'Alamat', 'wide'], ['tujuan', 'Sekolah tujuan'], ['tgl_mutasi', 'Tanggal mutasi', 'date'], ['alasan', 'Alasan pindah', 'wide']],
};
const suratMuat = () => srCari();
function srTunda() { clearTimeout(srT); srT = setTimeout(srCari, 300); }
async function srCari() {
  clearTimeout(srT); KR = await api('surat?' + new URLSearchParams({ jenis: $('#sr-j').value, tahun: $('#sr-t').value.trim(), q: $('#sr-q').value.trim() }));
  $('#sr-cnt').textContent = KR.length + ' surat';
  $('#sr-rows').innerHTML = KR.map((r, i) => `<div class="lc"><div class="lav">${E(ini(r.nama))}</div><div class="lb"><b>${E(r.nama)}</b><small>Nomor: <b>${E(r.nomor)}</b></small>
<div class="tg"><span class="tag s-lulus">${JN[r.jenis]}</span><span class="tag">${kTg(r.tgl_surat)}</span></div><small>Dibuat oleh ${E(r.oleh) || '-'}</small>
<div class="ac"><div class="pm"><button class="pb" onclick="pmenu(event)">${PR} Cetak &#9662;</button><div class="pml" hidden><button onclick="srCetak(${i},'pdf')">Cetak PDF</button><button onclick="srCetak(${i},'jpg')">Simpan JPG</button><button onclick="srCetak(${i},'doc')">Unduh Word</button></div></div>${can('surat.hapus') ? `<button onclick="srHapus(${r.id})">Hapus</button>` : ''}</div></div></div>`).join('')
    || '<div class="kosong">Belum ada surat. Pilih salah satu tombol di atas untuk membuat surat.</div>';
}
async function srHapus(id) { if (!confirm('Hapus surat ini dari register? Status siswa tidak ikut dikembalikan.')) return; await api('surat?id=' + id, null, 'DELETE'); srCari(); }
let SRJ = '', SRT;
function srDari(i, jenis) { tab(6); srForm(jenis, KS[i]); }
function srForm(jenis, s) {
  SRJ = jenis; $('#sr-dt').textContent = JN[jenis];
  const pre = s ? { nama: s.nama, nik: s.nik, nis: s.nis, nisn: s.nisn, tempat_lahir: s.tempat_lahir, tgl_lahir: kd(s.tgl_lahir), jk: s.jk, kelas: s.kelas ? (/^kelas/i.test(s.kelas) ? s.kelas : 'Kelas ' + s.kelas) : '', ayah: s.ayah, ibu: s.ibu, alamat: s.alamat, hp: s.hp, jenjang: s.jenjang } : {};
  pre.tahun_ajaran = kTA(); if (jenis == 'mutasi') pre.tgl_mutasi = kHari();
  $('#sr-pk').innerHTML = jenis == 'diterima' ? '' : `<div style="margin-bottom:10px"><input id="sp-q" placeholder="Cari siswa aktif (ketik nama) lalu pilih..." oninput="spTunda()" autocomplete="off"><select id="sp-s" size="4" onchange="spPilih()" style="margin-top:6px" hidden></select><input type="hidden" id="sp-id" value="${s ? s.id : ''}"></div>`;
  $('#sr-f').innerHTML = SF[jenis].map(([k, l, t]) => { const v = E(pre[k] ?? '');
    return t && t.startsWith('sel') ? `<label>${l}<select name="${k}">${t.slice(4).split(',').map(o => `<option ${o == pre[k] ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`
      : `<label style="${t == 'wide' ? 'grid-column:1/3' : ''}">${l}<input name="${k}" type="${t == 'date' ? 'date' : 'text'}" value="${v}" ${k == 'nama' ? 'required' : ''}></label>`; }).join('')
    + `<label>Tanggal surat<input name="tgl_surat" type="date" value="${kHari()}" required onchange="srNomor()"></label><label>Nomor surat<input name="nomor" required></label><input type="hidden" name="urut">`
    + (jenis == 'diterima' ? `<label style="grid-column:1/3;display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" name="tambah_siswa" style="width:auto;margin:0"> Tambahkan juga ke Data Siswa sebagai siswa aktif</label>` : '');
  $('#sr-d').showModal(); srNomor();
}
async function srNomor() {
  const f = $('#sr-d form').elements, tg = f.tgl_surat.value; if (!tg) return;
  try { const d = await api('surat?urut=' + SRJ + '&tahun=' + tg.slice(0, 4)); f.urut.value = d.urut; f.nomor.value = nomorDari(SRJ, d.urut, tg); } catch (e) {}
}
function spTunda() { clearTimeout(SRT); SRT = setTimeout(async () => {
  const q = $('#sp-q').value.trim(), sel = $('#sp-s'); if (q.length < 2) { sel.hidden = true; return; }
  const d = await api('siswa?status=aktif&q=' + encodeURIComponent(q)); SP = d.slice(0, 20);
  sel.innerHTML = SP.map((r, i) => `<option value="${i}">${E(r.nama)} — ${E(r.jenjang || '')} ${E(r.kelas || '')} (NISN ${E(r.nisn || '-')})</option>`).join('') || '<option disabled>Tidak ditemukan</option>'; sel.hidden = false; }, 300); }
let SP = [];
function spPilih() { const r = SP[+$('#sp-s').value]; if (!r) return; $('#sp-id').value = r.id; const f = $('#sr-d form').elements;
  const m = { nama: r.nama, nik: r.nik, nis: r.nis, nisn: r.nisn, tempat_lahir: r.tempat_lahir, tgl_lahir: kd(r.tgl_lahir), jk: r.jk, kelas: r.kelas ? (/^kelas/i.test(r.kelas) ? r.kelas : 'Kelas ' + r.kelas) : '', ayah: r.ayah, ibu: r.ibu, alamat: r.alamat, jenjang: r.jenjang };
  for (const k in m) if (f[k]) f[k].value = m[k] || ''; $('#sp-q').value = r.nama; $('#sp-s').hidden = true; }
async function srSimpan(e) {
  const f = e.target.elements, data = {};
  SF[SRJ].forEach(([k]) => { if (f[k] && f[k].value.trim()) data[k] = f[k].value.trim(); });
  if (SRJ != 'diterima' && !$('#sp-id').value) { if (SRJ == 'mutasi') return alert('Pilih siswa yang dimutasi dari daftar (ketik nama lalu pilih).'); }
  if (SRJ == 'mutasi' && !data.tujuan) return alert('Isi sekolah tujuan');
  if (SRJ == 'diterima' && !data.asal_sekolah) return alert('Isi asal sekolah');
  const r = await api('surat', { jenis: SRJ, nomor: f.nomor.value.trim(), urut: f.urut.value, tgl_surat: f.tgl_surat.value, siswa_id: $('#sp-id') ? $('#sp-id').value : '', tambah_siswa: SRJ == 'diterima' && f.tambah_siswa.checked, data });
  $('#sr-d').close(); await srCari(); const i = KR.findIndex(x => x.id == r.id);
  if (i >= 0 && confirm('Surat tersimpan di register. Cetak sekarang sebagai PDF?')) srCetak(i, 'pdf');
  if (SRJ != 'aktif') ksCari();
}
// ---- isi surat ----
const jabatan = def => I.jabatan || def;
const baris = rows => `<table class="nb" style="margin:0 0 6px 24px;width:auto">${rows.map(([a, b, tebal]) => `<tr><td style="width:190px;vertical-align:top">${a}</td><td style="width:14px;vertical-align:top">:</td><td style="vertical-align:top">${tebal ? '<b>' + E(b) + '</b>' : E(b) || '-'}</td></tr>`).join('')}</table>`;
const para = s => `<p style="margin:8px 0;text-align:justify;line-height:1.5">${s}</p>`;
const kopS = () => {
  const l = [I.npsn && 'NPSN : ' + E(I.npsn), I.sk && 'SK Kemenhukum No : ' + E(I.sk), I.ijin && E(I.ijin), I.alamat && E(I.alamat)].filter(Boolean).map(x => `<span style="font-size:8.5pt">${x}</span>`).join('<br>');
  return `<table class="nb" style="margin:0"><tr><td style="width:90px"><img src="${lgu()}" alt="" style="width:80px;height:80px;object-fit:contain"></td><td style="text-align:center">${I.yayasan ? `<b style="font-size:13pt">${E(I.yayasan.toUpperCase())}</b><br>` : ''}<b style="font-size:16pt">${E((I.nama || 'NAMA LEMBAGA').toUpperCase())}</b><br>${l}</td><td style="width:90px"></td></tr></table><hr style="border:0;border-top:3px double #000;margin:6px 0 12px">`;
};
const judul = (t, no) => `<p style="text-align:center;margin:4px 0 0"><b><u style="font-size:12pt">${t}</u></b><br>Nomor : ${E(no)}</p><br>`;
const ttdS = (tg, jab) => `<table class="nb" style="margin-top:18px"><tr><td style="width:52%">&nbsp;</td><td style="text-align:center">${E(I.kota || '................')}, ${kTg(tg)}<br>${E(jab)} ${E(I.nama || '')}<br><br><br><br><b><u>${E(I.kepala || '................')}</u></b>${I.nip ? '<br>NIP. ' + E(I.nip) : ''}</td></tr></table>`;
const pejabat = jab => `<p style="margin:0 0 4px">Yang bertanda tangan dibawah ini:</p>` + baris([['Nama', I.kepala || '................'], ['NIP', I.nip || '-'], ['Jabatan', jab + ' ' + (I.nama || '')]]);
function suratHtml(r) {
  const d = r.data || {}, nama = (d.nama || '').toUpperCase(), ttl = [d.tempat_lahir, kTg(d.tgl_lahir)].filter(Boolean).join(', '), wil = I.wilayah ? ' ' + E(I.wilayah) : '';
  let isi;
  if (r.jenis == 'aktif') {
    isi = judul('SURAT KETERANGAN AKTIF SEKOLAH', r.nomor) + para(`Yang bertanda tangan dibawah ini ${E(jabatan('Ketua'))} ${E(I.nama || '')}${wil}, menerangkan bahwa :`)
      + baris([['Nama', nama, 1], ['NIK', d.nik], ['Nomor Induk / NISN', [d.nis, d.nisn].filter(Boolean).join(' / ')], ['Tempat dan Tanggal Lahir', ttl], ['Jenis Kelamin', kJK(d.jk)], ['Rombel / Kelas', d.kelas]])
      + `<p style="margin:6px 0 2px">Nama orang tua / wali murid:</p>` + baris([['Nama Ayah', d.ayah], ['Nama Ibu', d.ibu], ['Alamat Rumah', d.alamat]])
      + para(`Berdasarkan Data Pokok Pendidikan (DAPODIK) ${E(I.nama || '')} peserta didik tersebut adalah benar saat ini tercatat sebagai peserta didik aktif pada ${E(I.nama || '')} di ${E(kSetara(d.jenjang, 1))} pada Tahun Pelajaran ${E(d.tahun_ajaran) || '..........'}.`)
      + para('Demikian Surat Keterangan ini kami buat agar dapat digunakan sebagaimana mestinya.') + ttdS(r.tgl_surat, jabatan('Ketua'));
  } else if (r.jenis == 'diterima') {
    isi = judul('SURAT KETERANGAN MENERIMA SISWA PINDAHAN', r.nomor) + pejabat(jabatan('Kepala')) + `<p style="margin:6px 0 4px">Menerangkan :</p>`
      + baris([['Nama', nama, 1], ['Tempat, Tanggal Lahir', ttl], ['Asal Sekolah', d.asal_sekolah], ['NISN', d.nisn]]) + `<p style="margin:6px 0 2px">Nama Orang tua/Wali :</p>`
      + baris([['Ayah', d.ayah], ['Ibu', d.ibu], ['Alamat', d.alamat], ['No Telp', d.hp]])
      + para(`Berdasarkan keterangan orang tua/wali murid dari nama tersebut diatas, bahwa yang bersangkutan ingin melanjutkan sekolahnya di ${E(I.nama || '')}${wil}, sehubungan pada saat ini masih terdaftar dari sekolah ${E(d.asal_sekolah)}${d.wilayah_asal ? ' ' + E(d.wilayah_asal) : ''} dengan itu sudilah kiranya pihak dari sekolah untuk memberikan surat keterangan Pindah/Mutasi dari Dapodik dan Laporan Hasil Belajar Peserta Didik kepada yang bersangkutan.`)
      + para(`Dan dengan dasar surat keterangan pindah/mutasi tersebut ${E(I.nama || '')} siap <b>MENERIMA</b> peserta didik tersebut diatas, dan dimasukan di Jenjang ${E(kSetara(d.jenjang))} Tahun Pelajaran ${E(d.tahun_ajaran) || '..........'}.`)
      + para('Demikian Surat Keterangan ini kami buat kepada yang bersangkutan agar dapat digunakan sebagaimana mestinya.') + ttdS(r.tgl_surat, jabatan('Kepala'));
  } else {
    isi = judul('SURAT KETERANGAN PINDAH SEKOLAH (MUTASI)', r.nomor) + pejabat(jabatan('Kepala')) + `<p style="margin:6px 0 4px">Menerangkan bahwa :</p>`
      + baris([['Nama', nama, 1], ['Nomor Induk / NISN', [d.nis, d.nisn].filter(Boolean).join(' / ')], ['Tempat, Tanggal Lahir', ttl], ['Jenis Kelamin', kJK(d.jk)], ['Kelas terakhir', d.kelas], ['Nama Ayah', d.ayah], ['Nama Ibu', d.ibu], ['Alamat', d.alamat]])
      + para(`Peserta didik tersebut adalah benar tercatat sebagai peserta didik pada ${E(I.nama || '')}${d.jenjang ? ' di ' + E(kSetara(d.jenjang)) : ''}, dan atas permintaan orang tua/wali murid dinyatakan <b>PINDAH (MUTASI)</b> ke ${E(d.tujuan)}${d.tgl_mutasi ? ' terhitung mulai tanggal ' + kTg(d.tgl_mutasi) : ''}${d.alasan ? ' dengan alasan ' + E(d.alasan) : ''}.`)
      + para('Demikian Surat Keterangan ini kami buat agar dapat digunakan sebagaimana mestinya.') + ttdS(r.tgl_surat, jabatan('Kepala'));
  }
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11pt">${kopS()}${isi}</div>`;
}
function srCetak(i, fmt) {
  const r = KR[i]; if (!r) return; const html = suratHtml(r), nm = JN[r.jenis] + ' - ' + (r.nama || '');
  if (fmt == 'doc') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff', doc(html, 'portrait')], { type: 'application/msword' })); a.download = nm.replace(/[\\/:*?"<>|]/g, '') + '.doc'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  else keluarkan(fmt, html, 'portrait', nm);
}

// ================= PENDAFTARAN SISWA BARU =================
let KP = [], kpT, KPC = {};
function kpTunda() { clearTimeout(kpT); kpT = setTimeout(kpCari, 300); }
async function ppdbMuat() {
  try { KPC = await api('ppdb?pengaturan=1'); } catch (e) { KPC = {}; }
  const url = location.origin + '/daftar.html';
  $('#kp-info').innerHTML = `<div class="dh"><h3>Pendaftaran ${KPC.buka ? '<span class="tag s-diambil">DIBUKA</span>' : '<span class="tag s-duplikat">DITUTUP</span>'}</h3><button class="p" data-iz="ppdb.kelola" onclick="kpPeng()">Atur pendaftaran</button></div>
<p class="mut" style="margin:0 0 6px;font-size:13px">Tahun ajaran: <b>${E(KPC.tahun_ajaran) || '-'}</b>. Bagikan tautan ini kepada calon siswa:</p>
<div style="display:flex;gap:8px;flex-wrap:wrap"><input readonly value="${E(url)}" onclick="this.select()" style="flex:1;min-width:220px"><button onclick="navigator.clipboard&&navigator.clipboard.writeText('${E(url)}').then(()=>alert('Tautan disalin'))">Salin tautan</button></div>`;
  terap(); kpCari();
}
async function kpCari() {
  clearTimeout(kpT); KP = await api('ppdb?' + new URLSearchParams({ status: $('#kp-st').value, q: $('#kp-q').value.trim() }));
  $('#kp-cnt').textContent = KP.length + ' pendaftar';
  const kel = can('ppdb.kelola');
  $('#kp-rows').innerHTML = KP.map((r, i) => `<div class="lc"><div class="lav j${E((r.jenjang || '').slice(-1))}">${E(ini(r.nama))}</div><div class="lb"><b>${E(r.nama)}</b><small>${E(r.no_daftar) || '-'} · ${r.jenis == 'pindahan' ? 'Pindahan' : 'Siswa baru'}${r.asal_sekolah ? ' dari ' + E(r.asal_sekolah) : ''}</small>
<div class="tg"><span class="tag j${E((r.jenjang || '').slice(-1))}">${E(r.jenjang) || '-'}</span><span class="tag">${E(r.tahun_ajaran) || '-'}</span><span class="tag ${kStat[r.status] || ''}">${E(r.status)}</span></div>
<small>${E([r.tempat_lahir, kTg(r.tgl_lahir)].filter(Boolean).join(', '))} · HP ${E(r.hp) || '-'}${r.nik ? ' · NIK ' + E(r.nik) : ''}${r.nisn ? ' · NISN ' + E(r.nisn) : ''}</small>
<small>${E([r.ayah && 'Ayah: ' + r.ayah, r.ibu && 'Ibu: ' + r.ibu].filter(Boolean).join(' · '))}${r.alamat ? ' · ' + E(r.alamat) : ''}</small>
<div class="ac">${kel && r.status != 'diterima' ? `<button class="p" onclick="kpTerima(${i})">Terima (jadikan siswa)</button>${r.status == 'baru' ? `<button onclick="kpStatus(${r.id},'diverifikasi')">Tandai diverifikasi</button>` : ''}${r.status != 'ditolak' ? `<button onclick="kpStatus(${r.id},'ditolak')">Tolak</button>` : ''}` : ''}${kel ? `<button onclick="kpHapus(${r.id})">Hapus</button>` : ''}</div></div></div>`).join('')
    || '<div class="kosong">Belum ada pendaftar.</div>';
}
async function kpStatus(id, status) { let catatan; if (status == 'ditolak') { catatan = prompt('Alasan penolakan (opsional):'); if (catatan === null) return; } await api('ppdb', { aksi: 'status', id, status, catatan }); kpCari(); }
async function kpTerima(i) { const r = KP[i], kelas = prompt(`Terima ${r.nama} sebagai siswa aktif.\nKelas (boleh dikosongkan):`, ''); if (kelas === null) return; await api('ppdb', { aksi: 'terima', id: r.id, kelas }); alert('Pendaftar diterima dan masuk ke Data Siswa.'); kpCari(); }
async function kpHapus(id) { if (!confirm('Hapus data pendaftar ini?')) return; await api('ppdb?id=' + id, null, 'DELETE'); kpCari(); }
function kpPeng() { $('#kp-buka').checked = !!KPC.buka; $('#kp-ta').value = KPC.tahun_ajaran || ''; $('#kp-if').value = KPC.info || ''; $('#kp-d').showModal(); }
async function kpSimpanPeng(e) { await api('ppdb', { aksi: 'pengaturan', buka: $('#kp-buka').checked, tahun_ajaran: $('#kp-ta').value, info: $('#kp-if').value }); $('#kp-d').close(); ppdbMuat(); }
