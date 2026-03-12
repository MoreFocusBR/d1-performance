
import pg from 'pg';
const { Client } = pg;

const dbs = ['d1_orquestrador_db', 'd1_performance'];
const host = '200.80.111.222';
const user = 'd1_orquestrador_db_user';
const password = 'm0rolZgKrck23Yd1p7rS72euVOtqxdI7';
const port = 10103;

async function check() {
    for (const dbName of dbs) {
        console.log(`\n\n--- CHECKING DB: ${dbName} ---`);
        const client = new Client({
            host, port, user, password,
            database: dbName
        });

        try {
            await client.connect();
            const res = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog') ORDER BY table_name;");
            console.log('Tables found:');
            res.rows.forEach(r => {
                if (r.table_name.toLowerCase().includes('venda') || r.table_name.toLowerCase().includes('rdstation')) {
                    console.log(`[MATCH] ${r.table_schema}.${r.table_name}`);
                }
            });
            await client.end();
        } catch (err) {
            console.error(`Error in ${dbName}:`, err.message);
        }
    }
}

check();
