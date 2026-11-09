# Avaliação de disciplinas do PPGCA · UNEMAT

Aplicação para o mestrado e doutorado em Ciências Ambientais. O catálogo público vem da matriz curricular oficial. O voto exige uma conta verificada do Google Workspace da UNEMAT e código individual da turma. A consulta delegada usa autenticação institucional e código temporário.

## Implantação

A aplicação utiliza Cloudflare Worker e D1. A hospedagem atual usa o Site existente. GitHub armazena o código e as marcas institucionais. As respostas ficam no banco do servidor.

1. No Google Cloud da UNEMAT, configure um aplicativo interno do Google Workspace, crie um cliente OAuth do tipo **Aplicativo da Web** e registre a URI de redirecionamento:
   `https://avaliacao-disciplinas-ppgca-unemat.ernandes-sobreira.chatgpt.site/auth/google/callback`
2. Configure as variáveis de produção no servidor. Nunca publique as credenciais no repositório.

   | Variável | Valor |
   | --- | --- |
   | `APP_ORIGIN` | Origem HTTPS do Site, sem barra final |
   | `GOOGLE_CLIENT_ID` | ID do cliente OAuth |
   | `GOOGLE_CLIENT_SECRET` | Segredo do cliente OAuth |
   | `SESSION_SECRET` | Segredo aleatório de pelo menos 32 caracteres, usado para assinar sessões |
   | `VOTER_SECRET` | Segredo aleatório estável de pelo menos 32 caracteres, usado para impedir votos duplicados |
   | `ADMIN_EMAILS` | Endereços institucionais de gestão, separados por vírgula |

3. Valide com a UNEMAT a base legal, o prazo de retenção, os operadores e o descarte. Só após a validação, configure `PRIVACY_APPROVED=1` para abrir a coleta.
4. Cadastre as ofertas reais, com docentes e quantidade de elegíveis por turma. Distribua os códigos individuais.

O cliente OAuth solicita apenas `openid email`. O servidor usa código de autorização com PKCE e valida o domínio hospedado, o e-mail verificado e a sessão. A chave do voto é específica da turma. Preserve `VOTER_SECRET` entre implantações, pois sua substituição invalida a deduplicação dos votos existentes.

## Build

```sh
npm run build
npm run validate
```

A hospedagem aplica os SQL em `drizzle/` ao banco D1 vinculado. O build produz `dist/server/index.js`.
