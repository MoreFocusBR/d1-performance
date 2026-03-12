
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_orquestrador_db';

const client = new Client({
    connectionString: connectionString,
});

async function check() {
    try {
        await client.connect();
        console.log('Searching for any object with RDSTATION:');
        const res = await client.query("SELECT * FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE relname ILIKE '%rdstation%';");
        res.rows.forEach(r => console.log(`${r.nspname}.${r.relname} (${r.relkind})`));

        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
