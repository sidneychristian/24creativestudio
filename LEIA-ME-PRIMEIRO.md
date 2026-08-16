# 24 Creative Studio — instalação completa

Este pacote contém o website real da 24 Creative Studio, preparado para GitHub, Vercel e Supabase.

## Configuração já feita nesta versão

- Projeto Supabase ligado em `js/config.js`.
- Email administrativo preparado: `sidneychristian03@gmail.com`.
- A senha não está gravada no projeto. Crie o utilizador no Supabase com a senha combinada e não publique essa senha no GitHub.

## O que está incluído

- Home editorial e responsiva.
- Shop com pesquisa, ordenação e filtros por categoria, cor, tamanho e disponibilidade.
- Página individual para cada peça.
- Variações com stock independente por produto + cor + tamanho.
- Carrinho guardado no telemóvel/computador do cliente.
- Pedido registado no Supabase antes de abrir o WhatsApp.
- Checkout no WhatsApp `+258 87 677 8476`.
- Prazo de entrega configurável, inicialmente até 2 dias.
- Lookbook alimentado pelas fotografias reais dos produtos.
- Página About baseada apenas nas informações oficiais fornecidas.
- Painel administrativo seguro com email e senha.
- Gestão de produtos, imagens, categorias, coleções, cores, tamanhos, stock, pedidos e conteúdo do site.
- Redução automática do stock quando o administrador confirma um pedido.
- Reposição automática do stock quando um pedido confirmado é cancelado.
- SEO, Open Graph, dados estruturados de produto, robots e sitemap.

## Importante antes de começar

O novo projeto Supabase exclusivo da 24 Creative Studio já foi criado e ligado ao website. Não altere o projeto para a base da Belmiro Fragrâncias, porque os produtos e pedidos ficariam misturados.

## Passo 1 — Abrir o projeto Supabase

1. Entre em `https://supabase.com`.
2. Abra o projeto cuja referência é `yhmqgktichxavkmclfoz`.
3. Confirme que o painel do projeto abre normalmente.

## Passo 2 — Criar as tabelas e a segurança

1. No Supabase, abra **SQL Editor**.
2. Clique em **New query**.
3. Abra `supabase/schema.sql` deste projeto.
4. Copie todo o conteúdo.
5. Cole no SQL Editor.
6. Clique em **Run**.

O código cria todas as tabelas, o armazenamento de imagens, as políticas RLS e o controlo de stock.

## Passo 3 — Criar o administrador

1. No Supabase, abra **Authentication → Users**.
2. Clique em **Add user → Create new user**.
3. Introduza o email `sidneychristian03@gmail.com` e a senha combinada para o proprietário.
4. Ative **Auto Confirm User**.
5. Crie o utilizador.
6. Abra `supabase/criar-admin.sql`.
7. O email já está preenchido neste ficheiro.
8. Execute o código no SQL Editor.

## Passo 4 — Ligar o site ao Supabase

Esta versão já está ligada ao projeto Supabase fornecido. Não precisa alterar `js/config.js`.

Se um dia mudar de projeto, abra **Project Settings → API**, copie a **Project URL** e a **Publishable key** e substitua os dois valores:

```js
window.STUDIO24_CONFIG = {
  supabaseUrl: "https://SEU-PROJETO.supabase.co",
  supabasePublishableKey: "SUA_CHAVE_PUBLICA"
};
```

Nunca coloque uma `service_role key` ou `secret key` no site.

## Passo 5 — Enviar para o GitHub

1. Crie um repositório chamado `24-creative-studio`.
2. Pode escolher **Private**.
3. Abra a pasta `24-creative-studio` no seu computador.
4. Selecione tudo que está dentro da pasta.
5. No GitHub, clique em **Add file → Upload files**.
6. Arraste os ficheiros e pastas.
7. Faça o commit para a branch `main`.

O `index.html` deve aparecer diretamente na página inicial do repositório.

## Passo 6 — Publicar na Vercel

1. Entre na Vercel com a conta GitHub.
2. Clique em **Add New → Project**.
3. Importe o repositório `24-creative-studio`.
4. Em **Framework Preset**, escolha **Other**.
5. Deixe Build Command, Output Directory e Install Command vazios.
6. Clique em **Deploy**.

## Passo 7 — Utilizar o painel

Abra:

`https://SEU-DOMINIO.vercel.app/admin/login`

Também existe um acesso discreto no último **24** do rodapé do website.

Entre com o email e a senha criados no Supabase. No painel, siga esta ordem:

1. Confirme categorias, cores e tamanhos em **Catálogo**.
2. Adicione a peça em **Produtos**.
3. Carregue as fotografias.
4. Abra **Stock**, selecione a peça e preencha cada combinação de cor e tamanho.
5. Marque a peça como visível, destaque ou novo drop.

No separador **Website**, também pode alterar os textos, WhatsApp, prazo/valor de entrega e carregar o logótipo oficial ou uma nova imagem principal. Use PNG, JPG, WEBP ou AVIF com até 8 MB.

## Fotografias e logo

As roupas reais devem ser adicionadas pelo painel. Os cartões atuais são claramente marcados como demonstração e desaparecem quando existir pelo menos um produto real ativo.

O ficheiro `assets/logo-reference.png` contém a captura de tela fornecida. Como a imagem é pequena e desfocada, o website utiliza uma versão tipográfica limpa da marca. Quando receber a logo original em PNG, PDF ou SVG, ela poderá substituir a referência.

## Atualizações futuras

Depois de ligar GitHub e Vercel, cada commit enviado à branch principal cria automaticamente uma nova publicação.
