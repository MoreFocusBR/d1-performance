
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_orquestrador_db';

const client = new Client({
    connectionString: connectionString,
});

async function check() {
    try {
        await client.connect();
        console.log('Unique status in Venda:');
        const res = await client.query("SELECT DISTINCT \"DescricaoStatus\" FROM \"Venda\" LIMIT 20;");
        res.rows.forEach(r => console.log(r.DescricaoStatus));

        console.log('Sample Venda:');
        const res2 = await client.query("SELECT \"Id\", \"Codigo\", \"EntregaEmail\", \"ClienteDocumento\", \"DescricaoStatus\" FROM \"Venda\" LIMIT 5;");
        console.table(res2.rows);

        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
