const pool = require('./db');

async function up() {
    try {
        console.log("Criando tabela de compromissos...");
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS compromissos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                titulo VARCHAR(255) NOT NULL,
                descricao TEXT,
                data DATE NOT NULL,
                hora TIME NOT NULL,
                urgencia ENUM('normal', 'urgente') DEFAULT 'normal',
                repeticao ENUM('nenhuma', 'diaria', 'semanal', 'mensal') DEFAULT 'nenhuma',
                status ENUM('ativo', 'desativado') DEFAULT 'ativo',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
            )
        `);
        console.log("Tabela compromissos criada com sucesso!");
    } catch (err) {
        console.error("Erro:", err);
    } finally {
        process.exit();
    }
}
up();
