# MovieBox Private v1.1

Aplicativo Android privado de catálogo e reprodução, com TMDB para metadados, player incorporado, biblioteca offline e laboratório de links.

## v1.1 — Auto preencher mídia por URL

Na aba **Offline → Meus Links**, cole uma URL de vídeo, `.torrent` ou magnet. O MovieBox tenta:

1. extrair um título do nome do arquivo/link;
2. reconhecer ano e, em séries, temporada/episódio;
3. pesquisar o título no TMDB;
4. preencher título, poster, ano, tipo e sinopse;
5. mostrar outras correspondências quando houver dúvida.

Exemplos que o analisador reconhece bem:

- `The.Matrix.1999.1080p.mp4`
- `Breaking.Bad.S01E01.720p.webm`
- magnet com parâmetro `dn=` contendo o nome da mídia.

Se a URL for genérica, como `video123.mp4`, basta digitar o título correto no campo de pesquisa TMDB.

## Gerar APK no GitHub

Use o workflow já incluído em `.github/workflows/build-apk.yml`:

**Actions → Gerar APK Android → Run workflow**

Depois de `Success`, baixe o artifact **MovieBox-Private-APK**.
