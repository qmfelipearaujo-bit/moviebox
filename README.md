# MovieBox Private v0.9

Aplicativo Android/PWA pessoal para estudo de catálogo, streaming incorporado e downloads offline de fontes autorizadas.

## Recursos

- TMDB para catálogo, pesquisa, capas, sinopses, filmes e séries.
- Player EmbedMovies com sandbox anti-pop-up/redirecionamento.
- Favoritos e histórico local.
- Downloads offline nativos com Capacitor File Transfer + Filesystem.
- Catálogo curado de Blender Open Movies via Wikimedia Commons.
- Pesquisa dinâmica no Internet Archive (Open Source Movies), filtrando itens com licença aberta/domínio público explícita nos metadados.
- Detecção automática de MP4/WebM e, quando disponível, do arquivo `.torrent` oficial do item no Internet Archive.
- Aba **Meus Links** para testar URL direta de mídia, `.torrent` ou magnet link que você tenha autorização para usar.
- Para magnet/torrent, o MovieBox encaminha o link ao cliente torrent instalado; não há engine BitTorrent embutida.

## Token TMDB

Na primeira abertura do app, cole o `API Read Access Token` do TMDB. O token fica salvo localmente no aparelho.

## Gerar APK no GitHub Actions

O workflow `.github/workflows/build-apk.yml` já está incluído.

1. Envie o conteúdo deste projeto ao repositório GitHub.
2. Abra **Actions > Gerar APK Android**.
3. Clique **Run workflow**.
4. Ao finalizar com sucesso, baixe **Artifacts > MovieBox-Private-APK**.

O APK gerado usa o identificador Android `com.moviebox.personal`, permitindo atualização por cima das versões anteriores assinadas pelo mesmo workflow/debug key de cada build local do runner. Em alguns aparelhos, APKs debug gerados em runners diferentes podem exigir desinstalar a versão anterior por causa da assinatura de debug.

## Uso responsável

A busca automática do Internet Archive só habilita download quando encontra metadados de licença aberta/domínio público suficientemente claros. A aba **Meus Links** não valida direitos externos: use somente URLs/magnets que você tenha autorização para baixar.
