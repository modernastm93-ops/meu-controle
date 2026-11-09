# Meu Controle — PWA v1.0
Aplicativo financeiro pessoal/familiar com tema escuro, armazenamento local e suporte offline.

## Recursos
- Cadastro de despesas e receitas
- Classificação de despesas fixas e variáveis
- Categorias, data e forma de pagamento
- Resumo mensal, saldo e gráfico por categoria
- Histórico filtrado por mês e tipo
- Exclusão de lançamentos
- Backup JSON para exportar e importar
- PWA instalável e cache offline

## Executar localmente
Abra a pasta no terminal e execute `python -m http.server 8000`. Acesse `http://localhost:8000`.

## Publicar com GitHub Pages
Em Settings > Pages, selecione Deploy from a branch, branch main e pasta / (root). Abra a URL HTTPS gerada no Safari e escolha Compartilhar > Adicionar à Tela de Início.

## Dados
Os registros são armazenados no IndexedDB do navegador/dispositivo. Não há sincronização em nuvem. Exporte backups JSON regularmente. Importar um backup substitui os registros existentes.