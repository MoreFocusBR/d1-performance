
import pg from 'pg';
const { Client } = pg;

async function check() {
    const clientP = new Client({
        connectionString: 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_performance'
    });

    try {
        await clientP.connect();
        console.log('RD custom_fields sample:');
        const resP = await clientP.query("SELECT \"custom_fields\" FROM \"rdstation_webhook_logs\" WHERE \"custom_fields\" IS NOT NULL LIMIT 5;");
        resP.rows.forEach(r => console.log(JSON.stringify(r.custom_fields)));
        await clientP.end();
    } catch (err) {
        console.error(err);
    }
}

check();
