import request from 'supertest';
import { expect } from 'chai';

// Hit the API directly (container exposes 3000)
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('API smoke', function () {
  this.timeout(10000);

  it('health should be ok', async () => {
    const res = await request(BASE).get('/api/health');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('ok', true);
    expect(res.body).to.have.property('deps').that.includes('redis');
  });

  it('cache should increment', async () => {
    const r1 = await request(BASE).get('/api/cache');
    const r2 = await request(BASE).get('/api/cache');
    expect(r1.status).to.equal(200);
    expect(r2.status).to.equal(200);
    expect(r2.body.hits).to.be.greaterThan(r1.body.hits - 1);
  });

  it('search seed + query should return hits', async () => {
    await request(BASE).post('/api/search/seed').expect(200);
    const res = await request(BASE).get('/api/search').query({ q: 'hello' });
    expect(res.status).to.equal(200);
    const hits = Array.isArray(res.body) ? res.body : (res.body.hits || []);
    expect(hits.length).to.be.greaterThan(0);
  });
});
