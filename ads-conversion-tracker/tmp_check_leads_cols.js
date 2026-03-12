
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_performance';

const client = new Client({
    connectionString: connectionString,
});

async function check() {
    try {
        await client.connect();
        console.log('--- COLUMNS OF leads IN d1_performance ---');
        const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads';");
        cols.rows.forEach(c => console.log(`${c.column_name} (${c.data_type})`));
        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
