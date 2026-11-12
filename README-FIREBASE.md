# Versão independente: GitHub Pages + Firebase

Publicada na branch `main`. Não depende do servidor ChatGPT Sites.

## O que já está pronto

- Interface completa no GitHub Pages, sem redirecionamento para ChatGPT Sites.
- Login Google no projeto Firebase `avaliacao-ppgca`, com sessão da aba.
- Firestore: ofertas, listas privadas de alunos, convites, avaliações e acompanhamento.
- Administrador institucional: `ernandes@unemat.br`.
- Uma resposta por UID/turma, sem e-mail ou nome no documento da avaliação. Listas de alunos e resultados não podem ser consultados por outros alunos.
- Importação CSV com prévia, validação, deduplicação e até 400 alunos por arquivo. A confirmação exige que apenas os e-mails da lista possam avaliar a turma.
- Preservação das 12 ofertas existentes, incluindo a oferta aberta. Como o banco de origem não tinha respostas, alunos ou ações em 12/11/2026, não há avaliações para converter. A primeira entrada do administrador importa o catálogo inicial se o banco estiver vazio, sem sobrescrever documentos existentes.
- Testes de regras com emulador Firestore: administrador, aluno elegível, aluno fora da lista, convites, turma fechada, dados inválidos, consulta a dados privados e voto duplicado.

## Configuração em 12/11/2026

- Firestore Standard criado em São Paulo (`southamerica-east1`) após autorização explícita do proprietário.
- Regras publicadas no projeto real, mantendo as listas e as respostas protegidas.
- Provedor Google ativado e domínio `ernandes-sobreira.github.io` autorizado.
- Branch de migração incorporada à `main`; GitHub Pages serve a interface completa.
- Validação real pendente: login institucional e envio completo. A sessão de navegador disponível tem apenas a conta Gmail, sem sessão institucional. Testes de permissões no emulador passaram.

## Construção e testes

```sh
npm install
npm run build:github
npm run test:firebase
```

O build produz `web/`. Para publicar pela configuração legada do GitHub Pages na raiz, os arquivos gerados `index.html`, `app.js`, `firebase-backend.js`, `metrics.js`, `data/` e as marcas de `assets/` devem estar na raiz. As alterações da branch já incluem esses arquivos.

## Catálogo do SIGAA

O navegador não consulta diretamente o formulário JSF do SIGAA. O botão **Carregar catálogo do SIGAA** lê `data/sigaa-2026.2.json`, capturado em 12/11/2026 da consulta pública. A captura não contém alunos. Para outro semestre, é necessário fornecer um novo catálogo público ou cadastrar as turmas manualmente. A interface não deve apresentar esse arquivo como consulta ao vivo.

Nenhuma senha, lista real de alunos ou credencial administrativa deve ser salva no repositório. A configuração pública do Firebase é identificadora do app; a proteção dos dados depende das regras publicadas.
