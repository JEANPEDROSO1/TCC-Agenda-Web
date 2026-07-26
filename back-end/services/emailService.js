const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuração do transportador Nodemailer para Outlook
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true para porta 465, false para as outras
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Envia um e-mail com o código de recuperação
 * @param {string} destinatario - Email do usuário que solicitou recuperação
 * @param {string} codigo - Código de 6 dígitos gerado
 */
async function enviarCodigoRecuperacao(destinatario, codigo) {
    // Caso as credenciais não estejam configuradas, exibe apenas no console (para desenvolvimento local)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || process.env.SMTP_PASS.includes('senha')) {
        console.log('\n======================================================');
        console.log('⚠️ NODEMAILER NÃO CONFIGURADO COMPLETAMENTE NO .ENV');
        console.log(`✉️ SIMULAÇÃO DE E-MAIL PARA: ${destinatario}`);
        console.log(`🔑 CÓDIGO DE RECUPERAÇÃO: ${codigo}`);
        console.log('======================================================\n');
        return true;
    }

    const mensagem = {
        from: `"Agenda Web" <${process.env.SMTP_USER}>`,
        to: destinatario,
        subject: 'Seu Código de Recuperação - Agenda Web',
        html: `
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
        `
    };

    try {
        const info = await transporter.sendMail(mensagem);
        console.log(`✅ E-mail enviado com sucesso para ${destinatario} via Nodemailer (${info.messageId})`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao enviar e-mail via Nodemailer:', error);
        throw error;
    }
}

module.exports = {
    enviarCodigoRecuperacao
};
