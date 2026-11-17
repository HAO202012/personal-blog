// Worker 入口（dev/a）：静态资产由 Workers Assets 自动服务，Worker 只处理 /api/*
import { Hono } from 'hono';
import type { Env } from './types';
import { api } from './routes/api';
import { admin } from './routes/admin';

const app = new Hono<{ Bindings: Env }>();

app.route('/api', api);
app.route('/api/admin', admin);

app.notFound((c) => c.json({ error: 'not found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal' }, 500);
});

export default app;
