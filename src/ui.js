/* DOM overlay: slide text, act navigation, progress, hints */
export class UI {
  constructor(app, beats, acts) {
    this.app = app;
    this.beats = beats;
    this.slides = document.getElementById('slides');
    this.count = document.getElementById('count');
    this.bar = document.querySelector('#prog i');
    this.hint = document.getElementById('hint');
    this.scrim = document.getElementById('scrim');
    this.cur = null;
    this.actFirst = acts.map((_, a) => beats.findIndex((b) => b.act === a));
    const nav = document.getElementById('acts');
    nav.innerHTML = acts.map((name, a) => `<button type="button" data-act="${a}" aria-label="跳到：${name}">${name}</button>`).join('');
    this.actBtns = [...nav.querySelectorAll('button')];
    this.actBtns.forEach((b, a) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        b.blur();
        app.go(this.actFirst[a]);
      }),
    );
    document.getElementById('prev').addEventListener('click', (e) => {
      e.stopPropagation();
      e.currentTarget.blur();
      app.go(app.beat - 1);
    });
    document.getElementById('next').addEventListener('click', (e) => {
      e.stopPropagation();
      e.currentTarget.blur();
      app.go(app.beat + 1);
    });
    document.getElementById('fs').addEventListener('click', (e) => {
      e.stopPropagation();
      app.toggleFullscreen();
    });
  }
  narrow() {
    return window.innerWidth / window.innerHeight < 1.05 || window.innerWidth < 760;
  }
  show(b, i) {
    const el = document.createElement('section');
    let layout = b.layout || 'left';
    if (this.narrow() && !layout.includes('table')) layout = layout.replace('left', 'top');
    el.className = 'slide ' + layout;
    const parts = [];
    let k = 0;
    if (b.eyebrow) parts.push(`<div class="eyebrow" style="--i:${k++}">${b.eyebrow}</div>`);
    if (b.h) parts.push(`<h${i === 0 ? 1 : 2} class="h" style="--i:${k++}">${b.h}</h${i === 0 ? 1 : 2}>`);
    if (b.sub) parts.push(`<p class="sub" style="--i:${k++}">${b.sub}</p>`);
    if (b.extra) parts.push(`<div class="extra" style="--i:${k++}">${b.extra}</div>`);
    el.innerHTML = parts.join('');
    this.slides.appendChild(el);
    const old = this.cur;
    this.cur = el;
    if (old) {
      old.classList.remove('in');
      old.classList.add('out');
      setTimeout(() => old.remove(), 700);
    }
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    if (document.documentElement.classList.contains('qa')) el.classList.add('in');
    this.scrim.className = layout.includes('left') ? 'left' : layout.includes('top') ? 'top' : 'center';

    const n = this.beats.length;
    this.count.textContent = `${String(i + 1).padStart(2, '0')} / ${n}`;
    this.bar.style.width = `${(i / (n - 1)) * 100}%`;
    this.actBtns.forEach((btn, a) => {
      btn.classList.toggle('on', a === b.act);
      if (a === b.act) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    });
    if (i > 0) this.hint.classList.add('gone');
    document.getElementById('prev').disabled = i === 0;
    document.getElementById('next').disabled = i === n - 1;
  }
}
