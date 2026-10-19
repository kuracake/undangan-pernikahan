/* Ucapan & Doa — disimpan di Firebase Firestore lewat REST API (tanpa library).
 *
 * Isi 2 nilai di bawah dari Firebase Console:
 *   Project settings -> Your apps -> (Web app) -> projectId & apiKey
 */
(() => {
    const FIREBASE = {
        projectId: 'wedding-8f9e0',
        apiKey: 'AIzaSyAort5c1FqS62XtHEK_CrqHkWldX3E4cSM',
    };
    const COLLECTION = 'ucapan';
    const MAX_ITEMS = 50;      // jumlah ucapan terbaru yang ditampilkan
    const COOLDOWN_MS = 30000; // jeda minimal antar kiriman dari satu perangkat

    const form = document.getElementById('ucapan-form');
    if (!form) return;

    const nameEl = document.getElementById('ucapan-name');
    const msgEl = document.getElementById('ucapan-message');
    const sendEl = document.getElementById('ucapan-send');
    const statusEl = document.getElementById('ucapan-status');
    const listEl = document.getElementById('ucapan-list');
    const presenceBtns = [...form.querySelectorAll('.presence-btn')];

    const configured = !/GANTI/.test(FIREBASE.projectId + FIREBASE.apiKey);
    const root = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;
    const key = `?key=${encodeURIComponent(FIREBASE.apiKey)}`;

    let presence = 0;
    let items = [];

    // Nama tamu dari ?to=Nama
    const to = new URLSearchParams(location.search).get('to');
    if (to) nameEl.value = to.slice(0, 50);

    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const setStatus = (text, ok = false) => {
        statusEl.textContent = text;
        statusEl.className = `small mt-2 mb-0 ${ok ? 'text-gold-soft' : 'text-warning'}`;
    };

    const el = (tag, cls, text) => {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text !== undefined) node.textContent = text; // textContent: aman dari XSS
        return node;
    };

    const render = () => {
        listEl.replaceChildren();
        if (items.length === 0) {
            listEl.appendChild(el('p', 'text-center opacity-75 my-3', 'Belum ada ucapan. Jadilah yang pertama!'));
            return;
        }
        items.forEach((it) => {
            const row = el('div', 'ucapan-item');
            const avatar = el('div', 'ucapan-avatar');
            avatar.appendChild(el('i', 'fa-solid fa-user'));

            const body = el('div', 'flex-grow-1');
            const who = el('div', 'ucapan-who');
            who.appendChild(el('b', '', it.name));
            who.appendChild(el('span', `ucapan-badge ${it.presence === 1 ? 'yes' : 'no'}`, it.presence === 1 ? 'Hadir' : 'Tidak Hadir'));
            body.appendChild(who);
            body.appendChild(el('div', 'ucapan-when', fmt(it.date)));
            body.appendChild(el('p', 'ucapan-msg', it.message));

            row.append(avatar, body);
            listEl.appendChild(row);
        });
    };

    const parseDoc = (doc) => {
        const f = doc.fields || {};
        return {
            name: f.name?.stringValue ?? '',
            message: f.message?.stringValue ?? '',
            presence: Number(f.presence?.integerValue ?? 0),
            date: new Date(f.createdAt?.timestampValue ?? Date.now()),
        };
    };

    const load = async () => {
        if (!configured) {
            listEl.replaceChildren(el('p', 'text-center opacity-75 my-3', 'Fitur ucapan belum dikonfigurasi (isi projectId & apiKey di assets/ucapan.js).'));
            return;
        }
        listEl.replaceChildren(el('p', 'text-center opacity-75 my-3', 'Memuat ucapan...'));
        try {
            const res = await fetch(`${root}:runQuery${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    structuredQuery: {
                        from: [{ collectionId: COLLECTION }],
                        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
                        limit: MAX_ITEMS,
                    },
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const rows = await res.json();
            items = rows.filter((r) => r.document).map((r) => parseDoc(r.document));
            render();
        } catch (e) {
            console.error('Gagal memuat ucapan:', e);
            listEl.replaceChildren(el('p', 'text-center opacity-75 my-3', 'Ucapan belum dapat dimuat. Coba muat ulang halaman.'));
        }
    };

    presenceBtns.forEach((btn) => btn.addEventListener('click', () => {
        presence = Number(btn.dataset.presence);
        presenceBtns.forEach((b) => b.classList.toggle('active', b === btn));
    }));

    const lastSent = () => {
        try { return Number(localStorage.getItem('ucapan:last') || 0); } catch { return 0; }
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!configured) return setStatus('Fitur ucapan belum dikonfigurasi.');

        const name = nameEl.value.trim();
        const message = msgEl.value.trim();
        if (name.length < 2) return setStatus('Nama minimal 2 huruf.');
        if (message.length < 1) return setStatus('Ucapan tidak boleh kosong.');
        if (presence === 0) return setStatus('Pilih konfirmasi kehadiran (Hadir / Tidak Hadir).');
        if (Date.now() - lastSent() < COOLDOWN_MS) return setStatus('Mohon tunggu sebentar sebelum mengirim lagi.');

        sendEl.disabled = true;
        setStatus('Mengirim...', true);
        const now = new Date();
        try {
            const res = await fetch(`${root}/${COLLECTION}${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fields: {
                        name: { stringValue: name },
                        message: { stringValue: message },
                        presence: { integerValue: String(presence) },
                        createdAt: { timestampValue: now.toISOString() },
                    },
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            items.unshift({ name, message, presence, date: now });
            items = items.slice(0, MAX_ITEMS);
            render();
            msgEl.value = '';
            try { localStorage.setItem('ucapan:last', String(Date.now())); } catch { /* abaikan */ }
            setStatus('Terima kasih, ucapan Anda sudah terkirim.', true);
        } catch (err) {
            console.error('Gagal mengirim ucapan:', err);
            setStatus('Ucapan gagal terkirim. Silakan coba lagi.');
        } finally {
            sendEl.disabled = false;
        }
    });

    load();
})();