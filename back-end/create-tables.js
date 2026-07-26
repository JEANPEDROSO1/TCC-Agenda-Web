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
                repeticao ENUM('nenhuma', 'diaria', 'semanal', 'mensal', 'anual') DEFAULT 'nenhuma',
                status ENUM('ativo', 'desativado') DEFAULT 'ativo',
                tempo_lembrete INT DEFAULT 0,
                lembrete_enviado TINYINT(1) DEFAULT 0,
                notificacao_hora_enviada TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Tabela compromissos criada com sucesso!");
        
        // Tenta alterar para garantir que tabelas antigas recebam a coluna
        try {
            await pool.execute(`
                ALTER TABLE compromissos 
                ADD COLUMN tempo_lembrete INT DEFAULT 0,
                ADD COLUMN lembrete_enviado TINYINT(1) DEFAULT 0,
                ADD COLUMN notificacao_hora_enviada TINYINT(1) DEFAULT 0;
            `);
            console.log("Colunas de lembrete adicionadas em base existente!");
        } catch(e) {}

        // Garante que a coluna foto seja grande o suficiente para armazenar Base64
        try {
            await pool.execute('ALTER TABLE usuarios MODIFY COLUMN foto LONGTEXT');
            console.log("Coluna foto verificada/modificada para suportar Base64.");
        } catch(e) {
            // Se a coluna não existir, tenta adicionar
            try {
                await pool.execute('ALTER TABLE usuarios ADD COLUMN foto LONGTEXT');
                console.log("Coluna foto adicionada na tabela usuarios.");
            } catch(innerE) {}
        }

    } catch (err) {
        console.error("Erro:", err);
    }
}

// Se for chamado diretamente via linha de comando
if (require.main === module) {
    up().then(() => process.exit(0));
}

module.exports = up;
