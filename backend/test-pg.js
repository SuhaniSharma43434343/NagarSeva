import pg from 'pg';
const client = new pg.Client({ connectionString: 'postgresql://postgres:suhani4343@127.0.0.1:5432/NagarSeva' });
client.connect()
  .then(async () => {
    console.log('✅ PG CONNECTED!');
    const res = await client.query('SELECT current_database(), current_user;');
    console.log('Result:', res.rows);
    await client.end();
  })
  .catch(e => {
    console.error('❌ PG ERROR:', e.message);
  });
