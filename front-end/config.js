// Arquivo de configuração global para o Front-end
// Usado para definir a URL base da API dependendo do ambiente

const ENV = {
    // Altere para true quando fizer o deploy na Vercel
    IS_PRODUCTION: false, 
    
    // URL da API quando rodando localmente no seu computador (com Node)
    LOCAL_API_URL: 'http://localhost:3000/api',
    
    // URL da API oficial quando estiver hospedada no Render (ex: https://agenda-backend.onrender.com/api)
    PRODUCTION_API_URL: 'URL_DO_RENDER_AQUI/api'
};

// Variável global que os outros arquivos vão usar
const API_BASE_URL = ENV.IS_PRODUCTION ? ENV.PRODUCTION_API_URL : ENV.LOCAL_API_URL;
