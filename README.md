# Avaliação de disciplinas do PPGCA · UNEMAT

Aplicação para o mestrado e doutorado em Ciências Ambientais. O catálogo público vem da matriz curricular oficial. O voto exige uma conta Google verificada. Contas @unemat.br respondem por link, e contas externas precisam do convite da turma. O painel e os resultados exigem uma conta da comissão ou da coordenação autorizada em `ADMIN_EMAILS`.

## Implantação

A aplicação utiliza Cloudflare Worker e D1. A hospedagem atual usa o Site existente. GitHub armazena o código e as marcas institucionais. As respostas ficam no banco do servidor.

1. No projeto Firebase `avaliacao-ppgca`, habilite o provedor Google em Authentication e mantenha o domínio público do sistema na lista de domínios autorizados. A configuração pública do app web está em `worker/auth.js`.
2. Configure `SESSION_SECRET` e `VOTER_SECRET` com valores aleatórios de pelo menos 32 caracteres e `ADMIN_EMAILS` com os e-mails institucionais de gestão. Preserve `VOTER_SECRET` entre implantações para manter a deduplicação.
3. Valide com a UNEMAT a base legal, o prazo de retenção, os operadores e o descarte. O respondente confirma a leitura do aviso antes de acessar o questionário. O envio registra a versão do aviso.
4. Importe as ofertas pelo semestre no painel, revise e abra em lote ou individualmente. Compartilhe o link da turma e gere um convite para discentes externos. Informe o total oficial de elegíveis quando disponível.

O servidor confirma o token com o Firebase e verifica o projeto, o provedor Google e o e-mail verificado. As respostas ficam no banco D1.

## Build

```sh
npm run build
npm run validate
```

A hospedagem aplica os SQL em `drizzle/` ao banco D1 vinculado. O build produz `dist/server/index.js`.
