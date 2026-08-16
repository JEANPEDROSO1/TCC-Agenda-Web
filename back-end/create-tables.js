const pool = require('./db');

async function up() {
    try {
        console.log("Criando tabela de grupos...");
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS grupos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                descricao TEXT,
                admin_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `);
        console.log("Tabela grupos criada com sucesso!");

        console.log("Criando tabela de grupo_membros...");
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS grupo_membros (
                grupo_id INT NOT NULL,
                usuario_id INT NOT NULL,
                papel ENUM('admin', 'membro', 'comum') DEFAULT 'comum',
                status VARCHAR(20) DEFAULT 'aceito',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (grupo_id, usuario_id),
                FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `);
        console.log("Tabela grupo_membros criada com sucesso!");
        
        // Garante que a coluna status exista na tabela grupo_membros (se já existia)
        try {
            await pool.execute("ALTER TABLE grupo_membros ADD COLUMN status VARCHAR(20) DEFAULT 'aceito'");
            console.log("Coluna status adicionada na tabela grupo_membros.");
        } catch(e) {
            // Ignora se já existir
        }

        console.log("Criando tabela de compromissos...");
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS compromissos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                grupo_id INT DEFAULT NULL,
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
                ultima_notificacao_data DATE DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE
            )
        `);
        console.log("Tabela compromissos criada com sucesso!");
        
        // Tenta alterar para garantir que tabelas antigas recebam a coluna
        try {
            await pool.execute(`
                ALTER TABLE compromissos 
                ADD COLUMN tempo_lembrete INT DEFAULT 0,
                ADD COLUMN lembrete_enviado TINYINT(1) DEFAULT 0,
                ADD COLUMN notificacao_hora_enviada TINYINT(1) DEFAULT 0,
                ADD COLUMN ultima_notificacao_data DATE DEFAULT NULL;
            `);
            console.log("Colunas de lembrete adicionadas em base existente!");
        } catch(e) {
            // Se já existirem, tentar adicionar só a nova
            try {
                await pool.execute(`
                    ALTER TABLE compromissos 
                    ADD COLUMN ultima_notificacao_data DATE DEFAULT NULL;
                `);
                console.log("Coluna ultima_notificacao_data adicionada na tabela compromissos.");
            } catch(e2) {}
        }

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
        
        // Garante que a coluna status exista na tabela usuarios
        try {
            await pool.execute('ALTER TABLE usuarios ADD COLUMN status TINYINT(1) DEFAULT 0');
            console.log("Coluna status adicionada na tabela usuarios.");
            // Força todas as contas atuais a status 0 (regra do usuário)
            await pool.execute('UPDATE usuarios SET status = 0');
            console.log("Contas antigas marcadas com status 0 (verificação pendente).");
        } catch(e) {
            // Se já existir, ignora.
            if (e.code !== 'ER_DUP_FIELDNAME') console.error("Erro ao adicionar status:", e);
        }

        // Tenta adicionar a coluna grupo_id na tabela compromissos se for banco existente
        try {
            await pool.execute(`
                ALTER TABLE compromissos 
                ADD COLUMN grupo_id INT DEFAULT NULL,
                ADD FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE;
            `);
            console.log("Coluna grupo_id adicionada na tabela compromissos existente.");
        } catch(e) {
            if (e.code !== 'ER_DUP_FIELDNAME' && e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
                // Ignore errors if already exists
            }
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
