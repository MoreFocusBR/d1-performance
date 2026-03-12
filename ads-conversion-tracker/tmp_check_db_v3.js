
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
        console.log('--- ALL TABLES ---');
        console.log(tables.join(', '));

        const targetVenda = tables.find(t => t.toLowerCase().includes('venda'));
        const targetRD = tables.find(t => t.toLowerCase().includes('rdstation'));

        if (targetVenda) {
            console.log(`--- MATCH FOR VENDA: ${targetVenda} ---`);
            const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${targetVenda}';`);
            cols.rows.forEach(c => console.log(`${c.column_name}: ${c.data_type}`));
        }

        if (targetRD) {
            console.log(`--- MATCH FOR RD: ${targetRD} ---`);
            const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${targetRD}';`);
            cols.rows.forEach(c => console.log(`${c.column_name}: ${c.data_type}`));
        }

        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
