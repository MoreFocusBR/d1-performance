
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_orquestrador_db';

const client = new Client({
    connectionString: connectionString,
});

async function check() {
    try {
        await client.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
        const tables = res.rows.map(r => r.table_name);
        console.log('--- TABLES (One per line) ---');
        tables.forEach(t => console.log(t));

        const vendaTables = tables.filter(t => t.toLowerCase().includes('venda'));
        const rdTables = tables.filter(t => t.toLowerCase().includes('rdstation'));

        for (const t of vendaTables) {
            console.log(`--- COLUMNS FOR: ${t} ---`);
            const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${t}';`);
            cols.rows.forEach(c => console.log(`${c.column_name} (${c.data_type})`));
        }

        for (const t of rdTables) {
            console.log(`--- COLUMNS FOR: ${t} ---`);
            const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${t}';`);
            cols.rows.forEach(c => console.log(`${c.column_name} (${c.data_type})`));
        }

        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
