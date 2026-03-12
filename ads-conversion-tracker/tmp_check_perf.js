
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_performance';

const client = new Client({
    connectionString: connectionString,
});

async function check() {
    try {
        await client.connect();
        const res = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
        console.log('--- TABLES IN d1_performance ---');
        res.rows.forEach(r => console.log(r.table_name));

        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
