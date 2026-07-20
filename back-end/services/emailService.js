const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
require('isomorphic-fetch'); // Necessário para o client do Graph funcionar no Node

require('dotenv').config();

const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const remetente = process.env.EMAIL_REMETENTE;

// Autenticação Client Credentials Flow (App-only authentication)
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

const authProvider = {
    getAccessToken: async () => {
        const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
        return tokenResponse.token;
    }
};

const graphClient = Client.initWithMiddleware({ authProvider });

/**
 * Envia um e-mail através da API Microsoft Graph
 * @param {string} destinatario - Email do usuário que solicitou recuperação
 * @param {string} codigo - Código de 6 dígitos gerado
 */
async function enviarCodigoRecuperacao(destinatario, codigo) {
    // Caso as credenciais não estejam configuradas, exibe apenas no console (para desenvolvimento local)
    if (!tenantId || !clientId || !clientSecret || tenantId.includes('seu_tenant_id')) {
        console.log('\n======================================================');
        console.log('⚠️ MICROSOFT GRAPH NÃO CONFIGURADO NO .ENV');
        console.log(`✉️ SIMULAÇÃO DE E-MAIL PARA: ${destinatario}`);
        console.log(`🔑 CÓDIGO DE RECUPERAÇÃO: ${codigo}`);
        console.log('======================================================\n');
        return true;
    }

    const mensagem = {
        message: {
            subject: 'Seu Código de Recuperação - Agenda Web',
            body: {
                contentType: 'HTML',
                content: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2>Recuperação de Senha</h2>
                        <p>Você solicitou a recuperação de senha no Agenda Web.</p>
                        <p>Seu código de verificação é:</p>
                        <h1 style="color: #2563eb; letter-spacing: 5px;">${codigo}</h1>
                        <p>Este código expira em 15 minutos.</p>
                        <p>Se você não solicitou isso, ignore este e-mail.</p>
                    </div>
                `
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: destinatario
                    }
                }
            ]
        },
        saveToSentItems: 'false'
    };

    try {
        await graphClient.api(`/users/${remetente}/sendMail`).post(mensagem);
        console.log(`✅ E-mail enviado com sucesso via MS Graph para ${destinatario}`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao enviar e-mail via MS Graph:', error);
        throw error;
    }
}

module.exports = {
    enviarCodigoRecuperacao
};
