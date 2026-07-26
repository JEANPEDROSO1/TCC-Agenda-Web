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
            console.log("As colunas de lembrete já existem. Pulando.");
        } else {
            console.error("Erro ao atualizar tabela de compromissos:", err);
        }
    }

    try {
        console.log("Atualizando coluna foto na tabela usuarios para suportar imagens grandes (Base64)...");
        await pool.query(`
            ALTER TABLE usuarios 
            MODIFY COLUMN foto LONGTEXT;
        `);
        console.log("Coluna foto atualizada com sucesso!");
    } catch (err) {
        // Se a coluna foto não existir, ele vai dar erro. Mas assumindo que existe (conforme controller)
        if (err.code === 'ER_BAD_FIELD_ERROR') {
             console.log("Coluna foto não encontrada, tentando adicionar...");
             await pool.query(`
                ALTER TABLE usuarios 
                ADD COLUMN foto LONGTEXT;
             `);
             console.log("Coluna foto adicionada com sucesso!");
        } else {
            console.error("Erro ao atualizar tabela usuarios:", err);
        }
    } finally {
        process.exit();
    }
}

updateDb();
