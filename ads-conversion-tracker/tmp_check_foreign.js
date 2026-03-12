
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_orquestrador_db';

const client = new Client({
    connectionString: connectionString,
});

async function check() {
    try {
        await client.connect();
        console.log('Foreign tables:');
        const res = await client.query("SELECT * FROM information_schema.foreign_tables;");
        res.rows.forEach(r => console.log(`${r.foreign_table_schema}.${r.foreign_table_name}`));

        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
