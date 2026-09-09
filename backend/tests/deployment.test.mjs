import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import jwt from 'jsonwebtoken';

test('production API uses PORT, CORS, admin authentication, and configured SQL upstream', async () => {
  let captured;
  const upstream = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      captured = { path: req.url, key: req.headers['x-service-key'], body: JSON.parse(body) };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ result: { content: 'Test answer' } }));
    });
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const reserved = http.createServer();
  await new Promise(resolve => reserved.listen(0, '127.0.0.1', resolve));
  const port = reserved.address().port;
  await new Promise(resolve => reserved.close(resolve));
  const secret = 'test-only-not-a-deployment-secret';
  const child = spawn(process.execPath, ['dist/server.js'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, NODE_ENV: 'production', PORT: String(port),
      DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/test', JWT_SECRET: secret,
      CORS_ORIGINS: 'https://test.vercel.app', MODEL_SERVICE_URL: 'http://127.0.0.1:1',
      SQL_AGENT_URL: `http://127.0.0.1:${upstream.address().port}`,
      INTERNAL_API_KEY: 'test-service-key', cloudinary_cloud_name: 'test', cloudinary_api_key: 'test', cloudinary_api_secret: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', data => logs += data);
  child.stderr.on('data', data => logs += data);
  const base = `http://127.0.0.1:${port}`;
  try {
    let healthy = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${base}/api/health`)).ok) { healthy = true; break; } } catch {}
      await delay(100);
    }
    assert.ok(healthy, logs);
    const preflight = await fetch(`${base}/api/chat/ask`, { method: 'OPTIONS', headers: { Origin: 'https://test.vercel.app', 'Access-Control-Request-Method': 'POST' } });
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://test.vercel.app');
    const denied = await fetch(`${base}/api/health`, { headers: { Origin: 'https://untrusted.example' } });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    assert.equal((await fetch(`${base}/api/chat/ask`, { method: 'POST' })).status, 401);
    const token = role => jwt.sign({ userId: 'test', role }, secret);
    const send = role => fetch(`${base}/api/chat/ask?question=Hello&language=hindi`, { method: 'POST', headers: { Authorization: `Bearer ${token(role)}` } });
    assert.equal((await send('SURVEYOR')).status, 403);
    const reply = await send('ADMIN');
    assert.equal(reply.status, 200);
    assert.equal((await reply.json()).result.content, 'Test answer');
    assert.deepEqual(captured, { path: '/ask', key: 'test-service-key', body: { question: 'Hello', language: 'hindi' } });
    assert.equal((await fetch(`${base}/api/ready`)).status, 503);
  } finally {
    child.kill();
    await new Promise(resolve => upstream.close(resolve));
  }
});
