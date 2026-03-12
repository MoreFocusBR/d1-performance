
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_performance';

const client = new Client({
    connectionString: connectionString,
});

async function check() {
    try {
        await client.connect();
        console.log('--- LEADS UTM DATA ---');
        const res = await client.query(`
        SELECT email, utm_source, utm_campaign, gclid, fbclid 
        FROM leads 
        WHERE utm_source IS NOT NULL OR gclid IS NOT NULL OR fbclid IS NOT NULL
        LIMIT 10;
    `);

        res.rows.forEach((r, i) => {
            console.log(`Lead ${i + 1}: Email=${r.email}, S=${r.utm_source}, C=${r.utm_campaign}, GCLID=${r.gclid ? 'YES' : 'NO'}, FBCLID=${r.fbclid ? 'YES' : 'NO'}`);
        });

        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
