import express from 'express';
import Redis from 'ioredis';
import pkg from 'pg';
import { Client as ESClient } from '@elastic/elasticsearch';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Postgres
const { Client } = pkg;
const pgClient = new Client({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'demo',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
});

// Elasticsearch
const es = new ESClient({ node: process.env.ES_HOST || 'http://localhost:9200' });

async function init() {
  await pgClient.connect();
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS notes(
      id SERIAL PRIMARY KEY,
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('Postgres ready');

  // ES ping
  try {
    await es.ping();
    console.log('Elasticsearch ready');
  } catch (e) {
    console.log('Elasticsearch not ready yet:', e.message);
  }
}

app.get('/api/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/cache', async (req, res) => {
  const count = await redis.incr('hits');
  res.json({ hits: count });
});

app.get('/api/db/time', async (req, res) => {
  const r = await pgClient.query('SELECT NOW() as now');
  res.json({ now: r.rows[0].now });
});

// Seed ES with a sample doc
app.post('/api/search/seed', async (req, res) => {
  const index = 'notes';
  await es.indices.create({ index }, { ignore: [400] });
  const doc = { body: 'hello world from elasticsearch', created_at: new Date().toISOString() };
  const { body: resp } = await es.index({ index, body: doc, refresh: 'true' });
  res.json({ seeded: true, id: resp && resp._id ? resp._id : null });
});

// Simple search
app.get('/api/search', async (req, res) => {
  const q = req.query.q || '';
  const index = 'notes';
  try {
    const { body } = await es.search({
      index,
      body: {
        query: q ? { query_string: { query: q } } : { match_all: {} }
      }
    });
    res.json(body.hits.hits.map(h => ({ id: h._id, ...h._source })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add a note to Postgres (quick demo)
app.post('/api/notes', async (req, res) => {
  const { body } = req.body || {};
  if (!body) return res.status(400).json({ error: 'body required'});
  const r = await pgClient.query('INSERT INTO notes(body) VALUES($1) RETURNING *', [body]);
  res.json(r.rows[0]);
});

app.get('/api/notes', async (req, res) => {
  const r = await pgClient.query('SELECT * FROM notes ORDER BY id DESC LIMIT 50');
  res.json(r.rows);
});

app.listen(PORT, async () => {
  await init();
  console.log(`API listening on ${PORT}`);
});
