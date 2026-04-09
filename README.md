# B3 Ativos Monitor Pro

Aplicação web profissional para monitoramento de ativos da B3 com foco em usabilidade, performance e organização visual.

Construída com HTML, CSS e JavaScript puro, sem frameworks, com arquitetura modular, atualização periódica de mercado, favoritos, alertas, múltiplas watchlists e gráfico histórico.

## Principais Funcionalidades

- Monitoramento de cotações por ticker (brapi)
- Tabela premium com:
  - ticker
  - nome do ativo
  - preço atual
  - variação absoluta
  - variação percentual
  - máxima do dia
  - mínima do dia
  - volume
- Destaque visual de alta e baixa
- Destaque de maior alta e maior baixa
- Filtro para mostrar apenas ativos com alerta armado
- Ordenação por ticker, preço e variação percentual
- Atualização automática (30, 60, 120 segundos)
- Botão de atualização manual
- Controle contra múltiplas requisições simultâneas
- Favoritos persistidos em localStorage
- Reordenação manual e modo alfabético
- Alertas de preço (>= e <=)
- Histórico de alertas disparados
- Notificação visual (toast), som opcional e Notification API
- Gráfico com Chart.js por ativo, com períodos:
  - intraday
  - 5 dias
  - 1 mês
  - 6 meses
  - 1 ano
- Modo claro/escuro
- Modo compacto (alta densidade)
- Múltiplas watchlists
- Exportação e importação de backup em JSON

## Stack e Arquitetura

- HTML5 sem frameworks
- CSS3 responsivo com tema e microinterações
- JavaScript ES Modules
- Fetch API para integração com mercado
- localStorage para persistência local
- Chart.js via CDN para visualização de séries

Estrutura de arquivos:

- index.html
- styles.css
- app.js
- js/config.js
- js/api.js
- js/storage.js
- js/alerts.js
- js/ui.js
- js/charts.js

Responsabilidades:

- app.js: orquestração da aplicação, estado global e eventos
- js/api.js: integração com brapi (cotações e histórico)
- js/storage.js: persistência e migração de dados legados
- js/alerts.js: regras de alerta e disparo
- js/ui.js: renderização de interface e utilitários de UI
- js/charts.js: criação e atualização do gráfico
- js/config.js: configurações e chaves de storage

## Integração com brapi

A aplicação usa como base:

- GET https://brapi.dev/api/quote/PETR4
- GET https://brapi.dev/api/quote/PETR4,VALE3,ITUB4

### Configurar token (opcional, recomendado para evolução)

1. Abra o arquivo js/config.js
2. Edite a propriedade apiToken em APP_CONFIG
3. Defina seu token:

```js
export const APP_CONFIG = {
  apiBaseUrl: "https://brapi.dev/api",
  apiToken: "SEU_TOKEN_AQUI",
  requestTimeoutMs: 12000,
  defaultRefreshInterval: 60,
  refreshIntervals: [30, 60, 120],
  maxHistoryItems: 40,
  maxTriggeredHistoryItems: 80
};
```

Se apiToken estiver vazio, a aplicação tenta funcionar no modo básico gratuito quando possível.

## Como Executar Localmente

Como o projeto usa módulos ES, rode com servidor HTTP local.

### Opção 1: VS Code + Live Server

1. Abra a pasta do projeto no VS Code
2. Clique com o botão direito em index.html
3. Escolha Open with Live Server

### Opção 2: Python

```bash
python -m http.server 5500
```

Depois abra no navegador:

http://localhost:5500

## Como Usar

1. Digite um ticker no campo de busca e clique em Adicionar
2. Ajuste ordenação, filtro e intervalo de atualização
3. Crie alertas por ativo com condição >= ou <=
4. Clique em Gráfico na linha do ativo para abrir o modal
5. Crie watchlists separadas para estratégias diferentes
6. Use Exportar para salvar backup em JSON
7. Use Importar para restaurar backup

## Persistência de Dados

Os dados ficam salvos no localStorage do navegador:

- configurações da interface
- watchlists
- favoritos
- alertas
- histórico de alertas

Há migração automática de estrutura legada para estrutura de workspace (watchlists).

## Comportamento de Histórico

O histórico de preços pode variar conforme disponibilidade do endpoint e plano da API.

Quando não houver série histórica retornada pelo endpoint esperado, a aplicação usa fallback mock para não quebrar a UX do gráfico.

## Qualidade e Expansão

Base preparada para evolução com backend futuro:

- separação de responsabilidades por módulo
- organização de estado para múltiplas watchlists
- camada de API isolada para troca de provedor
- regras de negócio desacopladas da renderização

## Próximos Passos Recomendados para Produção

- adicionar autenticação e sincronização de dados em backend
- configurar cache inteligente e retries exponenciais
- adicionar testes automatizados (unit e integração)
- implementar CI/CD e versionamento semântico
- registrar logs de erro e telemetria (ex: Sentry)
- adicionar controle de permissões e perfis de usuário

## Licença

Defina a licença conforme sua estratégia de distribuição (MIT, proprietária, etc.).
