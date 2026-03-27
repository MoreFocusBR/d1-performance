
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_performance';

const client = new Client({
    connectionString: connectionString,
});

async function check() {
    try {
        await client.connect();
        console.log('--- ALL CONVERSIONS ---');
        const res = await client.query(`
        SELECT last_conversion
        FROM rdstation_webhook_logs 
        WHERE last_conversion IS NOT NULL
        LIMIT 20;
    `);

        res.rows.forEach((r, i) => {
            console.log(`L${i + 1}: ${JSON.stringify(r.last_conversion)}`);
        });

        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
