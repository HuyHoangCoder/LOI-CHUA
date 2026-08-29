'use strict';
require('./helpers/env');

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../app');

test('GET /khoe-khong trả về ok', async () => {
  const res = await request(createApp()).get('/khoe-khong');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { ok: true });
});
