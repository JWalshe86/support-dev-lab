import { expect } from 'chai';
import request from 'supertest';
import appPkg from '../package.json' assert { type: 'json' };

// We'll hit the running container via localhost:3000
const api = 'http://localhost:3000';

describe('API smoke', function() {
  this.timeout(10000);

  it('health should be ok', async () => {
    const res = await request(api).get('/api/health');
    expect(res.status).to.equal(200);
    expect(res.body.ok).to.equal(true);
  });
});
