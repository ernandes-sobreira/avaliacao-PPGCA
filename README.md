# Avaliação de disciplinas do PPGCA · UNEMAT

Aplicação para o mestrado e doutorado em Ciências Ambientais. O catálogo público vem da matriz curricular oficial. O voto exige uma conta Google verificada. Contas @unemat.br respondem por link, e contas externas precisam do convite da turma. O painel e os resultados exigem uma conta da comissão ou da coordenação autorizada em `ADMIN_EMAILS`.

## Acesso e administração

- Entrada pelo GitHub: https://ernandes-sobreira.github.io/avaliacao-PPGCA/ (encaminha para o servidor atual; não é uma migração do banco).
- Sistema: https://avaliacao-disciplinas-ppgca-unemat.ernandes-sobreira.chatgpt.site/
- Administrador responsável: `ernandes@unemat.br`. Outros gestores continuam definidos em `ADMIN_EMAILS`.
- Entre em **Administração e resultados**, confira as turmas e clique em **Abrir avaliação**. Compartilhe o link da turma com os alunos. Encerre a coleta ao terminar o prazo.
- O acesso institucional exige Google verificado. Contas externas precisam do convite da turma. O sistema limita uma resposta por conta/turma; não verifica matrícula automaticamente.

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

## Importação de alunos

Em Administração e resultados, clique em **Importar alunos** na turma escolhida. Baixe o modelo, preencha `nome` e `email` e salve como CSV UTF-8. As colunas opcionais `semestre` e `turma`, quando preenchidas, devem coincidir com a oferta selecionada. O leitor aceita vírgula ou ponto e vírgula, aspas e até 500 linhas/100 KB.

A prévia mostra erros e duplicados antes da confirmação. A operação adiciona/atualiza a lista da turma de modo atômico, calcula o total de elegíveis e restringe a avaliação aos e-mails cadastrados (inclusive contas Google externas). Não envia e-mails nem cria contas. Uma conta continua podendo responder apenas uma vez por turma. Turmas sem lista mantêm o comportamento anterior até o administrador confirmar a importação. Dados dos alunos ficam no banco privado, nunca no repositório GitHub.

## Situação da migração externa

O GitHub Pages ainda é uma entrada que encaminha ao servidor atual. A migração integral para GitHub Pages + Firebase ainda não foi executada e depende da conexão administrativa ao projeto Firebase. Não trocar a página por uma interface sem backend configurado.
