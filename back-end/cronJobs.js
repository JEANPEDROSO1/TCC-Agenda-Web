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
    console.log("⏰ Iniciando serviço de Lembretes Automáticos (Habilitado para hibernação)...");

    // Roda a cada 1 minuto
    cron.schedule('* * * * *', async () => {
        try {
            const agora = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            
            const ano = agora.getFullYear();
            const mes = String(agora.getMonth() + 1).padStart(2, '0');
            const dia = String(agora.getDate()).padStart(2, '0');
            const hojeStr = `${ano}-${mes}-${dia}`;
            
            // 1. Busca TODOS os compromissos ativos
            const [compromissos] = await pool.execute(`
                SELECT c.*, DATE_FORMAT(c.data, '%Y-%m-%d') as data, DATE_FORMAT(c.ultima_notificacao_data, '%Y-%m-%d') as ultima_notificacao_data, u.email, u.nome 
                FROM compromissos c
                JOIN usuarios u ON c.usuario_id = u.id
                WHERE c.status = 'ativo'
            `);

            // 2. Filtra os que ocorrem hoje
            const compromissosDeHoje = compromissos.filter(c => ocorreNaData(c, hojeStr));

            for (let comp of compromissosDeHoje) {
                // Se é um compromisso recorrente (ou normal) e mudou o dia, reseta as flags em memória
                if (comp.ultima_notificacao_data !== hojeStr) {
                    comp.lembrete_enviado = 0;
                    comp.notificacao_hora_enviada = 0;
                }

                const horaBD = comp.hora.substring(0, 5);
                const [h, m] = horaBD.split(':');
                const dataComp = new Date(ano, agora.getMonth(), agora.getDate(), parseInt(h), parseInt(m), 0);
                
                const diffMinutos = Math.round((dataComp - agora) / 60000);

                // Prepara a lista de e-mails de destino
                let emailsDestino = [comp.email]; // Email original
                if (comp.grupo_id) {
                    const [membros] = await pool.execute(`
                        SELECT u.email FROM grupo_membros gm
                        JOIN usuarios u ON gm.usuario_id = u.id
                        WHERE gm.grupo_id = ?
                    `, [comp.grupo_id]);
                    emailsDestino = membros.map(m => m.email);
                }

                // Lembrete antecipado
                if (comp.tempo_lembrete > 0 && comp.lembrete_enviado === 0) {
                    if (diffMinutos <= comp.tempo_lembrete && diffMinutos > 0) {
                        let enviouAlgum = false;
                        for (let emailDest of emailsDestino) {
                            const sucesso = await enviarLembreteCompromisso(emailDest, comp, 'antecipado');
                            if (sucesso) enviouAlgum = true;
                        }
                        if (enviouAlgum) {
                            await pool.execute(
                                'UPDATE compromissos SET lembrete_enviado = 1, ultima_notificacao_data = ? WHERE id = ?', 
                                [hojeStr, comp.id]
                            );
                            comp.lembrete_enviado = 1;
                        }
                    } else if (diffMinutos <= 0) {
                        await pool.execute(
                            'UPDATE compromissos SET lembrete_enviado = 1, ultima_notificacao_data = ? WHERE id = ?', 
                            [hojeStr, comp.id]
                        );
                        comp.lembrete_enviado = 1;
                    }
                }

                // Notificação da hora
                if (comp.notificacao_hora_enviada === 0) {
                    if (diffMinutos <= 0) {
                        let enviouAlgum = false;
                        for (let emailDest of emailsDestino) {
                            const sucesso = await enviarLembreteCompromisso(emailDest, comp, 'hora');
                            if (sucesso) enviouAlgum = true;
                        }
                        if (enviouAlgum) {
                            await pool.execute(
                                'UPDATE compromissos SET notificacao_hora_enviada = 1, ultima_notificacao_data = ? WHERE id = ?', 
                                [hojeStr, comp.id]
                            );
                            comp.notificacao_hora_enviada = 1;
                        }
                    }
                }
            }

            // 3. Desativa compromissos não-recorrentes que JÁ ENVIARAM a notificação da hora OU que são de dias anteriores
            const horaAtualStr = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}:00`;
            
            await pool.execute(`
                UPDATE compromissos 
                SET status = 'desativado' 
                WHERE status = 'ativo' 
                  AND (repeticao = 'nenhuma' OR repeticao IS NULL)
                  AND (
                      data < ? 
                      OR (data = ? AND hora < ? AND notificacao_hora_enviada = 1)
                  )
            `, [hojeStr, hojeStr, horaAtualStr]);

        } catch (error) {
            console.error("Erro no Cron de Lembretes:", error);
        }
    });
}

module.exports = iniciarCronJobs;
