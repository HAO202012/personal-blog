// 本地 Node 运行时（W5 团长裁决：本机 workerd 不可用时兜底）
// 复用同一份 Hono 应用（src/index.ts），用 node:sqlite 提供 D1 兼容 binding。
// Cloudflare 部署路径不受影响：npm run dev / wrangler deploy 仍走 workerd。
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { DatabaseSync } from 'node:sqlite';
import { Hono } from 'hono';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_DIR = path.join(ROOT, 'local-data');
const DB_FILE = path.join(DATA_DIR, 'blog.db');
const OUT = path.join(ROOT, '.localtmp', 'app.mjs');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

await build({
  entryPoints: [path.join(ROOT, 'src/index.ts')],
  bundle: true,
  format: 'esm',
  outfile: OUT,
  logLevel: 'silent',
});
const { default: app } = await import(pathToFileURL(OUT).href);

// ---- D1 兼容适配器（node:sqlite） ----
const sqlite = new DatabaseSync(DB_FILE);
sqlite.exec('PRAGMA foreign_keys = ON');

const hasPosts = sqlite
  .prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name='posts'")
  .get().n;
if (!hasPosts) {
  sqlite.exec(fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8'));
  sqlite.exec(fs.readFileSync(path.join(ROOT, 'seed.sql'), 'utf8'));
  console.log('已初始化本地数据库（schema + 演示数据）');
}

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

const DB = {
  prepare(sql) {
    return makeStatement(sqlite.prepare(sql));
  },
  async batch(statements) {
    const results = [];
    sqlite.exec('BEGIN');
    try {
      for (const s of statements) results.push(s.run());
      sqlite.exec('COMMIT');
    } catch (e) {
      sqlite.exec('ROLLBACK');
      throw e;
    }
    return results;
  },
};

const env = {
  DB,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  SESSION_SECRET: process.env.SESSION_SECRET || 'local-dev-secret-do-not-use-in-prod',
};

const port = Number(process.env.PORT) || 8787;

// 静态资产（本地等价于 Workers Assets）：/api/* 走 Hono 应用，其余从 public/ 服务
const nodeApp = new Hono();
nodeApp.all('*', (c) => {
  if (c.req.path.startsWith('/api')) return app.fetch(c.req.raw, env);
  return serveStatic({ root: './public' })(c, async () => c.text('Not Found', 404));
});

serve(
  {
    port,
    fetch: (req) => nodeApp.fetch(req),
  },
  () => {
    console.log(`个人博客已启动: http://localhost:${port}`);
    console.log(`管理后台: http://localhost:${port}/admin-login.html （密码 ${env.ADMIN_PASSWORD}）`);
  },
);
