#!/usr/bin/env node
/**
 * Builds the job board from data/jobs.json.
 *
 *   node scripts/build-jobs.mjs        (or: npm run build:jobs)
 *
 * Writes:
 *   jobs/<slug>.html   one shareable page per role
 *   talent.html        the job cards, between the JOBS:START / JOBS:END markers
 *   sitemap.xml        one <url> per live role, between the JOBS:START / JOBS:END markers
 *
 * Edit data/jobs.json, re-run, commit. Never hand-edit the generated regions.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JOBS_DIR = join(ROOT, 'jobs');

const data = JSON.parse(readFileSync(join(ROOT, 'data', 'jobs.json'), 'utf8'));
const site = data.site;
const jobs = data.jobs;

/* ---------- text helpers ---------- */

// Escape HTML specials, then push every non-ASCII character out as a numeric
// entity. Keeps the generated files pure ASCII so they survive whatever
// encoding the editor/server decides to use.
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[^\u0000-\u007F]/g, (c) => `&#${c.charCodeAt(0)};`);
}

// For JSON-LD: escape only what would break out of a <script> block. JSON.stringify
// handles the rest, and the JSON stays readable UTF-8.
function jsonLd(obj) {
  return JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
}

function stripDashes(str) {
  // Plain-text variant for meta descriptions and JSON-LD.
  return String(str).replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

function postedLabel(datePosted, now) {
  const then = new Date(datePosted + 'T00:00:00Z');
  const days = Math.max(0, Math.round((now - then) / 86400000));
  if (days === 0) return 'Posted today';
  if (days === 1) return 'Posted 1 day ago';
  if (days < 7) return `Posted ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'Posted 1 week ago';
  if (weeks < 5) return `Posted ${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? 'Posted 1 month ago' : `Posted ${months} months ago`;
}

function withJob(base, job) {
  return `${base}${base.includes('?') ? '&' : '?'}job=${encodeURIComponent(job.id)}`;
}

// Applicants without an account sign up; those who already have one log in.
// Either way the job id rides along (see assets/js/job-context.js).
const applyUrl = (job) => withJob(site.applyBase || '/register', job);
const loginUrl = (job) => withJob(site.loginBase || '/login', job);

const list = (items) => items.map((i) => `      <li>${esc(i)}</li>`).join('\n');

/* ---------- shared chrome ----------
   Lifted from talent.html at build time rather than duplicated here, so the
   job pages always carry the same nav and footer as the rest of the site
   (and so this script is not tied to one site's markup). */

const talentSrc = readFileSync(join(ROOT, 'talent.html'), 'utf8');

function lift(html, openTag, closeTag, label) {
  const start = html.indexOf(openTag);
  if (start === -1) throw new Error(`talent.html: cannot find ${label} (${openTag})`);
  const end = html.indexOf(closeTag, start);
  if (end === -1) throw new Error(`talent.html: ${label} is not closed`);
  return html.slice(start, end + closeTag.length);
}

const NAV = lift(talentSrc, '<nav class="nav">', '</nav>', 'nav');
const FOOTER = lift(talentSrc, '<footer>', '</footer>', 'footer');

/* ---------- job card (rendered into talent.html) ---------- */

function card(job, now) {
  const tags = job.tags
    .map((t, i) => `<span class="job-tag${i === job.tags.length - 1 ? ' lang' : ''}">${esc(t)}</span>`)
    .join('');
  return `    <article class="job-card fade-in" id="${esc(job.id)}" data-job="${esc(job.id)}">
     <div class="job-cardhead"><span class="job-status">${esc(job.status)}</span><span class="job-id">${esc(job.id)}</span></div>
     <h3 class="job-title"><a href="/jobs/${esc(job.slug)}">${esc(job.title)}</a></h3>
     <div class="job-meta">${tags}</div>
     <p class="job-desc">${esc(job.summary)}</p>
     <ul class="job-reqs">
${list(job.cardHighlights)}
     </ul>
     <div class="job-foot"><span class="job-posted">${esc(postedLabel(job.datePosted, now))}</span><a href="/jobs/${esc(job.slug)}" class="job-apply">View role &amp; apply<span class="arr">&rarr;</span></a></div>
    </article>`;
}

/* ---------- structured data ---------- */

function jobPosting(job) {
  const plain = (s) => stripDashes(s);
  const section = (heading, items) =>
    items && items.length ? `${heading}\n` + items.map((i) => `- ${plain(i)}`).join('\n') + '\n\n' : '';

  const description =
    job.intro.map(plain).join('\n\n') +
    '\n\n' +
    section('Responsibilities', job.responsibilities) +
    section('Minimum requirements', job.minimumRequirements) +
    section('Preferred qualifications', job.preferredQualifications) +
    section('Required documents', job.documentsRequired) +
    section('Work type', job.workTypeBullets);

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: plain(job.title),
    description: description.trim(),
    identifier: { '@type': 'PropertyValue', name: site.organization, value: job.id },
    datePosted: job.datePosted,
    validThrough: job.validThrough,
    employmentType: job.employmentType,
    hiringOrganization: {
      '@type': 'Organization',
      name: site.organization,
      sameAs: site.origin,
      logo: site.logo,
    },
    jobLocationType: 'TELECOMMUTE',
    applicantLocationRequirements: { '@type': 'AdministrativeArea', name: 'Worldwide' },
    inLanguage: 'en-US',
    url: `${site.origin}/jobs/${job.slug}`,
    directApply: false,
  };
}

/* ---------- job page ---------- */

function page(job, now) {
  const url = `${site.origin}/jobs/${job.slug}`;
  const seoTitle = job.seo?.title || job.title;
  const seoDesc = stripDashes(job.seo?.description || job.summary);
  const apply = applyUrl(job);
  const live = job.live !== false;

  const block = (num, heading, items, note, ordered) => {
    if (!items || !items.length) return '';
    const tag = ordered ? 'ol' : 'ul';
    const cls = ordered ? 'job-steps' : 'job-list';
    return `
   <section class="jobsec">
    <div class="jobsec-head"><span class="jobsec-num">${num}</span><h2 class="jobsec-title">${esc(heading)}</h2></div>
    <${tag} class="${cls}">
${list(items)}
    </${tag}>
${note ? `    <p class="jobsec-note">${esc(note)}</p>\n` : ''}   </section>`;
  };

  const facts = [
    ['Job ID', job.id],
    ['Work type', job.workType],
    ['Location', job.location],
    ['Schedule', job.schedule],
    ['Language pairs', job.languagePairs],
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(seoTitle)} | ${esc(site.organization)}</title>
<meta name="description" content="${esc(seoDesc)}" />
${live ? `<link rel="canonical" href="${url}" />` : '<meta name="robots" content="noindex" />'}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap"></noscript>
<link rel="stylesheet" href="/assets/site.min.css" />
<link rel="stylesheet" href="/assets/marketplace.css" />
<link rel="stylesheet" href="/assets/gtm.css" />
<link rel="stylesheet" href="/assets/job.css" />
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon/favicon-32x32.png" />
<link rel="apple-touch-icon" href="/assets/favicon/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#0b2b8d" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${url}" />
<meta property="og:site_name" content="${esc(site.organization)}" />
<meta property="og:title" content="${esc(seoTitle)}" />
<meta property="og:description" content="${esc(seoDesc)}" />
<meta property="og:image" content="${site.ogImage}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(seoTitle)}" />
<meta name="twitter:description" content="${esc(seoDesc)}" />
<meta name="twitter:image" content="${site.ogImage}" />
${live ? `<script type="application/ld+json">\n${jsonLd(jobPosting(job))}\n</script>` : '<!-- job is not live: JobPosting structured data omitted -->'}
<script type="application/ld+json">
${jsonLd({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${site.origin}/` },
    { '@type': 'ListItem', position: 2, name: 'For Talent', item: `${site.origin}/talent` },
    { '@type': 'ListItem', position: 3, name: stripDashes(job.title), item: url },
  ],
})}
</script>
</head>
<body class="theme-home">

<div class="noise"></div>
<div class="cur-ring" id="curRing"></div>
<div class="cur-dot" id="curDot"></div>

${NAV}

<main>

 <section class="page-hero job-hero">
  <div class="wrap">
   <nav class="breadcrumb"><a href="/">Home</a><span class="sep">/</span><a href="/talent">For Talent</a><span class="sep">/</span> ${esc(job.title)}</nav>
   <div class="job-hero-grid">
    <div>
     <div class="job-hero-badges"><span class="job-status">${esc(job.status)}</span><span class="job-id">${esc(job.id)}</span></div>
     <h1>${esc(job.title)}</h1>
     <div class="job-meta job-hero-meta">${job.tags.map((t) => `<span class="job-tag">${esc(t)}</span>`).join('')}</div>
     <p class="g-lead">${esc(job.summary)}</p>
     <div class="job-hero-actions">
      <a href="${esc(apply)}" class="btn-primary" data-mag><span>Apply for this role</span><span class="arr">&rarr;</span></a>
      <button type="button" class="job-share" id="jobShare" data-url="${url}">Copy link to this role</button>
     </div>
     <p class="job-hero-alt">Already have a ${esc(site.organization)} account? <a href="${esc(loginUrl(job))}">Log in to apply</a></p>
    </div>
    <aside class="job-facts">
     <h2 class="job-facts-title">At a glance</h2>
     <dl>
${facts.map(([k, v]) => `      <div class="job-fact"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('\n')}
     </dl>
     <a href="${esc(apply)}" class="job-facts-apply" data-mag>Apply<span class="arr">&rarr;</span></a>
    </aside>
   </div>
  </div>
 </section>

 <section class="section-pad job-body">
  <div class="wrap job-body-wrap">
   <div class="jobsec jobsec-intro">
${job.intro.map((p) => `    <p>${esc(p)}</p>`).join('\n')}
   </div>
${block('01', 'Responsibilities', job.responsibilities)}
${block('02', 'Minimum requirements', job.minimumRequirements)}
${block('03', 'Preferred qualifications', job.preferredQualifications, job.preferredNote)}
${block('04', 'Required documents', job.documentsRequired)}
${job.documentsOptional && job.documentsOptional.length ? `
   <section class="jobsec jobsec-sub">
    <h3 class="jobsec-subtitle">Optional documents</h3>
    <ul class="job-list">
${list(job.documentsOptional)}
    </ul>
${job.documentsNote ? `    <p class="jobsec-note">${esc(job.documentsNote)}</p>\n` : ''}   </section>` : ''}
${block('05', 'Work type', job.workTypeBullets, job.workTypeNote)}
${block('06', 'Application and qualification process', job.process, job.processNote, true)}

   <section class="jobsec">
    <div class="jobsec-head"><span class="jobsec-num">07</span><h2 class="jobsec-title">About the opportunity</h2></div>
${job.about.map((p) => `    <p class="jobsec-p">${esc(p)}</p>`).join('\n')}
   </section>

   <div class="job-cta-inline">
    <div>
     <h3>Ready to apply?</h3>
     <p>Applications are reviewed on a rolling basis. Reference <strong>${esc(job.id)}</strong>.</p>
    </div>
    <a href="${esc(apply)}" class="btn-primary" data-mag><span>Apply for this role</span><span class="arr">&rarr;</span></a>
   </div>

   <p class="muted job-back"><a href="/talent#openings">&larr; Back to all open roles</a></p>
  </div>
 </section>

</main>

${FOOTER}

<script src="/assets/site.min.js"></script>
<script src="/assets/js/main.js" defer></script>
<script>
(function () {
  var btn = document.getElementById('jobShare');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var url = btn.dataset.url;
    var done = function () {
      var was = btn.textContent;
      btn.textContent = 'Link copied';
      btn.classList.add('is-copied');
      setTimeout(function () { btn.textContent = was; btn.classList.remove('is-copied'); }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link:', url); });
    } else {
      window.prompt('Copy this link:', url);
    }
  });
})();
</script>
</body>
</html>
`;
}

/* ---------- region replacement ---------- */

function replaceRegion(file, marker, body) {
  const path = join(ROOT, file);
  const src = readFileSync(path, 'utf8');
  const start = `<!-- ${marker}:START -->`;
  const end = `<!-- ${marker}:END -->`;
  const si = src.indexOf(start);
  const ei = src.indexOf(end);
  if (si === -1 || ei === -1) {
    throw new Error(`${file}: missing ${start} / ${end} markers`);
  }
  const next = src.slice(0, si + start.length) + '\n' + body + '\n' + src.slice(ei);
  if (next !== src) {
    writeFileSync(path, next);
    return true;
  }
  return false;
}

/* ---------- run ---------- */

const now = new Date();
const today = now.toISOString().slice(0, 10);

// Fail loudly on duplicate slugs/ids rather than silently overwriting a page.
for (const key of ['slug', 'id']) {
  const seen = new Set();
  for (const j of jobs) {
    if (seen.has(j[key])) throw new Error(`duplicate ${key}: ${j[key]}`);
    seen.add(j[key]);
  }
}

mkdirSync(JOBS_DIR, { recursive: true });

// Drop pages for roles that are no longer in jobs.json, so a removed listing
// doesn't linger at its old URL.
const wanted = new Set(jobs.map((j) => `${j.slug}.html`));
if (existsSync(JOBS_DIR)) {
  for (const f of readdirSync(JOBS_DIR)) {
    if (f.endsWith('.html') && !wanted.has(f)) {
      unlinkSync(join(JOBS_DIR, f));
      console.log(`  removed jobs/${f}`);
    }
  }
}

for (const job of jobs) {
  writeFileSync(join(JOBS_DIR, `${job.slug}.html`), page(job, now));
  console.log(`  jobs/${job.slug}.html`);
}

// Lookup used by /register to name the role an applicant came from.
const index = Object.fromEntries(jobs.map((j) => [j.id, { title: j.title, slug: j.slug }]));
writeFileSync(
  join(ROOT, 'assets', 'js', 'jobs-index.js'),
  `/* Generated by scripts/build-jobs.mjs — do not edit. */\nwindow.DEFRILEX_JOBS = ${JSON.stringify(index, null, 2)};\n`
);
console.log('  assets/js/jobs-index.js');

const cards = jobs.map((j) => card(j, now)).join('\n\n');
const board = `   <div class="job-board" data-limit="${site.cardLimit ?? 2}">\n\n${cards}\n\n   </div>`;
replaceRegion('talent.html', 'JOBS', board);
console.log(`  talent.html  (${jobs.length} cards)`);

const urls = jobs
  .filter((j) => j.live !== false)
  .map(
    (j) => `  <url>
    <loc>${site.origin}/jobs/${j.slug}</loc>
    <lastmod>${j.datePosted}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
  )
  .join('\n');
replaceRegion('sitemap.xml', 'JOBS', urls);
console.log(`  sitemap.xml  (${jobs.filter((j) => j.live !== false).length} urls)`);

const notLive = jobs.filter((j) => j.live === false);
if (notLive.length) {
  console.log(`\n  note: ${notLive.length} role(s) marked live:false -> noindex, no JobPosting schema, not in sitemap`);
}
const stale = jobs.filter((j) => j.validThrough && j.validThrough < today);
if (stale.length) {
  console.log(`\n  WARNING: validThrough has passed for: ${stale.map((j) => j.id).join(', ')}`);
}

console.log(`\nBuilt ${jobs.length} roles.`);
