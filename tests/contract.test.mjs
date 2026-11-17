// 契约测试（test/contract）：基于冻结契约 api-contract.yaml
// 运行时：esbuild 打包 Worker 应用后，用 node:sqlite 提供 D1 兼容 binding，app.fetch 直调（不依赖 workerd）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const BASE = 'https://blog.test';
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, '.testtmp', 'app.mjs');

let app;
let db;
let cookie = '';

function makeStatement(stmt) {
  return {
    binds: [],
    bind(...args) {
      this.binds = args.map((v) => (v === undefined ? null : v));
      return this;
    },
    all() {
      return { results: stmt.all(...this.binds) };
    },
    first() {
      return stmt.get(...this.binds) ?? null;
    },
    run() {
      const info = stmt.run(...this.binds);
      return { meta: { last_row_id: Number(info.lastInsertRowid ?? 0), changes: Number(info.changes ?? 0) } };
    },
  };
}

const env = {
  DB: {
    prepare(sql) {
      return makeStatement(db.prepare(sql));
    },
    async batch(statements) {
      const results = [];
      db.exec('BEGIN');
      try {
        for (const s of statements) results.push(s.run());
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      return results;
    },
  },
  ADMIN_PASSWORD: 'admin123',
  SESSION_SECRET: 'test-secret',
};

function req(path, opts = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (cookie) headers.set('Cookie', cookie);
  return app.fetch(
    new Request(BASE + path, { method: opts.method || 'GET', headers, body: opts.body }),
    env,
  );
}

async function json(res) {
  return res.json();
}

before(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await build({
    entryPoints: [path.join(ROOT, 'src/index.ts')],
    bundle: true,
    format: 'esm',
    outfile: OUT,
    logLevel: 'silent',
  });
  ({ default: app } = await import(pathToFileURL(OUT).href));

  db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8'));
  db.exec(`
    INSERT INTO categories (name, slug) VALUES ('技术', 'tech'), ('生活', 'life');
    INSERT INTO tags (name, slug) VALUES ('Cloudflare', 'cloudflare'), ('随笔', 'essay');
    INSERT INTO posts (slug, title, summary, content, category_id, status, published_at)
      VALUES ('hello', '你好', '摘要', '# 正文\n\nhello world', (SELECT id FROM categories WHERE slug='tech'), 'published', '2026-11-01 09:00:00');
    INSERT INTO posts (slug, title, summary, content, category_id, status)
      VALUES ('draft-one', '草稿', '', '草稿内容', (SELECT id FROM categories WHERE slug='life'), 'draft');
    INSERT INTO post_tags (post_id, tag_id)
      SELECT (SELECT id FROM posts WHERE slug='hello'), (SELECT id FROM tags WHERE slug='cloudflare');
  `);
});

after(async () => {
  fs.rmSync(path.dirname(OUT), { recursive: true, force: true });
});

// ---------- 前台公开 API ----------
test('GET /api/posts 只返回已发布文章', async () => {
  const res = await req('/api/posts');
  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body.total, 1);
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].slug, 'hello');
  assert.equal(body.items[0].categoryName, '技术');
  assert.deepEqual(body.items[0].tags, ['Cloudflare']);
  assert.ok(body.items[0].readingMinutes >= 1);
});

test('GET /api/posts/:slug 详情 200 / 404', async () => {
  const ok = await req('/api/posts/hello');
  assert.equal(ok.status, 200);
  const post = await json(ok);
  assert.equal(post.status, 'published');
  assert.match(post.content, /hello world/);

  const missing = await req('/api/posts/nope');
  assert.equal(missing.status, 404);
  assert.ok((await json(missing)).error);
});

test('GET /api/categories 与 /api/tags 含发布文章计数', async () => {
  const cats = await json(await req('/api/categories'));
  const tech = cats.find((c) => c.slug === 'tech');
  assert.equal(tech.postCount, 1);
  const tags = await json(await req('/api/tags'));
  const cf = tags.find((t) => t.slug === 'cloudflare');
  assert.equal(cf.postCount, 1);
});

test('GET /api/archive 按年月分组', async () => {
  const archive = await json(await req('/api/archive'));
  assert.equal(archive.length, 1);
  assert.equal(archive[0].year, 2026);
  assert.equal(archive[0].months[0].month, 11);
  assert.equal(archive[0].months[0].posts.length, 1);
});

test('GET /api/search 命中标题或正文', async () => {
  const hit = await json(await req('/api/search?q=' + encodeURIComponent('hello')));
  assert.equal(hit.total, 1);
  const miss = await json(await req('/api/search?q=' + encodeURIComponent('不存在的词')));
  assert.equal(miss.total, 0);
  const noQ = await req('/api/search');
  assert.equal(noQ.status, 400);
});

test('按分类与标签筛选列表', async () => {
  const byCat = await json(await req('/api/posts?category=life'));
  assert.equal(byCat.total, 0); // life 下只有草稿
  const byTag = await json(await req('/api/posts?tag=cloudflare'));
  assert.equal(byTag.total, 1);
});

// ---------- 管理 API ----------
test('未登录访问管理接口返回 401', async () => {
  const res = await req('/api/admin/posts');
  assert.equal(res.status, 401);
});

test('登录：错误密码 401，正确密码 200 并下发会话 cookie', async () => {
  const bad = await req('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: 'wrong' }) });
  assert.equal(bad.status, 401);
  const ok = await req('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: 'admin123' }) });
  assert.equal(ok.status, 200);
  const setCookie = ok.headers.get('set-cookie');
  assert.match(setCookie, /blog_session=/);
  cookie = setCookie.split(';')[0];
});

test('管理列表包含草稿', async () => {
  const body = await json(await req('/api/admin/posts'));
  assert.equal(body.total, 2);
});

test('创建文章：201 / slug 冲突 409 / 校验失败 400', async () => {
  const created = await req('/api/admin/posts', {
    method: 'POST',
    body: JSON.stringify({
      title: '新文章', slug: 'new-post', content: '内容', categoryId: 1,
      tags: ['随笔', '新标签'], status: 'published',
    }),
  });
  assert.equal(created.status, 201);
  const post = await json(created);
  assert.deepEqual(post.tags.sort(), ['新标签', '随笔'].sort());
  assert.ok(post.publishedAt);

  const dup = await req('/api/admin/posts', {
    method: 'POST',
    body: JSON.stringify({ title: 'x', slug: 'hello', content: 'x', status: 'draft' }),
  });
  assert.equal(dup.status, 409);

  const invalid = await req('/api/admin/posts', {
    method: 'POST',
    body: JSON.stringify({ title: 'x', slug: 'Bad Slug!', content: 'x', status: 'draft' }),
  });
  assert.equal(invalid.status, 400);
});

test('发布后前台立即可见', async () => {
  const list = await json(await req('/api/posts'));
  assert.ok(list.items.some((p) => p.slug === 'new-post'));
  const detail = await req('/api/posts/new-post');
  assert.equal(detail.status, 200);
});

test('更新文章 200，未知 id 404', async () => {
  const updated = await req('/api/admin/posts/2', {
    method: 'PUT',
    body: JSON.stringify({ title: '草稿改', slug: 'draft-one', content: '改', status: 'draft' }),
  });
  assert.equal(updated.status, 200);
  const missing = await req('/api/admin/posts/999', {
    method: 'PUT',
    body: JSON.stringify({ title: 'x', slug: 'x-1', content: 'x', status: 'draft' }),
  });
  assert.equal(missing.status, 404);
});

test('删除文章 200，删除后前台不可见且再次删除 404', async () => {
  const del = await req('/api/admin/posts/2', { method: 'DELETE' });
  assert.equal(del.status, 200);
  const detail = await req('/api/posts/draft-one');
  assert.equal(detail.status, 404);
  const again = await req('/api/admin/posts/2', { method: 'DELETE' });
  assert.equal(again.status, 404);
});

test('登出：清除会话 cookie，此后管理接口 401', async () => {
  const res = await req('/api/admin/logout', { method: 'POST' });
  assert.equal(res.status, 200);
  // 模拟浏览器丢弃被清除的 cookie（服务端会话为无状态签名，不维护黑名单）
  cookie = '';
  const after = await req('/api/admin/posts');
  assert.equal(after.status, 401);
});
