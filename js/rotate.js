// testimonials rotator
(function(){
  const rot = document.querySelector('.bj-rotator'); if (!rot) return;
  const items = [...rot.querySelectorAll('.bj-titem')];
  const dotsNav = rot.querySelector('.bj-dots');
  const prevBtn = rot.querySelector('.bj-prev');
  const nextBtn = rot.querySelector('.bj-next');

  let i = items.findIndex(el => el.classList.contains('is-active'));
  if (i < 0) i = 0;
  let timer, interval = +rot.dataset.interval || 6000;
  const pauseOnHover = rot.dataset.pauseOnHover === 'true';

  // Build dots
  items.forEach((_, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Show testimonial ${idx + 1}`);
    b.addEventListener('click', () => show(idx, true));
    dotsNav.appendChild(b);
  });

  function show(n, userTriggered = false) {
    items[i].classList.remove('is-active');
    dotsNav.children[i]?.removeAttribute('aria-current');

    i = (n + items.length) % items.length;

    items[i].classList.add('is-active');
    dotsNav.children[i]?.setAttribute('aria-current', 'true');

    if (timer) clearTimeout(timer);
    if (!userTriggered) timer = setTimeout(next, interval);
  }
  function next(){ show(i + 1); }
  function prev(){ show(i - 1, true); }

  // Init
  show(i);

  // Controls
  nextBtn?.addEventListener('click', next);
  prevBtn?.addEventListener('click', prev);

  // Keyboard support
  rot.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
  });

  // Pause on hover
  if (pauseOnHover) {
    rot.addEventListener('mouseenter', () => { if (timer) clearTimeout(timer); });
    rot.addEventListener('mouseleave', () => { timer = setTimeout(next, interval); });
  }
})();
