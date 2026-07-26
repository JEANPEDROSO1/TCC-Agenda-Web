const cron = require('node-cron');
const pool = require('./db');
const { enviarLembreteCompromisso } = require('./services/emailService');

function iniciarCronJobs() {
    console.log("⏰ Iniciando serviço de Lembretes Automáticos...");

    // Roda a cada 1 minuto
    cron.schedule('* * * * *', async () => {
        try {
            // Obter hora atual no fuso do servidor (ou ajustado)
            const agora = new Date();
            // Precisamos formatar 'agora' para comparar com o DB, mas é mais fácil no SQL
            // Porém o Node local pode ter fuso diferente. 
            // O ideal é trazer todos os compromissos de hoje e calcular a diferença em JS para evitar problemas de fuso no MySQL.

            const hojeStr = agora.toISOString().split('T')[0];
            
            // Busca compromissos de hoje que estão ativos
            const [compromissos] = await pool.execute(`
                SELECT c.*, u.email 
                FROM compromissos c
                JOIN usuarios u ON c.usuario_id = u.id
                WHERE c.data = ? AND c.status = 'ativo'
            `, [hojeStr]);

            for (let comp of compromissos) {
                // Monta a data/hora do compromisso
                const dataComp = new Date(`${comp.data.split('T')[0]}T${comp.hora}`);
                const diffMinutos = Math.round((dataComp - agora) / 60000);

                // 1. Alerta Antecipado (lembrete_enviado == 0)
                if (comp.tempo_lembrete > 0 && comp.lembrete_enviado === 0) {
                    if (diffMinutos <= comp.tempo_lembrete && diffMinutos > 0) {
                        // Envia antecipado
                        const sucesso = await enviarLembreteCompromisso(comp.email, comp, 'antecipado');
                        if (sucesso) {
                            await pool.execute('UPDATE compromissos SET lembrete_enviado = 1 WHERE id = ?', [comp.id]);
                        }
                    }
                }

                // 2. Alerta na Hora Exata (notificacao_hora_enviada == 0)
                if (comp.notificacao_hora_enviada === 0) {
                    if (diffMinutos <= 0 && diffMinutos > -15) { // Até 15 min de atraso ele tenta enviar
                        // Envia na hora
                        const sucesso = await enviarLembreteCompromisso(comp.email, comp, 'hora');
                        if (sucesso) {
                            await pool.execute('UPDATE compromissos SET notificacao_hora_enviada = 1 WHERE id = ?', [comp.id]);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Erro no Cron de Lembretes:", error);
        }
    });
}

module.exports = iniciarCronJobs;
