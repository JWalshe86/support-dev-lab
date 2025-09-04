// api/src/index.js
import express from 'express';
import Redis from 'ioredis';
import pkg from 'pg';
import { Client as ESClient } from '@elastic/elasticsearch';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ---- Redis (container service name) ----
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/0');

// ---- Postgres (use Client or Pool; you chose Client) ----
const { Client } = pkg;
const pgClient = new Client({
  host: process.env.PGHOST || 'postgres',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'caseiq',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
});

// ---- Elasticsearch (container service name) ----
const es = new ESClient({
  node: process.env.ES_NODE || 'http://elasticsearch:9200',
});

// ---- Init once on startup ----
async function init() {
  await pgClient.connect();
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS notes(
      id SERIAL PRIMARY KEY,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('Postgres ready');

  try {
    // ES 7.x: ping is fine
    await es.ping();
    console.log('Elasticsearch ready');
  } catch (e) {
    console.log('Elasticsearch not ready yet:', e.message);
  }
}

// ---- Health: never throws; reports which deps responded ----
app.get('/api/health', async (_req, res) => {
  const results = await Promise.allSettled([
    redis.ping(),                 // 0
    pgClient.query('SELECT 1'),   // 1
    es.info(),                    // 2
  ]);

  const deps = [];
  if (results[0].status === 'fulfilled') deps.push('redis');
  if (results[1].status === 'fulfilled') deps.push('postgres');
  if (results[2].status === 'fulfilled') deps.push('elasticsearch');

  const ok = deps.length === 3;
  res.status(ok ? 200 : 500).json({ ok, deps });
});

// ---- Redis counter ----
app.get('/api/cache', async (_req, res) => {
  const count = await redis.incr('hits');
  res.json({ hits: Number(count) });
});

// ---- DB time ----
app.get('/api/db/time', async (_req, res) => {
  const r = await pgClient.query('SELECT now() as now');
  res.json({ now: r.rows[0].now });
});

// ---- Notes (Postgres) ----
app.post('/api/notes', async (req, res) => {
  const { body } = req.body || {};
  if (!body || typeof body !== 'string') {
    return res.status(400).json({ error: 'body required' });
  }
  const r = await pgClient.query(
    'INSERT INTO notes(body) VALUES($1) RETURNING id, body, created_at',
    [body]
  );
  // also index into ES for search
  try {
    await es.index({
      index: 'notes',
      body: { body, created_at: new Date().toISOString() },
      refresh: 'true',
    });
  } catch (_) {}
  res.status(201).json(r.rows[0]);
});

app.get('/api/notes', async (_req, res) => {
  const r = await pgClient.query(
    'SELECT id, body, created_at FROM notes ORDER BY id DESC LIMIT 50'
  );
  res.json(r.rows);
});

// ---- Elasticsearch seed & search ----
app.post('/api/search/seed', async (_req, res) => {
  const index = 'notes';
  await es.indices.create(
    {
      index,
      body: {
        settings: { number_of_shards: 1, number_of_replicas: 0 },
        mappings: { properties: { body: { type: 'text' }, created_at: { type: 'date' } } },
      },
    },
    { ignore: [400] }
  );
  const docs = [
    { body: 'hello world sample document' },
    { body: 'support developer demo with elasticsearch' },
    { body: 'investigation case management platform search' },
  ];
  for (const d of docs) {
    await es.index({ index, body: { ...d, created_at: new Date().toISOString() } });
  }
  await es.indices.refresh({ index });
  res.json({ seeded: docs.length });
});

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ hits: [] });
  try {
    const r = await es.search({
      index: 'notes',
      body: { query: { match: { body: q } }, size: 10 },
    });
    const hits = (r.body.hits.hits || []).map(h => ({
      id: h._id,
      score: h._score,
      ...h._source,
    }));
    res.json({ hits });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- 404 ----
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// IMPORTANT: bind to 0.0.0.0 so container accepts external connections
app.listen(PORT, '0.0.0.0', async () => {
  await init();
  console.log(`API listening on ${PORT}`);
});
