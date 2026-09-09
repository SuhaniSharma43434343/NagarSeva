import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('migration history supports issue uploads, analysis, repairs, and a restricted SQL role', async () => {
  const db = new PGlite();
  try {
    const root = new URL('../prisma/migrations/', import.meta.url);
    for (const name of (await readdir(root, { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name).sort()) {
      await db.exec(await readFile(new URL(`${name}/migration.sql`, root), 'utf8'));
    }
    await db.exec(`INSERT INTO "Issue" (id, type, status, latitude, longitude, "imageUrl", "updatedAt", confidence) VALUES ('test', 'POTHOLE', 'DETECTED', 22.3, 73.2, 'https://example.com/image.jpg', now(), 0.8);
      INSERT INTO "IssueAnalysis" (id, "issueId", severity, "depthEstimateCm", "sizeClass", "priorityScore", recommendations) VALUES ('analysis', 'test', 'LOW', 1, 'SMALL', 1, 'Review');
      INSERT INTO "IssueResolution" (id, "issueId", "repairQualityScore", "qualityRating", "aiVerdict") VALUES ('repair', 'test', 80, 'GOOD', 'Review');`);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM "IssueAnalysis"')).rows[0].n, 1);
    await db.exec(await readFile(new URL('../../deploy/sql-agent-readonly.sql', import.meta.url), 'utf8'));
    await db.exec('SET ROLE nagarseva_reader');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM "Issue"')).rows[0].n, 1);
    await assert.rejects(db.query('SELECT password FROM "User"'), /permission denied/);
    await assert.rejects(db.query('DELETE FROM "Issue"'), /permission denied/);
    await db.exec('RESET ROLE; DELETE FROM "IssueAnalysis"; DELETE FROM "IssueResolution"; DELETE FROM "Issue";');
  } finally { await db.close(); }
});
