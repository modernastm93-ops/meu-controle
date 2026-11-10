# Meu Controle — PWA v1.5

Aplicativo financeiro pessoal e familiar com tema escuro, login local, armazenamento local e suporte offline.

## Recursos
- Dashboard mensal com receitas, despesas, saldo e estimativa de quanto ainda pode gastar
- Cálculo de disponibilidade considerando despesas registradas (pagas e pendentes) e reserva mensal estimada para metas
- Cadastro, edição, busca e exclusão de lançamentos
- Categorias padrão e categorias personalizadas para despesas e receitas
- Lançamentos favoritos para registrar movimentações frequentes rapidamente
- Contas pendentes, vencimentos e marcação como pagas
- Despesas recorrentes mensais
- Orçamentos por categoria
- Metas financeiras com prazo e acompanhamento de valores guardados
- Sugestões locais com base no histórico recente
- Comparativo de despesas entre meses
- Backup JSON dos lançamentos (a exportação atual ainda não inclui metas, orçamentos, recorrências, favoritos ou categorias personalizadas)

## Executar localmente
Abra a pasta no terminal e execute `python -m http.server 8000`. Acesse `http://localhost:8000`.

## Publicação
O projeto é publicado pelo GitHub Actions no GitHub Pages:
https://modernastm93-ops.github.io/meu-controle/

## Dados, privacidade e limitações
- Lançamentos, metas, orçamentos, recorrências, categorias personalizadas, favoritos e credenciais locais ficam no IndexedDB deste navegador/dispositivo.
- Não há sincronização entre dispositivos nem envio automático para nuvem.
- A senha local é armazenada como hash PBKDF2-SHA-256; ela protege a interface, mas não criptografa o banco de dados.
- A estimativa de quanto ainda pode gastar é calculada a partir das receitas cadastradas, despesas do mês (incluindo as pendentes) e reserva mensal sugerida para as metas. Ela depende da qualidade e completude dos lançamentos.
- Sugestões são regras locais e estimativas, não consultoria financeira nem previsões.
- A exportação de backup atual inclui apenas lançamentos. Faça backups e mantenha cópias seguras antes de limpar os dados do navegador ou trocar de dispositivo.
- Importar backup substitui os lançamentos atuais, preservando os demais cadastros locais.

## Alertas e inteligência financeira (v1.7)
- Central local de alertas com contas vencidas e vencimentos nos próximos sete dias.
- Avisos para orçamentos acima de 85% e limites ultrapassados.
- Identificação de despesas acima das receitas e ausência de receitas cadastradas.
- Comparação com o mesmo período do mês anterior para indicar aumento relevante das despesas e categorias variáveis.
- Avisos de metas com prazo vencido.
- Prévia dos principais pontos de atenção no Dashboard e contador no menu.
- A análise roda no dispositivo ao abrir/atualizar o aplicativo; não envia notificações externas nem acessa contas bancárias.
