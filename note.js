// Note e immagini di riferimento sotto ogni uscita del PED; salvate nel foglio e su Drive via Apps Script (apps-script/Code.gs)
(() => {
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbycVzYLQGVT8SbNbbzIvwPrP60JDTo9AgLYkFsizrkOdsg7o27g01-8bE2yhv9HAaC5BQ/exec';
  const KEY_NOME = 'rcped-nome';

  const css = `
.nt{margin-top:14px;border-top:1px dashed #3a3640;padding-top:12px;max-width:65ch}
.nt h4{margin:0 0 8px;font:600 12px/1 var(--body);text-transform:uppercase;letter-spacing:.12em;color:var(--warn)}
.nt-list{display:grid;gap:8px;margin-bottom:10px}
.nt-n{background:#1b1a20;border-left:3px solid var(--warn);border-radius:6px;padding:8px 10px;font-size:14px;white-space:pre-line;position:relative}
.nt-n small,.nt-i small{display:block;color:var(--mu);font-size:12px;margin-bottom:2px}
.nt-x{position:absolute;top:4px;right:6px;background:none;border:0;color:var(--mu);cursor:pointer;font-size:16px;line-height:1;padding:4px}
.nt-x:hover{color:var(--red)}
.nt-imgs{display:flex;flex-wrap:wrap;gap:8px}
.nt-i{position:relative;width:120px}
.nt-i a{display:block}.nt-i img{width:120px;height:120px;object-fit:cover;border-radius:6px;background:#000;display:block}
.nt-i .nt-x{background:#000a;border-radius:4px;color:#fff;top:20px}
.nt-f{display:grid;gap:8px}
.nt-f textarea{width:100%;box-sizing:border-box;min-height:64px;resize:vertical;background:#0f0e12;color:var(--fg);border:1px solid #3a3640;border-radius:6px;padding:8px 10px;font:14px/1.4 var(--body)}
.nt-f textarea:focus{outline:2px solid var(--warn);outline-offset:1px}
.nt-r{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.nt-b{background:var(--fg);color:#000;border:0;border-radius:6px;padding:8px 14px;font:600 14px var(--body);cursor:pointer}
.nt-b.alt{background:transparent;color:var(--fg);border:1px solid #4a4550}
.nt-b:disabled{opacity:.5;cursor:wait}
.nt-s{color:var(--mu);font-size:13px}
.nt-top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:var(--panel);border-radius:8px;padding:10px 14px;margin:4px 0 6px}
.nt-top label{color:var(--mu);font-size:14px}
.nt-top input{background:#0f0e12;color:var(--fg);border:1px solid #3a3640;border-radius:6px;padding:7px 10px;font:14px var(--body);min-width:0;flex:1 1 160px;max-width:260px}
.nt-imgs:not(:empty){margin-bottom:10px}
@media(max-width:700px){.nt-i{width:96px}.nt-i img{width:96px;height:96px}}`;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const quando = ts => { const d = new Date(ts); return isNaN(d) ? '' : d.toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };

  let nome = '';
  try { nome = localStorage.getItem(KEY_NOME) || ''; } catch (e) {}

  // barra in alto: chi scrive
  const sub = document.querySelector('.sub');
  sub.insertAdjacentHTML('afterend', `<div class="nt-top"><label for="nt-nome">Chi scrive le note</label><input id="nt-nome" placeholder="Il tuo nome" value="${esc(nome)}" maxlength="60"><span class="nt-s" id="nt-stato">Sotto ogni uscita puoi lasciare una nota o caricare immagini di riferimento.</span></div>`);
  const inNome = document.getElementById('nt-nome');
  inNome.addEventListener('change', () => { nome = inNome.value.trim(); try { localStorage.setItem(KEY_NOME, nome); } catch (e) {} });
  const statoGlob = document.getElementById('nt-stato');

  // un id stabile per uscita: data, ora, titolo, canali
  const visti = {};
  const box = {};
  document.querySelectorAll('article.u').forEach(art => {
    const t = s => art.querySelector(s)?.textContent || '';
    let id = slug([t('.when b'), t('.when span'), t('h3'), t('.ch')].join(' ')).slice(0, 150);
    visti[id] = (visti[id] || 0) + 1;
    if (visti[id] > 1) id += '-' + visti[id];
    const el = document.createElement('section');
    el.className = 'nt';
    el.innerHTML = `<h4>Note e riferimenti</h4><div class="nt-list"></div><div class="nt-imgs"></div>
<div class="nt-f"><textarea placeholder="Scrivi una nota su questa uscita…" aria-label="Nota"></textarea>
<div class="nt-r"><button class="nt-b" data-a="nota">Salva nota</button><label class="nt-b alt">Carica immagini<input type="file" accept="image/*" multiple hidden></label><span class="nt-s"></span></div></div>`;
    (art.querySelector('.txt') || art).appendChild(el);
    box[id] = el;
    const st = el.querySelector('.nt-s');
    const ta = el.querySelector('textarea');
    const btn = el.querySelector('[data-a="nota"]');
    btn.addEventListener('click', async () => {
      const testo = ta.value.trim();
      if (!testo) return;
      btn.disabled = true; st.textContent = 'Salvo…';
      const r = await manda({ a: 'nota', item: id, autore: chi(), testo });
      btn.disabled = false;
      if (r.ok) { ta.value = ''; st.textContent = 'Salvata.'; carica(); } else st.textContent = 'Non salvata: ' + (r.err || 'errore') + '. Riprova.';
    });
    el.querySelector('input[type=file]').addEventListener('change', async ev => {
      const files = [...ev.target.files];
      ev.target.value = '';
      for (let i = 0; i < files.length; i++) {
        st.textContent = `Carico ${i + 1} di ${files.length}…`;
        try {
          const { dati, mime } = await rimpicciolisci(files[i]);
          const r = await manda({ a: 'img', item: id, autore: chi(), nome: files[i].name, mime, dati });
          if (!r.ok) { st.textContent = 'Immagine non caricata: ' + (r.err || 'errore'); return; }
        } catch (e) { st.textContent = 'Immagine non caricata: ' + e.message; return; }
      }
      st.textContent = files.length > 1 ? 'Immagini caricate.' : 'Immagine caricata.';
      carica();
    });
  });

  function chi() {
    nome = inNome.value.trim();
    try { localStorage.setItem(KEY_NOME, nome); } catch (e) {}
    return nome || 'Senza nome';
  }

  async function manda(o) {
    try {
      const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(o) });
      return await r.json();
    } catch (e) { return { ok: false, err: 'rete' }; }
  }

  // lato lungo massimo 1800 px, JPEG: resta leggibile e sta sotto il limite dello script
  function rimpicciolisci(file) {
    return new Promise((ok, ko) => {
      const img = new Image();
      const u = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1800 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        ok({ mime: 'image/jpeg', dati: c.toDataURL('image/jpeg', 0.86).split(',')[1] });
      };
      img.onerror = () => { URL.revokeObjectURL(u); ko(new Error('formato non letto')); };
      img.src = u;
    });
  }

  async function togli(rid) {
    if (!confirm('Togliere questo elemento?')) return;
    const r = await manda({ a: 'via', id: rid });
    if (r.ok) carica(); else alert('Non tolto: ' + (r.err || 'errore'));
  }

  async function carica() {
    let d;
    try { d = await (await fetch(ENDPOINT + '?a=list&t=' + Date.now())).json(); }
    catch (e) { statoGlob.textContent = 'Note non raggiungibili in questo momento.'; return; }
    if (!d.ok) return;
    const per = {};
    d.rows.forEach(r => (per[r.item] = per[r.item] || []).push(r));
    let tot = 0;
    for (const id in box) {
      const rows = per[id] || [];
      tot += rows.length;
      box[id].querySelector('.nt-list').innerHTML = rows.filter(r => r.tipo === 'nota').map(r =>
        `<div class="nt-n"><small>${esc(r.autore)} · ${quando(r.ts)}</small>${esc(r.testo)}<button class="nt-x" data-id="${esc(r.id)}" title="Togli" aria-label="Togli nota">×</button></div>`).join('');
      box[id].querySelector('.nt-imgs').innerHTML = rows.filter(r => r.tipo === 'img').map(r =>
        `<div class="nt-i"><small>${esc(r.autore)}</small><a href="${esc(r.url)}" target="_blank" rel="noopener"><img src="${esc(r.url)}=w400" alt="Riferimento di ${esc(r.autore)}" loading="lazy"></a><button class="nt-x" data-id="${esc(r.id)}" title="Togli" aria-label="Togli immagine">×</button></div>`).join('');
    }
    statoGlob.textContent = tot ? `${tot} tra note e immagini finora.` : 'Sotto ogni uscita puoi lasciare una nota o caricare immagini di riferimento.';
  }

  document.addEventListener('click', e => { const b = e.target.closest('.nt-x'); if (b) togli(b.dataset.id); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) carica(); });
  carica();
})();
