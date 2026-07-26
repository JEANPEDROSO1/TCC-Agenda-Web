// Arquivo de configuração global para o Front-end
// Usado para definir a URL base da API dependendo do ambiente

const ENV = {
    // Altere para true quando fizer o deploy na Vercel
    IS_PRODUCTION: true, 
    
    // URL da API quando rodando localmente (mude para o IP do seu PC se for testar no celular, ex: 'http://192.168.1.10:3000/api')
    LOCAL_API_URL: 'http://localhost:3000/api',
    
    // Na Vercel, usamos o Proxy (vercel.json) para enganar o navegador e evitar bloqueio de cookies no celular.
    // A Vercel repassará automaticamente tudo que for '/api' para o Render.
    PRODUCTION_API_URL: '/api'
};

// Variável global que os outros arquivos vão usar
const API_BASE_URL = ENV.IS_PRODUCTION ? ENV.PRODUCTION_API_URL : ENV.LOCAL_API_URL;
