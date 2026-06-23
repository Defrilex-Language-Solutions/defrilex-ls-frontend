/* ==========================================================================
   DefrilexCX Marketplace — Interactions
   Calm, premium, physics-aware motion. Progressive enhancement only.
   ========================================================================== */
(function () {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from((c || document).querySelectorAll(s));

  /* ---------- Header: scrolled state + scroll progress ---------- */
  const header = $(".site-header");
  const progress = $(".scroll-progress");
  function onScroll() {
    const y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 12);
    if (progress) {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile navigation ---------- */
  const toggle = $(".nav__toggle");
  const mobileNav = $(".mobile-nav");
  if (toggle && mobileNav) {
    const setOpen = (open) => {
      toggle.classList.toggle("is-open", open);
      mobileNav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", () => setOpen(!mobileNav.classList.contains("is-open")));
    $$(".mobile-nav a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = $$("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Count-up stats ---------- */
  const counters = $$("[data-count]");
  if (counters.length) {
    const animate = (el) => {
      const target = parseFloat(el.dataset.count);
      const decimals = (el.dataset.decimals && parseInt(el.dataset.decimals, 10)) || 0;
      const suffix = el.dataset.suffix || "";
      const prefix = el.dataset.prefix || "";
      if (reduceMotion) { el.textContent = prefix + target.toFixed(decimals) + suffix; return; }
      const dur = 1500; const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = prefix + target.toFixed(decimals) + suffix;
      };
      requestAnimationFrame(tick);
    };
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { animate(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((c) => cio.observe(c));
  }

  /* ---------- Console bars (hero) animate width on view ---------- */
  const bars = $$(".console__bar i[data-w]");
  if (bars.length) {
    const bio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.style.width = e.target.dataset.w + "%"; bio.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    bars.forEach((b) => { b.style.width = "0%"; bio.observe(b); });
  }

  /* ---------- Magnetic buttons ---------- */
  if (!reduceMotion && window.matchMedia("(pointer:fine)").matches) {
    $$("[data-magnetic]").forEach((btn) => {
      const strength = parseFloat(btn.dataset.magnetic) || 0.3;
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
    });
  }

  /* ---------- FAQ accordion ---------- */
  $$(".faq__item").forEach((item) => {
    const q = $(".faq__q", item);
    const a = $(".faq__a", item);
    if (!q || !a) return;
    q.addEventListener("click", () => {
      const open = item.classList.contains("is-open");
      $$(".faq__item").forEach((other) => {
        other.classList.remove("is-open");
        const oa = $(".faq__a", other); if (oa) oa.style.maxHeight = null;
        const oq = $(".faq__q", other); if (oq) oq.setAttribute("aria-expanded", "false");
      });
      if (!open) { item.classList.add("is-open"); a.style.maxHeight = a.scrollHeight + "px"; q.setAttribute("aria-expanded", "true"); }
    });
  });

  /* ---------- Marketplace filter ---------- */
  const filters = $$(".filter-chip");
  const rows = $$(".svc-row");
  if (filters.length && rows.length) {
    filters.forEach((chip) => {
      chip.addEventListener("click", () => {
        filters.forEach((c) => { c.classList.remove("is-active"); c.setAttribute("aria-pressed", "false"); });
        chip.classList.add("is-active");
        chip.setAttribute("aria-pressed", "true");
        const cat = chip.dataset.filter;
        rows.forEach((row, i) => {
          const match = cat === "all" || row.dataset.cat === cat;
          row.classList.toggle("is-hidden", !match);
          if (match && !reduceMotion) {
            row.style.opacity = "0";
            row.style.transform = "translateY(10px)";
            setTimeout(() => {
              row.style.transition = "opacity .45s var(--ease), transform .45s var(--ease)";
              row.style.opacity = "1"; row.style.transform = "none";
            }, (i % 8) * 35);
          }
        });
      });
    });
  }

  /* ---------- Capacity check / talent application form ---------- */
  const form = $("#capacity-form");
  if (form) {
    const submitBtn = $("button[type=submit]", form);
    const btnLabel = submitBtn ? submitBtn.innerHTML : "";

    // Inline error element, created on demand.
    let errEl = null;
    const showError = (msg) => {
      if (!errEl) {
        errEl = document.createElement("p");
        errEl.className = "form-error";
        errEl.setAttribute("role", "alert");
        errEl.style.cssText = "color:#c0392b;margin-top:1rem;font-size:.9rem;text-align:center";
        form.appendChild(errEl);
      }
      errEl.textContent = msg;
    };
    const clearError = () => { if (errEl) errEl.textContent = ""; };

    const showSuccess = () => {
      const success = $("#form-success");
      form.style.display = "none";
      if (success) {
        success.classList.add("is-visible");
        success.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      }
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      clearError();

      const endpoint = form.getAttribute("action") || "api/submit.php";
      const data = Object.fromEntries(new FormData(form).entries());
      data.page = window.location.pathname;

      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = "<span>Sending…</span>"; }

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(data),
        });
        let payload = {};
        try { payload = await res.json(); } catch (_) {}
        if (res.ok && payload.ok) {
          showSuccess();
          return;
        }
        showError(payload.error || "Something went wrong. Please email contact@defrilex.com directly.");
      } catch (_) {
        showError("Network error. Please check your connection or email contact@defrilex.com directly.");
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = btnLabel; }
      }
    });
  }

  /* ---------- Hero parallax (subtle) ---------- */
  if (!reduceMotion && window.matchMedia("(pointer:fine)").matches) {
    const float = $(".console__float");
    const console_ = $(".console");
    const heroBg = $(".hero__bg");
    if (console_ || heroBg) {
      window.addEventListener("scroll", () => {
        const y = window.scrollY;
        if (y < 900) {
          if (heroBg) heroBg.style.transform = `translateY(${y * 0.12}px)`;
          if (float) float.style.transform = `translateY(${y * -0.05}px)`;
        }
      }, { passive: true });
    }
  }

  /* ---------- Footer year ---------- */
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
})();
