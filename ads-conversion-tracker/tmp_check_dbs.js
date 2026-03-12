
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/postgres';

const client = new Client({
    connectionString: connectionString,
});

async function check() {
    try {
        await client.connect();
        const res = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false;");
        console.log('--- DATABASES ---');
        res.rows.forEach(r => console.log(r.datname));

        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
