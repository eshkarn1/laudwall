// The embed script, served at /embed.js. Plain ES2017, no dependencies, styles inside a shadow root so the
// host site's CSS can't break it (and it can't break the host). Usage:
//   <div data-laudwall="your-space" data-layout="wall|carousel|badge"></div>
//   <script src="https://your-laudwall/embed.js" async></script>
export const WIDGET_JS = String.raw`(function () {
  var me = document.currentScript || document.querySelector('script[src*="/embed.js"]');
  var origin = new URL(me ? me.src : location.href).origin;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); };
  var stars = function (n) { return '<span class="stars" aria-label="' + n + ' out of 5">' + '★★★★★'.slice(0, n) + '<i>' + '★★★★★'.slice(n) + '</i></span>'; };
  var initials = function (name) { return esc(name.split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase()); };
  var card = function (t) {
    var avatar = t.photo ? '<img class="avatar" src="' + esc(t.photo) + '" alt="" loading="lazy">' : '<span class="avatar">' + initials(t.author) + '</span>';
    var video = t.video ? '<video src="' + esc(t.video) + '#t=0.1" controls playsinline preload="metadata"></video>' : '';
    return '<figure class="card' + (t.featured ? ' featured' : '') + '">' + video + stars(t.rating) + '<blockquote>' + esc(t.body) + '</blockquote>' +
      '<figcaption>' + avatar + '<span><b>' + esc(t.author) + '</b>' + (t.role ? '<small>' + esc(t.role) + '</small>' : '') + '</span></figcaption></figure>';
  };
  var css = function (accent) {
    return ':host{all:initial;display:block;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2330;--a:' + accent + '}' +
      '*{box-sizing:border-box}.wall{columns:3 280px;column-gap:16px}.card{break-inside:avoid;margin:0 0 16px;padding:18px 20px;background:#fff;border:1px solid #e6e8ef;border-radius:14px;box-shadow:0 1px 2px rgba(16,24,40,.04)}' +
      '.featured{border-color:var(--a);box-shadow:0 0 0 1px var(--a)}.stars{color:#f5a524;letter-spacing:2px;font-size:14px}.stars i{color:#d9dce4;font-style:normal}' +
      'blockquote{margin:8px 0 14px;white-space:pre-line}figcaption{display:flex;gap:10px;align-items:center}figcaption small{display:block;color:#6b7080;font-size:13px}' +
      '.avatar{flex:none;width:36px;height:36px;border-radius:50%;background:var(--a);color:#fff;display:grid;place-items:center;font-weight:600;font-size:13px}' +
      'img.avatar{object-fit:cover;display:block}video{display:block;width:100%;border-radius:10px;margin:0 0 12px;background:#000;aspect-ratio:9/12;object-fit:cover}' +
      '.carousel{display:flex;align-items:flex-start;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px}.carousel .card{flex:0 0 min(340px,85%);scroll-snap-align:start;margin:0}' +
      '.badge{display:inline-flex;gap:10px;align-items:center;padding:10px 16px;border:1px solid #e6e8ef;border-radius:999px;background:#fff;text-decoration:none;color:inherit}.badge b{font-size:18px}' +
      '.by{display:block;margin-top:8px;text-align:right;font-size:12px;color:#8a8f9e;text-decoration:none}.by:hover{color:var(--a)}.empty{color:#8a8f9e}';
  };
  function render(el) {
    if (el.__laudwall) return; el.__laudwall = true;
    var slug = el.getAttribute('data-laudwall'), layout = el.getAttribute('data-layout') || 'wall';
    var limit = parseInt(el.getAttribute('data-limit') || '0', 10);
    var root = el.attachShadow ? el.attachShadow({ mode: 'open' }) : el;
    fetch(origin + '/api/public/' + encodeURIComponent(slug)).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.space) { root.innerHTML = ''; return; }
      var list = limit > 0 ? d.testimonials.slice(0, limit) : d.testimonials, html;
      if (layout === 'badge') {
        var avg = list.length ? list.reduce(function (s, t) { return s + t.rating; }, 0) / list.length : 0;
        html = '<a class="badge" href="' + origin + '/w/' + esc(slug) + '" target="_blank" rel="noopener">' + stars(Math.round(avg)) + '<b>' + avg.toFixed(1) + '</b><span>from ' + list.length + ' reviews</span></a>';
      } else {
        html = list.length ? '<div class="' + (layout === 'carousel' ? 'carousel' : 'wall') + '">' + list.map(card).join('') + '</div>' : '<p class="empty">No testimonials yet.</p>';
      }
      if (d.branding && layout !== 'badge') html += '<a class="by" href="' + origin + '" target="_blank" rel="noopener">Powered by Laudwall</a>';
      root.innerHTML = '<style>' + css(d.space.accent) + '</style>' + html;
    }).catch(function () { root.innerHTML = ''; });
  }
  function scan() { Array.prototype.forEach.call(document.querySelectorAll('[data-laudwall]'), render); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
})();`;
