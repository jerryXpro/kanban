const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.uvikbwgcfndsjkeibxrr:XhPzQhT66yI4nL4L@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'
});

async function runSQL() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const result = await client.query(`
      ALTER TABLE scheduled_events DROP CONSTRAINT scheduled_events_recurrence_check;
      ALTER TABLE scheduled_events ADD CONSTRAINT scheduled_events_recurrence_check CHECK (recurrence IN ('once', 'weekly', 'monthly', 'quarterly', 'yearly'));
    `);

        console.log('Migration executed successfully:', result);
    } catch (err) {
        console.error('Error executing migration:', err);
    } finally {
        await client.end();
    }
}

runSQL();
