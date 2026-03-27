
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_performance';

const client = new Client({
    connectionString: connectionString,
});

async function check() {
    try {
        await client.connect();
        console.log('--- RELEVANT CONVERSIONS ---');
        const res = await client.query(`
        SELECT last_conversion->>'source' as source, 
               last_conversion->>'medium' as medium, 
               last_conversion->>'campaign' as campaign
        FROM rdstation_webhook_logs 
        WHERE (last_conversion->>'source' ILIKE '%google%' 
           OR last_conversion->>'source' ILIKE '%facebook%'
           OR last_conversion->>'source' ILIKE '%meta%'
           OR last_conversion->>'source' ILIKE '%instagram%')
        LIMIT 10;
    `);

        res.rows.forEach((r, i) => {
            console.log(`Lead ${i + 1}: S=${r.source}, M=${r.medium}, C=${r.campaign}`);
        });

        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
