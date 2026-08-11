-- Script para limpar as tabelas do projeto antigo no banco 'defaultdb'

USE defaultdb;

-- Desativar verificações de chaves estrangeiras temporariamente (se houver)
SET FOREIGN_KEY_CHECKS = 0;

-- Drop das tabelas do projeto antigo (PODE APAGAR SEM MEDO)
DROP TABLE IF EXISTS eventos, grupo_eventos, grupo_participantes, grupos, msal_cache, perfis, recuperacao_senha, refresh_tokens;

-- Reativar verificações de chaves estrangeiras
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Tabelas do projeto antigo removidas com sucesso do banco defaultdb!' AS Resultado;
