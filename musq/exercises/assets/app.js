// MUSQ exercise guide: waitlist, 3D viewer controls, the app video.
(() => {
  const root = document.documentElement;
  const ENDPOINT = root.dataset.waitlist;
  const SHEET = root.dataset.sheet;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const owner = store.get('musq_owner') === '1';

  // ---- waitlist count: the public sees only the number ----
  function showCount(n) {
    document.querySelectorAll('[data-count]').forEach((el) => {
      el.hidden = false;
      el.textContent = '';
      if (n > 0) {
        const b = document.createElement('strong');
        b.textContent = n.toLocaleString('en-US');
        el.append(b, n === 1 ? ' lifter on the waitlist' : ' lifters on the waitlist');
      } else {
        el.append('Be the first on the waitlist');
      }
      if (owner && SHEET) {
        const a = document.createElement('a');
        a.href = SHEET; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'View emails';
        el.append(' · ', a);
      }
    });
  }
  if (ENDPOINT && document.querySelector('[data-count]')) {
    fetch(ENDPOINT).then((r) => r.json()).then((d) => showCount(d.count || 0)).catch(() => {});
  }

  // ---- waitlist form ----
  if (store.get('musq_joined') === '1') {
    document.querySelectorAll('form[data-waitlist]').forEach((f) => {
      f.classList.add('wl-done');
      const m = f.querySelector('.wl-msg');
      if (m) { m.className = 'wl-msg ok'; m.textContent = "You're on the waitlist. We'll email you when MUSQ launches."; }
    });
  }
  document.querySelectorAll('form[data-waitlist]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = form.querySelector('.wl-msg');
      const btn = form.querySelector('button');
      const email = form.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        msg.className = 'wl-msg err';
        msg.textContent = 'Please enter a valid email address.';
        form.email.focus();
        return;
      }
      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = 'Joining…';
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          body: JSON.stringify({ email, website: form.website.value, page: location.pathname }),
        });
        const d = await res.json();
        if (!d.ok) throw new Error(d.error || 'failed');
        store.set('musq_joined', '1');
        document.querySelectorAll('form[data-waitlist]').forEach((f) => f.classList.add('wl-done'));
        document.querySelectorAll('.wl-msg').forEach((m) => {
          m.className = 'wl-msg ok';
          m.textContent = d.already
            ? "You're already on the waitlist. We'll email you when MUSQ launches."
            : "You're on the waitlist! We'll email you when MUSQ launches.";
        });
        showCount(d.count || 0);
      } catch (err) {
        msg.className = 'wl-msg err';
        msg.textContent = err.message === 'invalid'
          ? 'Please enter a valid email address.'
          : 'Something went wrong. Please try again in a moment.';
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  });

  // ---- 3D viewer controls ----
  document.querySelectorAll('.viewer').forEach((box) => {
    const mv = box.querySelector('model-viewer');
    if (!mv) return;
    const orbit = mv.getAttribute('camera-orbit');
    mv.addEventListener('load', () => box.classList.add('ready'));
    mv.addEventListener('error', () => box.classList.add('ready'));
    box.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'play') {
        if (mv.paused) { mv.play(); b.setAttribute('aria-pressed', 'false'); b.querySelector('span').textContent = 'Pause'; }
        else { mv.pause(); b.setAttribute('aria-pressed', 'true'); b.querySelector('span').textContent = 'Play'; }
      } else if (act === 'slow') {
        const slow = mv.timeScale !== 0.5;
        mv.timeScale = slow ? 0.5 : 1;
        b.setAttribute('aria-pressed', String(slow));
      } else if (act === 'reset') {
        mv.cameraOrbit = orbit;
        mv.cameraTarget = 'auto auto auto';
        mv.fieldOfView = 'auto';
      }
    }));
  });

  // ---- the app video plays only while on screen ----
  const vids = document.querySelectorAll('video[data-inview]');
  if (vids.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      const v = en.target;
      if (en.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); }
      else v.pause();
    }), { threshold: 0.35 });
    vids.forEach((v) => io.observe(v));
  }

  // ---- owner switch on /musq/waitlist/ ----
  const sw = document.querySelector('[data-owner-switch]');
  if (sw) {
    sw.checked = owner;
    sw.addEventListener('change', () => { store.set('musq_owner', sw.checked ? '1' : '0'); location.reload(); });
  }
})();
