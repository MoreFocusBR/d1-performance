
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
        console.table(res.rows);

        // If Venda exists, describe it
        const tables = res.rows.map(r => r.table_name);
        if (tables.includes('Venda')) {
            console.log('--- COLUMNS OF Venda ---');
            const vCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Venda';");
            console.table(vCols.rows);
        } else {
            console.log('Table Venda not found!');
        }

        if (tables.includes('rdstation_webhook_logs')) {
            console.log('--- COLUMNS OF rdstation_webhook_logs ---');
            const rCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rdstation_webhook_logs';");
            console.table(rCols.rows);
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
