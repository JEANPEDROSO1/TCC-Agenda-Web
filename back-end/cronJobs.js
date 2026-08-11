const cron = require('node-cron');
const pool = require('./db');
const { enviarLembreteCompromisso } = require('./services/emailService');

function iniciarCronJobs() {
    console.log("⏰ Iniciando serviço de Lembretes Automáticos...");

    // Roda a cada 1 minuto
    cron.schedule('* * * * *', async () => {
        try {
            // Obter hora atual no fuso do Brasil (GMT-3) para evitar bugs em servidores UTC (Render)
            const agora = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            
            const ano = agora.getFullYear();
            const mes = String(agora.getMonth() + 1).padStart(2, '0');
            const dia = String(agora.getDate()).padStart(2, '0');
            const hojeStr = `${ano}-${mes}-${dia}`;
            
            // Desativa compromissos do passado automaticamente
            const horaAtualStr = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}:00`;
            await pool.execute(`
                UPDATE compromissos 
                SET status = 'desativado' 
                WHERE status = 'ativo' 
                  AND (data < ? OR (data = ? AND hora < ?))
            `, [hojeStr, hojeStr, horaAtualStr]);

            // Busca compromissos de hoje que estão ativos
            const [compromissos] = await pool.execute(`
                SELECT c.*, u.email, u.nome 
                FROM compromissos c
                JOIN usuarios u ON c.usuario_id = u.id
                WHERE c.data = ? AND c.status = 'ativo'
            `, [hojeStr]);

            for (let comp of compromissos) {
                // Monta a data/hora do compromisso no fuso correto (Brasil)
                const horaBD = comp.hora.substring(0, 5); // "14:30"
                const [h, m] = horaBD.split(':');
                const dataComp = new Date(ano, agora.getMonth(), agora.getDate(), parseInt(h), parseInt(m), 0);
                
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
