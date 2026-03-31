
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_performance';

const client = new Client({
    connectionString: connectionString,
});

async function check() {
    try {
        await client.connect();
        console.log('--- SAMPLE CONVERSION DATA ---');
        const res = await client.query(`
        SELECT first_conversion, first_conversion 
        FROM rdstation_webhook_logs 
        WHERE first_conversion IS NOT NULL OR first_conversion IS NOT NULL 
        LIMIT 5;
    `);

        res.rows.forEach((r, i) => {
            console.log(`Row ${i + 1}:`);
            console.log('First:', JSON.stringify(r.first_conversion));
            console.log('Last:', JSON.stringify(r.first_conversion));
        });

        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
