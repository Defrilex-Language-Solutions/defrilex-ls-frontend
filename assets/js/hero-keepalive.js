/* Keep hero background videos playing through scroll / tab changes.
   Some browsers pause muted autoplay videos when they scroll out of
   view or the tab loses focus; this resumes them automatically. */
(function () {
  var vids = document.querySelectorAll('.hero-video-el');
  if (!vids.length) return;

  function resume(v) {
    if (document.hidden) return;
    if (v.paused && v.src) {
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
  }

  vids.forEach(function (v) {
    // If the browser pauses it (e.g. scrolled off-screen), nudge it back.
    v.addEventListener('pause', function () {
      setTimeout(function () { resume(v); }, 60);
    });
  });

  function resumeAll() { vids.forEach(resume); }
  document.addEventListener('visibilitychange', resumeAll);
  window.addEventListener('focus', resumeAll);
  window.addEventListener('pageshow', resumeAll);
})();
