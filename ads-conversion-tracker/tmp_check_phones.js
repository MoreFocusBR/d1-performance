
import pg from 'pg';
const { Client } = pg;

async function check() {
    const clientV = new Client({
        connectionString: 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_orquestrador_db'
    });
    const clientP = new Client({
        connectionString: 'postgres://d1_orquestrador_db_user:m0rolZgKrck23Yd1p7rS72euVOtqxdI7@200.80.111.222:10103/d1_performance'
    });

    try {
        await clientV.connect();
        console.log('Venda Phone Samples:');
        const resV = await clientV.query("SELECT \"EntregaTelefone\" FROM \"Venda\" WHERE \"EntregaTelefone\" IS NOT NULL LIMIT 5;");
        resV.rows.forEach(r => console.log(r.EntregaTelefone));
        await clientV.end();

        await clientP.connect();
        console.log('RD Phone Samples:');
        const resP = await clientP.query("SELECT \"personal_phone\", \"mobile_phone\" FROM \"rdstation_webhook_logs\" WHERE \"personal_phone\" IS NOT NULL OR \"mobile_phone\" IS NOT NULL LIMIT 5;");
        resP.rows.forEach(r => console.log(`P: ${r.personal_phone}, M: ${r.mobile_phone}`));
        await clientP.end();
    } catch (err) {
        console.error(err);
    }
}

check();
