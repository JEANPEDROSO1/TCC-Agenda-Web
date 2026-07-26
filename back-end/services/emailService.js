// URL da sua API privada criada no Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwDiqrLezETAXj8V-_8dU8OLmTo1uEVJRQyCGmiAc1t_6P0HSiCPleHXtG_QNG9lsTt/exec';
const GOOGLE_SCRIPT_TOKEN = 'agenda_tcc_secreto_2026';

/**
 * Envia um e-mail com o código de recuperação via Google Apps Script (Bypass de porta 587)
 * @param {string} destinatario - Email do usuário que solicitou recuperação
 * @param {string} codigo - Código de 6 dígitos gerado
 */
async function enviarCodigoRecuperacao(destinatario, codigo) {
    console.log(`[ETAPA 3 - INÍCIO] Preparando para enviar via Google Apps Script para: ${destinatario}`);

    const htmlBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #2563eb; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Recuperação de Senha</h2>
            <p>Olá,</p>
            <p>Você solicitou a recuperação de senha no <strong>Agenda Web</strong>.</p>
            <p>Seu código de verificação é:</p>
            <div style="text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 5px; background: #f3f4f6; padding: 10px 20px; border-radius: 8px; border: 1px dashed #2563eb;">${codigo}</span>
            </div>
            <p>Este código expira em 15 minutos.</p>
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">Se você não solicitou isso, pode ignorar este e-mail.</p>
        </div>
    `;

    try {
        console.log(`[ETAPA 3 - PROCESSANDO] Disparando Webhook POST (HTTPS) para o Google...`);
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: GOOGLE_SCRIPT_TOKEN,
                to: destinatario,
                subject: 'Seu Código de Recuperação - Agenda Web',
                html: htmlBody
            })
        });

        const data = await response.json();

        if (data.success) {
            console.log(`[ETAPA 3 - SUCESSO] ✅ E-mail enviado com sucesso pelo Google Apps Script!`);
            return true;
        } else {
            console.error('[ETAPA 3 - FALHA DA API GOOGLE] ❌ O Google retornou erro:', data.error);
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('[ETAPA 3 - FALHA DE CONEXÃO HTTPS] ❌ Erro ao conectar com o script:', error);
        throw error;
    }
}

async function enviarLembreteCompromisso(destinatario, compromisso, tipo) {
    console.log(`Preparando lembrete (${tipo}) para: ${destinatario}`);

    let tituloLembrete = tipo === 'antecipado' ? 'Lembrete de Compromisso Próximo' : 'Seu compromisso começou!';
    let msgExtra = tipo === 'antecipado' 
        ? `Faltam ${compromisso.tempo_lembrete} minutos para o seu compromisso começar.` 
        : `O seu compromisso está marcado para agora!`;

    const htmlBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #2563eb; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">${tituloLembrete}</h2>
            <p>Olá,</p>
            <p>${msgExtra}</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1e40af;">${compromisso.titulo}</h3>
                <p style="margin-bottom: 0;"><strong>Data:</strong> ${compromisso.data}</p>
                <p style="margin-bottom: 0;"><strong>Hora:</strong> ${compromisso.hora}</p>
                ${compromisso.descricao ? `<p style="margin-bottom: 0;"><strong>Descrição:</strong> ${compromisso.descricao}</p>` : ''}
            </div>
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">Equipe Agenda Web</p>
        </div>
    `;

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: GOOGLE_SCRIPT_TOKEN,
                to: destinatario,
                subject: `${tituloLembrete} - Agenda Web`,
                html: htmlBody
            })
        });
        const data = await response.json();
        if (data.success) {
            console.log(`✅ Lembrete (${tipo}) enviado com sucesso para ${destinatario}`);
            return true;
        } else {
            console.error(`❌ Falha do Google ao enviar lembrete: ${data.error}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro de conexão ao enviar lembrete:', error);
        return false;
    }
}

module.exports = {
    enviarCodigoRecuperacao,
    enviarLembreteCompromisso
};
