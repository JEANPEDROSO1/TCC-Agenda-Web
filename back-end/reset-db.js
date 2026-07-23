const pool = require('./db');

async function reset() {
    try {
        console.log("Desativando chaves estrangeiras...");
        await pool.execute('SET FOREIGN_KEY_CHECKS = 0');

        console.log("Limpando tabela compromissos...");
        await pool.execute('TRUNCATE TABLE compromissos');

        console.log("Limpando tabela usuarios...");
        await pool.execute('TRUNCATE TABLE usuarios');

        console.log("Reativando chaves estrangeiras...");
        await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

        console.log("Banco de dados resetado com sucesso! Próximo cadastro será o ID 1.");
    } catch (err) {
        console.error("Erro ao resetar banco:", err);
    } finally {
        process.exit();
    }
}
reset();
