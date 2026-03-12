
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_orquestrador_db';

const client = new Client({
    connectionString: connectionString,
});

async function check() {
    try {
        await client.connect();
        console.log('Connected!');

        console.log('--- TABLES ---');
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
        res.rows.forEach(r => console.log(r.table_name));

        const tables = res.rows.map(r => r.table_name);

        // CASE SENSITIVE check or not? SQL is usually lowercase unless quoted.
        // Let's check for 'Venda', 'venda', etc.
        const vendaTable = tables.find(t => t.toLowerCase() === 'venda');
        if (vendaTable) {
            console.log(`--- COLUMNS OF ${vendaTable} ---`);
            const vCols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${vendaTable}';`);
            vCols.rows.forEach(c => console.log(`${c.column_name} (${c.data_type})`));
        } else {
            console.log('Table Venda not found!');
        }

        const rdTable = tables.find(t => t.toLowerCase() === 'rdstation_webhook_logs');
        if (rdTable) {
            console.log(`--- COLUMNS OF ${rdTable} ---`);
            const rCols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${rdTable}';`);
            rCols.rows.forEach(c => console.log(`${c.column_name} (${c.data_type})`));
        } else {
            console.log('Table rdstation_webhook_logs not found!');
        }

        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
