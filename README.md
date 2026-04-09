# B3 Ativos Monitor Pro

Aplicação web para monitoramento de ativos da B3 com foco em velocidade, clareza visual e uso diário.

Projeto feito com HTML, CSS e JavaScript puro (ES Modules), sem frameworks.

## Funcionalidades

- Monitoramento de cotações em tempo real via brapi
- Tabela com ticker, ativo, preço, variação, variação %, máxima, mínima e volume
- Destaque visual para alta, baixa, maior alta e maior baixa
- Filtro de ativos com alerta armado
- Ordenação por ticker, preço e variação %
- Atualização automática (30s, 60s, 120s) e atualização manual
- Favoritos persistentes com modo manual e alfabético
- Alertas de preço (`>=` e `<=`) com histórico de disparos
- Notificações com toast, som opcional e Notification API
- Gráfico por ativo com períodos intraday, 5D, 1M, 6M e 1Y
- Modo claro/escuro e modo compacto
- Múltiplas watchlists
- Exportação e importação de backup em JSON
- Campo de token brapi na interface (salvar, limpar, mostrar/ocultar)
- Autocomplete de ativos com logo, preço, variação e navegação por teclado
- Validação para impedir inclusão de ticker inexistente
- Interface responsiva com experiência mobile otimizada
- PWA instalável (ícone, manifesto e Service Worker)

## Mobile

- Layout otimizado para celular
- Tabela convertida para cards legíveis no mobile
- Barra inferior com abas para alternar entre Cotações e Painel
- Menu de ações recolhido no topo para reduzir poluição visual

## PWA

O projeto já está preparado para instalação como aplicativo:

- `manifest.json`
- `sw.js`
- ícones em `icons/`
- favicon para aba do navegador

### Atualizar o app sem desinstalar

Para forçar atualização da versão instalada no celular/desktop:

1. Abra `sw.js`
2. Altere `CACHE_VERSION` (exemplo: `v1` para `v2`)
3. Faça deploy/publicação dos arquivos

Quando houver versão nova, o app mostra um banner de atualização com botão para recarregar na versão mais recente.

## Stack

- HTML5
- CSS3 responsivo
- JavaScript ES Modules
- Fetch API
- localStorage
- Chart.js (CDN)

## Estrutura de Arquivos

- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `sw.js`
- `start-local.bat`
- `icons/`
- `js/config.js`
- `js/api.js`
- `js/storage.js`
- `js/alerts.js`
- `js/ui.js`
- `js/charts.js`

## Como Executar Localmente

Como o projeto usa módulos ES e Service Worker, execute com servidor HTTP.

### Opção 1: script pronto

Execute:

```bat
start-local.bat
```

Depois abra `http://localhost:5500`.

### Opção 2: Python manual

```bash
python -m http.server 5500
```

Depois abra `http://localhost:5500`.

## Token brapi

O token pode ser configurado direto na interface, na seção de controles:

1. Cole o token no campo `Token brapi`
2. Clique em `Salvar`
3. O token fica salvo localmente no navegador

Sem token válido, alguns ativos podem ficar sem cotação por limitação da API.

## Persistência

Os dados são persistidos no localStorage:

- configurações de interface
- watchlists
- favoritos
- alertas
- histórico de alertas
- token configurado localmente

## Observações

- As respostas da API podem variar conforme plano/limites da brapi
- O histórico de preços pode ter fallback quando o endpoint não retorna série esperada

## Licença

Defina a licença conforme sua estratégia (MIT, proprietária, etc.).
