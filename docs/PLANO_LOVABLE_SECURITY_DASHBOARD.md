# Painel unificado de indicadores de segurança (Lovable + Supabase)

Documento de contexto e prompts. Pode ser entregue a outro agente (ou usado diretamente no Lovable) para reconstruir o mesmo aplicativo com o mesmo fluxo.

---

## 1. Contexto da conversa

- O usuário opera ambientes **Acronis Cyber Protect Cloud** nos datacenters **br01** e **br02** (`https://br01-cloud.acronis.com`, `https://br02-cloud.acronis.com`). Já existe um script de exemplo `acronis_query.py` que usa OAuth2 *client credentials* (`POST /api/2/idp/token`), lista alertas (`/api/alert_manager/v1/alerts`, com paginação por cursor `after`) e resolve nomes de tenants (`/api/2/tenants?uuids=`).
- Credenciais de API do Acronis são fixas (API client criado em Configurações > Clientes de API). Um client por datacenter, perfil somente leitura. O token de acesso é gerado a cada execução (~2h).
- Foi explicado o que é **MCP** e como hospedá-lo (local via stdio, remoto via HTTP com proxy e autenticação). Para este projeto, o foco mudou para um **site com usuário e senha**.
- **Requisito final:** um site em que usuários autenticados (usuário/senha) consultam indicadores de segurança de várias fontes: **Zoho Desk, Acronis (br01/br02), Zabbix, Microsoft Graph**. Eles escolhem o **período** e **quais soluções** consultar. A resposta pode ser **tempo real** ou **D-1**.
- **Decisão de arquitetura (agnóstica):** front-end → API de consulta (autentica, autoriza por fonte, audita) → roteador (hoje = tempo real; até D-1 = histórico; períodos mistos combinam os dois) → conectores por fonte (modelo de dados comum) → cofre de segredos. Ingestão agendada (ETL) grava o dia anterior no armazém histórico.
- **Front-end escolhido:** Lovable. O front nunca fala direto com as fontes.
- **Opção escolhida para vibecoding: Opção 2, Lovable + Supabase** (Auth, Postgres com RLS, Edge Functions, pg_cron, Secrets). É a mais fácil de construir por prompt. Alternativa (Opção 1): API própria em FastAPI + Postgres + Redis + Caddy. Os conectores seriam módulos Python e o Lovable seria só o front, com JWT.
- **Quem consulta as fontes na Opção 2:** as **Edge Functions** (conectores), nunca o front. Credenciais ficam em **Supabase Secrets**.

## 2. Princípios (obrigatórios)

1. Nenhum segredo no front, no chat do Lovable ou no repositório. Segredos só em Supabase Secrets, preenchidos pelo usuário no painel.
2. Contas de API das fontes sempre **somente leitura**.
3. Sem cadastro público. Só admin cria usuários.
4. **RLS** em todas as tabelas. O usuário só vê as fontes liberadas para ele. Testar com dois usuários.
5. Modelo de dados comum para todas as fontes.
6. Resultado parcial: se uma fonte falhar em tempo real, devolver o restante e listar `fontes_indisponiveis`.
7. Auditoria de consultas.
8. Cada conector tem a mesma interface: `buscar(inicio, fim) -> Evento[]`.

## 3. Modelo de dados comum

Tabela `eventos`:

| coluna | tipo | observação |
|---|---|---|
| id | uuid pk | |
| fonte | text | `acronis_br01`, `acronis_br02`, `zabbix`, `zoho_desk`, `ms_graph` |
| id_externo | text | id na fonte; `unique(fonte, id_externo)` para upsert |
| cliente | text | tenant/cliente/organização |
| tipo | text | |
| severidade | text | `critica`, `alta`, `media`, `baixa`, `info` |
| titulo | text | |
| recurso | text | host, dispositivo, usuário ou ticket |
| status | text | `aberto`, `resolvido`, etc. |
| criado_em | timestamptz | índice `(fonte, criado_em)` e `(cliente, criado_em)` |
| atualizado_em | timestamptz | |
| payload | jsonb | dado bruto |

Outras tabelas: `profiles(id, nome, role: admin|analista)`, `user_fontes(user_id, fonte)`, `auditoria(id, user_id, fontes, inicio, fim, modo, criado_em)`, `ingestao_log(id, fonte, dia, status, qtd, erro, criado_em)`.

## 4. Segredos (preencher no painel do Supabase, nunca no chat)

```
ACRONIS_BR01_CLIENT_ID / ACRONIS_BR01_CLIENT_SECRET
ACRONIS_BR02_CLIENT_ID / ACRONIS_BR02_CLIENT_SECRET
ZABBIX_URL / ZABBIX_API_TOKEN
ZOHO_DESK_CLIENT_ID / ZOHO_DESK_CLIENT_SECRET / ZOHO_DESK_REFRESH_TOKEN / ZOHO_DESK_ORG_ID / ZOHO_ACCOUNTS_URL / ZOHO_DESK_API_URL
MSGRAPH_TENANT_ID / MSGRAPH_CLIENT_ID / MSGRAPH_CLIENT_SECRET
```

Permissões do Graph (application, com consentimento de admin): `SecurityAlert.Read.All`, `SecurityIncident.Read.All`, e `AuditLog.Read.All` se usar sign-ins.

## 5. Prompts para o Lovable (colar em ordem, um por vez)

Valide cada etapa antes de seguir para a próxima.

### Prompt 1: Base, login e permissões

```
Crie um app React + TypeScript + Tailwind com login por e-mail e senha usando Supabase Auth.
Regras:
- Não existe cadastro público. Remova qualquer tela de sign up. Somente admins criam usuários.
- Crie a tabela profiles (id uuid = auth.users.id, nome text, role text check in ('admin','analista')) e a tabela user_fontes (user_id uuid, fonte text, primary key (user_id, fonte)).
- Crie um trigger que cria o profile ao criar o usuário, com role 'analista' por padrão.
- Habilite RLS: o usuário lê apenas o próprio profile e as próprias linhas de user_fontes. Admins leem e escrevem tudo.
- Rotas protegidas: sem sessão, redirecionar para /login. Layout com menu lateral (Painel, Consulta, Admin) e botão de sair. Admin só aparece para role admin.
- Tema escuro por padrão, visual de painel de segurança (SOC).
- Não coloque nenhuma chave ou segredo no código.
```

### Prompt 2: Banco de eventos, auditoria e RLS

```
Crie as tabelas no Supabase:
1) eventos: id uuid pk default gen_random_uuid(), fonte text not null, id_externo text not null, cliente text, tipo text, severidade text check in ('critica','alta','media','baixa','info'), titulo text, recurso text, status text, criado_em timestamptz not null, atualizado_em timestamptz, payload jsonb. Constraint unique (fonte, id_externo). Índices em (fonte, criado_em) e (cliente, criado_em).
2) auditoria: id, user_id, fontes text[], inicio timestamptz, fim timestamptz, modo text, criado_em default now().
3) ingestao_log: id, fonte text, dia date, status text, qtd int, erro text, criado_em default now().
RLS:
- eventos: SELECT apenas quando eventos.fonte existir em user_fontes do auth.uid(), ou o usuário for admin. Nenhum INSERT/UPDATE/DELETE para usuários do front (apenas service role).
- auditoria: o usuário lê as próprias linhas; admin lê todas; escrita só via service role.
- ingestao_log: só admin lê.
Gere também um script SQL de teste que mostre que um usuário sem a fonte 'zabbix' em user_fontes não consegue ver eventos do zabbix.
```

### Prompt 3: Tela de Consulta

```
Crie a página /consulta com:
- Seletor de período: Hoje, Ontem, Últimos 7 dias, Últimos 30 dias e Personalizado (data/hora inicial e final).
- Multiseleção de fontes, mostrando apenas as fontes liberadas ao usuário em user_fontes: Acronis BR01, Acronis BR02, Zabbix, Zoho Desk, Microsoft Graph.
- Seletor de modo: Auto (padrão), Tempo real, D-1 (histórico). Mostre uma dica explicando que Auto usa o histórico até ontem e tempo real para hoje.
- Filtros adicionais: severidade (multi), cliente (texto), busca livre.
- Botão Consultar que chama a Edge Function "consultar" via supabase.functions.invoke com { fontes, inicio, fim, modo }.
- Resultado: tabela com paginação no cliente, ordenação, colunas fonte, cliente, severidade (badge colorido), título, recurso, status, data/hora. Clique na linha abre um painel lateral com o payload em JSON.
- Se a resposta trouxer fontes_indisponiveis, mostre um alerta amarelo "Resultado parcial: fonte X indisponível".
- Estados de carregamento (skeleton), vazio e erro. Botão Exportar CSV do resultado filtrado.
Enquanto a função não existir, use dados mockados atrás de uma flag VITE_USE_MOCK.
```

### Prompt 4: Painel de visualização (dashboard)

```
Crie a página /painel (página inicial após o login) com o mesmo filtro de período e fontes da Consulta, compartilhado por um componente reutilizável. Os dados vêm da Edge Function "consultar" (ou de "resumo" se existir).
Componentes:
1. Cards de KPI no topo: total de eventos, críticos, altos, abertos e fontes com falha.
2. Gráfico de barras empilhadas: eventos por dia, empilhado por severidade.
3. Gráfico de rosca: distribuição por fonte.
4. Gráfico de barras horizontais: top 10 clientes/recursos com mais eventos.
5. Gráfico de linha: tendência de eventos críticos e altos no período, comparada ao período anterior de mesma duração.
6. Tabela "Últimos eventos críticos" com 10 linhas e link para /consulta já filtrada.
7. Faixa de status das fontes: um chip por fonte (verde = ok, amarelo = parcial, vermelho = indisponível) com o horário da última atualização e se o dado é "tempo real" ou "D-1".
8. Botão de atualizar e opção de atualização automática a cada 5 minutos (apenas quando o período inclui hoje).
Use Recharts. Cores por severidade: crítica vermelho, alta laranja, média amarelo, baixa azul, info cinza. Layout responsivo em grid. Tudo deve respeitar as fontes que o usuário pode ver.
```

### Prompt 5: Edge Function "consultar" (roteador)

```
Crie a Edge Function "consultar" (Deno/TypeScript):
Entrada: { fontes: string[], inicio: ISO, fim: ISO, modo: 'auto'|'tempo_real'|'d1' }.
Regras:
1. Valide o JWT do usuário e leia as fontes permitidas em user_fontes (ou todas, se admin). Remova da entrada qualquer fonte não permitida. Valide inicio < fim e limite o intervalo a 90 dias.
2. Defina "hoje" no fuso America/Sao_Paulo. Roteamento:
   - modo d1: leia somente da tabela eventos.
   - modo tempo_real: chame os conectores para todo o intervalo.
   - modo auto: leia eventos para a parte anterior a hoje 00:00 e chame os conectores só para a parte de hoje.
3. Chame os conectores em paralelo (Promise.allSettled) com timeout de 10 s cada, invocando as funções conector-acronis, conector-zabbix, conector-zoho e conector-graph. Use cache em tabela de 2 minutos (cache_consulta com chave hash, resposta jsonb, expira_em) para tempo real.
4. Una e deduplique por (fonte, id_externo), ordene por criado_em desc.
5. Resposta: { eventos, fontes_indisponiveis: [{fonte, motivo}], gerado_em, origem_por_fonte: {fonte: 'tempo_real'|'d1'|'misto'} }.
6. Grave uma linha em auditoria usando o service role.
Nunca retorne erro 500 por falha de uma única fonte. Nunca exponha segredos ou mensagens brutas das fontes.
```

### Prompt 6: Interface dos conectores e stubs

```
Crie um módulo compartilhado supabase/functions/_shared/tipos.ts com o tipo Evento (mesmo schema da tabela eventos) e a interface Conector { fonte: string; buscar(inicio: Date, fim: Date): Promise<Evento[]> }.
Crie as Edge Functions conector-acronis, conector-zabbix, conector-zoho e conector-graph. Cada uma:
- Aceita POST { inicio, fim } e só pode ser chamada pelas outras funções (valide um header interno com o service role ou um segredo INTERNAL_KEY).
- Lê credenciais só de Deno.env.
- Devolve Evento[] no modelo comum.
- Trata paginação, limites de taxa (retry com backoff em 429) e erros.
Por enquanto, retorne dados de exemplo; vou pedir a implementação real de cada uma em seguida.
```

### Prompt 7: Conector Acronis (br01 e br02)

```
Implemente o conector-acronis para dois datacenters, br01 e br02. Gere eventos com fonte 'acronis_br01' e 'acronis_br02'.
Para cada datacenter:
- Base URL https://{dc}-cloud.acronis.com
- Token: POST /api/2/idp/token com Basic auth (CLIENT_ID:CLIENT_SECRET) e body grant_type=client_credentials. Segredos ACRONIS_BR01_* e ACRONIS_BR02_*. Reutilize o token em memória até perto de expirar (~2 h).
- Alertas: GET /api/alert_manager/v1/alerts?limit=100 com paginação pelo cursor paging.cursors.after. Filtre por createdAt entre inicio e fim.
- Nomes de tenants: GET /api/2/tenants?uuids=a,b,c em lotes de 50.
Mapeamento: id_externo = id do alerta; cliente = nome do tenant; tipo = type; severidade = mapear (critical->critica, error->alta, warning->media, information->info); titulo = type + categoria; recurso = details.resourceName; status = aberto; criado_em = createdAt; payload = alerta bruto.
Se um datacenter falhar, retorne o outro e informe o erro apenas desse. Os dois datacenters são independentes.
```

### Prompt 8: Conector Zabbix

```
Implemente o conector-zabbix usando a API JSON-RPC (ZABBIX_URL + /api_jsonrpc.php) com token Bearer ZABBIX_API_TOKEN.
Use problem.get com time_from e time_till (epoch), selectHosts, selectTags, recent=true, sortfield eventid e output extend. Para o histórico de resolvidos, complemente com event.get.
Mapeamento: id_externo = eventid; cliente = tag "cliente" se existir, senão o grupo do host; tipo = "problema"; severidade = Zabbix 5->critica, 4->alta, 3->media, 2->baixa, 1/0->info; titulo = name; recurso = hosts[0].name; status = r_eventid != 0 ? resolvido : aberto; criado_em = clock; payload bruto.
Pagine com limit e trate timeouts.
```

### Prompt 9: Conector Zoho Desk

```
Implemente o conector-zoho para o Zoho Desk.
- Obtenha access token via refresh token: POST {ZOHO_ACCOUNTS_URL}/oauth/v2/token com grant_type=refresh_token, client_id, client_secret, refresh_token. Faça cache do token por ~50 min.
- Tickets: GET {ZOHO_DESK_API_URL}/api/v1/tickets com header orgId = ZOHO_DESK_ORG_ID, parâmetros from/limit (limit 100), sortBy=createdTime e filtro por createdTime entre inicio e fim (se a API não filtrar, filtre no código e pare a paginação quando passar do início).
Mapeamento: id_externo = id; cliente = contact/account name; tipo = "ticket"; severidade pela priority (Urgent->critica, High->alta, Medium->media, Low->baixa); titulo = subject; recurso = ticketNumber; status = status; criado_em = createdTime; payload bruto.
Respeite o limite de taxa do Zoho com backoff em 429.
```

### Prompt 10: Conector Microsoft Graph

```
Implemente o conector-graph.
- Token: POST https://login.microsoftonline.com/{MSGRAPH_TENANT_ID}/oauth2/v2.0/token com client_credentials e scope https://graph.microsoft.com/.default.
- Alertas: GET https://graph.microsoft.com/v1.0/security/alerts_v2?$filter=createdDateTime ge {inicio} and createdDateTime le {fim}&$top=100, seguindo @odata.nextLink.
- Opcional: incidentes em /security/incidents.
Mapeamento: id_externo = id; cliente = tenantId ou nome do tenant; tipo = category; severidade = high->alta, medium->media, low->baixa, informational->info (use critica para alertas high com classificação truePositive e incidentes de alta prioridade); titulo = title; recurso = primeiro evidence relevante (device ou user); status = status; criado_em = createdDateTime; payload bruto.
Trate 429 com Retry-After.
```

### Prompt 11: Ingestão diária (D-1)

```
Crie a Edge Function "ingestao-diaria":
- Aceita { dia?: 'YYYY-MM-DD' } e usa por padrão o dia anterior no fuso America/Sao_Paulo, de 00:00 a 23:59:59.
- Para cada fonte, chame o conector e faça upsert em eventos (onConflict: fonte,id_externo) usando o service role, em lotes de 500.
- Cada fonte é processada de forma independente: erro em uma não interrompe as outras. Registre o resultado em ingestao_log (status ok/erro, qtd, erro resumido).
- Proteja a função: só aceita chamada com um segredo CRON_KEY ou do admin.
Agende com pg_cron + pg_net, todos os dias às 02:00 America/Sao_Paulo. Adicione também a opção de reprocessar um intervalo de datas manualmente (admin).
```

### Prompt 12: Tela de Admin

```
Crie a página /admin (somente role admin):
1. Usuários: listar, criar (e-mail, nome, senha temporária, role), desativar e redefinir senha, usando uma Edge Function "admin-usuarios" com service role e verificação de que o chamador é admin.
2. Permissões: para cada usuário, checkboxes das fontes (acronis_br01, acronis_br02, zabbix, zoho_desk, ms_graph) gravando em user_fontes.
3. Saúde das fontes: tabela com o último ingestao_log por fonte e botão "Reprocessar dia".
4. Auditoria: tabela filtrável de consultas (usuário, fontes, período, modo, quando).
Exiba um aviso lembrando que os segredos das fontes são configurados no painel do Supabase, não aqui.
```

### Prompt 13: Endurecimento e revisão

```
Faça uma revisão de segurança do projeto:
- Confirme que RLS está habilitado em todas as tabelas e que não existe política permissiva para anon.
- Confirme que nenhuma chave de service role ou segredo aparece em código do front.
- Exija senha com mínimo de 12 caracteres e ative proteção contra senhas vazadas. Desative confirmação de e-mail aberta e signups.
- Limite de tentativas de login e, se possível, ative MFA (TOTP) para admins.
- Configure CORS das Edge Functions apenas para o domínio do app.
- Garanta que erros devolvidos ao front não contenham detalhes internos.
- Liste testes manuais para validar o isolamento entre dois usuários com fontes diferentes.
```

## 6. Instruções para outro agente replicar o app

1. Leia as seções 1 a 4 para entender o contexto, os princípios e o modelo de dados.
2. Crie um projeto no Lovable conectado a um projeto Supabase novo.
3. Cole os prompts 1 a 13 em ordem, um por vez. Após cada um:
   - Rode o app e confirme o comportamento descrito.
   - Nas etapas com banco (2, 11, 13), verifique o RLS com dois usuários de permissões diferentes.
4. O usuário (humano) deve preencher os **Secrets** da seção 4 no painel do Supabase. O agente nunca deve pedir ou registrar valores de credenciais.
5. Teste os conectores um por vez com um intervalo curto (1 dia). Valide o mapeamento para o modelo comum antes de ativar a ingestão (prompt 11).
6. Critérios de aceite:
   - Login funciona e não existe cadastro público.
   - Um usuário só vê as fontes liberadas a ele, no front e no banco (RLS).
   - Consulta com período "Hoje" usa tempo real. Períodos anteriores usam D-1, e o modo Auto combina os dois.
   - Se uma fonte cair, o resto retorna e a tela mostra "Resultado parcial".
   - O painel exibe KPIs, gráficos por dia/severidade/fonte/cliente, tendência e status das fontes.
   - A ingestão roda às 02:00 e registra o resultado em `ingestao_log`.
   - Nenhum segredo aparece no repositório ou no front.
7. **Alternativa (Opção 1):** se for necessário mais controle, substitua as Edge Functions por uma API FastAPI (rotas `/auth/*`, `/fontes`, `/eventos`, `/resumo`), com conectores Python, Postgres, Redis (cache de 1 a 5 min) e Caddy (HTTPS). O Lovable passa a chamar `VITE_API_URL` com JWT em memória e refresh em cookie HttpOnly. O contrato de `/eventos` é o mesmo de `consultar`.

## 7. Riscos conhecidos

- **RLS mal configurado** expõe dados de todos os clientes. Sempre teste.
- **Limites das APIs** (Zoho, Graph): cache e D-1 reduzem o problema.
- **Limite de tempo das Edge Functions:** pagine a ingestão e divida por fonte.
- **Retenção curta no Graph:** a ingestão diária preserva o histórico.
- **Usuário e senha próprios:** use senhas longas, bloqueio por tentativas e MFA para admins. Prefira SSO quando possível.
- **Dados sensíveis de clientes:** mantenha auditoria e restrinja o acesso ao painel do Supabase.
