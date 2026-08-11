const cron = require('node-cron');
const pool = require('./db');
const { enviarLembreteCompromisso } = require('./services/emailService');

function ocorreNaData(comp, dataStr) {
    if (comp.data === dataStr) return true;
    if (dataStr < comp.data) return false;

    if (comp.repeticao === 'diaria') return true;

    if (comp.repeticao === 'semanal') {
        const d1 = new Date(comp.data + "T12:00:00");
        const d2 = new Date(dataStr + "T12:00:00");
        const diffDias = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        return diffDias % 7 === 0;
    }

    if (comp.repeticao === 'mensal') {
        return comp.data.split('-')[2] === dataStr.split('-')[2];
    }

    if (comp.repeticao === 'anual') {
        return comp.data.substring(5) === dataStr.substring(5);
    }

    return false;
}

function iniciarCronJobs() {
    console.log("⏰ Iniciando serviço de Lembretes Automáticos...");

    // Reseta as flags de notificação de compromissos recorrentes todo dia à meia-noite (00:01)
    cron.schedule('1 0 * * *', async () => {
        try {
            await pool.execute(`
                UPDATE compromissos 
                SET lembrete_enviado = 0, notificacao_hora_enviada = 0 
                WHERE status = 'ativo' AND repeticao != 'nenhuma' AND repeticao IS NOT NULL
            `);
            console.log("🔄 Flags de lembrete resetadas para compromissos recorrentes.");
        } catch (error) {
            console.error("Erro ao resetar flags de lembretes recorrentes:", error);
        }
    });

    // Roda a cada 1 minuto
    cron.schedule('* * * * *', async () => {
        try {
            const agora = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            
            const ano = agora.getFullYear();
            const mes = String(agora.getMonth() + 1).padStart(2, '0');
            const dia = String(agora.getDate()).padStart(2, '0');
            const hojeStr = `${ano}-${mes}-${dia}`;
            
            // Desativa compromissos do passado que NÃO SÃO RECORRENTES
            const horaAtualStr = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}:00`;
            await pool.execute(`
                UPDATE compromissos 
                SET status = 'desativado' 
                WHERE status = 'ativo' 
                  AND (repeticao = 'nenhuma' OR repeticao IS NULL)
                  AND (data < ? OR (data = ? AND hora < ?))
            `, [hojeStr, hojeStr, horaAtualStr]);

            // Busca TODOS os compromissos ativos
            const [compromissos] = await pool.execute(`
                SELECT c.*, u.email, u.nome 
                FROM compromissos c
                JOIN usuarios u ON c.usuario_id = u.id
                WHERE c.status = 'ativo'
            `);

            // Filtra os que ocorrem hoje
            const compromissosDeHoje = compromissos.filter(c => ocorreNaData(c, hojeStr));

            for (let comp of compromissosDeHoje) {
                const horaBD = comp.hora.substring(0, 5);
                const [h, m] = horaBD.split(':');
                const dataComp = new Date(ano, agora.getMonth(), agora.getDate(), parseInt(h), parseInt(m), 0);
                
                const diffMinutos = Math.round((dataComp - agora) / 60000);

                if (comp.tempo_lembrete > 0 && comp.lembrete_enviado === 0) {
                    if (diffMinutos <= comp.tempo_lembrete && diffMinutos > 0) {
                        const sucesso = await enviarLembreteCompromisso(comp.email, comp, 'antecipado');
                        if (sucesso) {
                            await pool.execute('UPDATE compromissos SET lembrete_enviado = 1 WHERE id = ?', [comp.id]);
                        }
                    }
                }

                if (comp.notificacao_hora_enviada === 0) {
                    if (diffMinutos <= 0 && diffMinutos > -15) {
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
