# Painel de Segurança (Acronis · Zoho Desk · Zabbix · Microsoft Graph)

Projeto de um painel unificado de indicadores de segurança com login (usuário/senha + MFA), filtros de período e fonte, e dados em tempo real ou D-1.

**Demo (dados fictícios):** https://HackBR-GHCP-24.github.io/security-dashboard/

## Conteúdo
- `index.html`: demo interativa em arquivo único (login, MFA, expiração de sessão e 3 dashboards).
  - **Acronis:** Cyber Fit Score (gauge, evolução e categorias), incidentes por severidade/tipo/dispositivo/tempo, sucesso de backup, filtro BR01/BR02.
  - **Zoho Desk:** chamados abertos, média de dias em aberto, envelhecimento, comparativo entre meses, criados × fechados, top clientes.
  - **Zabbix:** média e total de downtime, disponibilidade, dispositivos com mais incidentes e maior downtime, mapa de calor.
  - Filtros: Hoje, 7/30 dias, mês atual, mês anterior e personalizado.
- `docs/PLANO_LOVABLE_SECURITY_DASHBOARD.md`: contexto, arquitetura e 13 prompts para construir o app real (Lovable + Supabase).
- `acronis_query.py`: exemplo de consulta de alertas aos datacenters br01 e br02.

## Demo: credenciais
`admin@demo.com` (vê tudo) ou `analista@demo.com` (sem Zoho) · senha `SenhaForte#2026` · MFA `123456`.
Todos os dados são gerados aleatoriamente no navegador. Nenhuma credencial real deve ser colocada neste repositório.
