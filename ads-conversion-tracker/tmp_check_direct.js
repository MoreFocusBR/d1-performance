
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_orquestrador_db';

const client = new Client({
    connectionString: connectionString,
});

async function check() {
    try {
        await client.connect();
        console.log('Testing direct queries...');

        try {
            const resV = await client.query("SELECT COUNT(*) FROM \"Venda\" LIMIT 1;");
            console.log('Venda found row count:', resV.rows[0].count);
        } catch (e) { console.log('Venda error:', e.message); }

        try {
            const resR = await client.query("SELECT COUNT(*) FROM rdstation_webhook_logs LIMIT 1;");
            console.log('rdstation_webhook_logs found row count:', resR.rows[0].count);
        } catch (e) { console.log('rdstation_webhook_logs error:', e.message); }

        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
