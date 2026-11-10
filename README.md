# Meu Controle — PWA v1.2

Aplicativo financeiro pessoal e familiar com tema escuro, senha local, armazenamento local e suporte offline.

## Recursos
- Cadastro de despesas e receitas
- Classificação de despesas fixas e variáveis
- Categorias, vencimentos e forma de pagamento
- Contas pendentes, em atraso e marcação como pagas
- Despesas recorrentes mensais
- Orçamento por categoria
- Metas financeiras com prazo, progresso e registro de valores guardados
- Sugestões calculadas localmente a partir do histórico de despesas e receitas
- Comparativo de despesas entre meses
- Backup JSON dos lançamentos

## Executar localmente
Abra a pasta no terminal e execute `python -m http.server 8000`. Acesse `http://localhost:8000`.

## Publicação
O projeto é publicado pelo GitHub Actions no GitHub Pages. Endereço: https://modernastm93-ops.github.io/meu-controle/

## Dados, privacidade e limitações
- Lançamentos, metas, orçamentos, recorrências e credenciais locais ficam no IndexedDB deste navegador/dispositivo.
- Não há sincronização entre dispositivos nem envio automático para nuvem.
- A senha local é armazenada como hash PBKDF2-SHA-256; ela protege a interface, mas não criptografa o banco de dados.
- As sugestões são regras locais e estimativas, não consultoria financeira nem previsões.
- O backup atual exporta apenas lançamentos; metas, orçamentos e modelos recorrentes ainda não estão incluídos. Faça cópia separada dessas informações antes de trocar de dispositivo ou limpar os dados do navegador.
- Importar backup substitui os lançamentos atuais, preservando os demais cadastros locais.
