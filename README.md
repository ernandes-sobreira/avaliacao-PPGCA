# Avaliação de disciplinas do PPGCA · UNEMAT

Sistema independente para mestrado e doutorado em Ciências Ambientais.

**Site:** https://ernandes-sobreira.github.io/avaliacao-PPGCA/

- Interface hospedada no GitHub Pages; autenticação Google e dados no Firebase `avaliacao-ppgca`.
- Firestore Standard criado em `southamerica-east1` (São Paulo), no plano Spark; regras de acesso publicadas.
- Administrador: `ernandes@unemat.br`.
- Em **Administração e resultados**, importe os alunos pelo botão da turma. Baixe o modelo CSV, preencha nome/e-mail, envie e confira a prévia antes de confirmar. A lista restringe a avaliação aos e-mails cadastrados; não cria contas nem envia mensagens.
- Uma resposta por conta/turma. Listas de alunos e resultados têm permissões separadas. Nenhum dado de aluno é salvo no GitHub.
- A primeira entrada do administrador carrega as 12 ofertas preservadas do sistema anterior se o banco estiver vazio. Não havia respostas, alunos ou ações cadastrados na origem em 12/11/2026.

## Validação

A interface publicada, a navegação, o fluxo de abertura do login Google e a configuração do projeto foram conferidos. As regras de acesso passaram nos testes do emulador Firestore. O login real com a conta institucional e um envio completo nessa conta ainda precisam ser validados; a sessão disponível no navegador contém somente a conta Gmail.

## Desenvolvimento

```sh
npm install
npm run build:github
npm run test:firebase
```

O build gera `web/`. Os arquivos estáticos gerados também estão na raiz, usada pela configuração do GitHub Pages. Consulte [README-FIREBASE.md](README-FIREBASE.md) para a arquitetura e os limites da importação do catálogo SIGAA.
