const pool = require('./db');

async function updateDb() {
    try {
        console.log("Adicionando novas colunas na tabela compromissos...");
        await pool.query(`
            ALTER TABLE compromissos 
            ADD COLUMN tempo_lembrete INT DEFAULT 0,
            ADD COLUMN lembrete_enviado TINYINT(1) DEFAULT 0,
            ADD COLUMN notificacao_hora_enviada TINYINT(1) DEFAULT 0;
        `);
        console.log("Colunas adicionadas com sucesso!");
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log("As colunas já existem. Pulando.");
        } else {
            console.error("Erro ao atualizar tabela:", err);
        }
    } finally {
        process.exit();
    }
}

updateDb();
