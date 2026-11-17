// main.js（dev/b）：共享 fetch 封装与渲染函数
'use strict';

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function qs(params) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, v);
  return s.toString();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function renderMarkdown(md, container) {
  let html = window.marked ? window.marked.parse(md ?? '') : esc(md).replace(/\n/g, '<br>');
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  container.innerHTML = html;
  if (window.hljs) container.querySelectorAll('pre code').forEach((el) => window.hljs.highlightElement(el));
}

function metaLine(p) {
  return `<span>${esc((p.publishedAt || '').slice(0, 10))}</span>
    <span>${esc(p.categoryName || '未分类')}</span>
    <span>${p.readingMinutes} 分钟</span>`;
}

function postCard(p) {
  return `<article class="post-card">
    <h2><a href="/post.html?slug=${encodeURIComponent(p.slug)}">${esc(p.title)}</a></h2>
    <p class="summary">${esc(p.summary)}</p>
    <div class="meta">${metaLine(p)}</div>
  </article>`;
}

function renderPostList(el, items, emptyText) {
  el.innerHTML = items.length
    ? items.map(postCard).join('')
    : `<div class="empty">${esc(emptyText || '暂无文章')}</div>`;
}

function renderPagination(el, { total, page, size }, buildUrl) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) { el.innerHTML = ''; return; }
  let html = '';
  if (page > 1) html += `<a href="${buildUrl(page - 1)}">上一页</a>`;
  for (let i = 1; i <= pages; i++) {
    html += i === page ? `<span class="current">${i}</span>` : `<a href="${buildUrl(i)}">${i}</a>`;
  }
  if (page < pages) html += `<a href="${buildUrl(page + 1)}">下一页</a>`;
  el.innerHTML = html;
}

function tagPillLink(t) {
  return `<a class="pill" href="/tag.html?slug=${encodeURIComponent(t.slug)}">${esc(t.name)} (${t.postCount})</a>`;
}
