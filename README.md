# MovieBox Private v1.0

Aplicativo Android/PWA pessoal para estudo de catálogo, streaming incorporado e reprodução/download offline a partir das fontes escolhidas pelo proprietário do app.

## Recursos

- TMDB para catálogo, pesquisa, capas, sinopses, filmes e séries.
- Player EmbedMovies com sandbox anti-pop-up/redirecionamento.
- Favoritos e histórico local.
- Downloads offline nativos com Capacitor File Transfer + Filesystem.
- Catálogo curado de Blender Open Movies via Wikimedia Commons.
- Pesquisa dinâmica de vídeos no Internet Archive.
- Detecção automática de MP4/WebM e, quando disponível, do arquivo `.torrent` do item no Internet Archive.
- Aba **Meus Links** para testar URL direta de mídia, `.torrent` ou magnet link informado pelo proprietário do app.
- O campo de direitos/licença é informativo e opcional; ele não bloqueia o botão de download.
- Para magnet/torrent, o MovieBox encaminha o link ao cliente torrent instalado; não há engine BitTorrent embutida.

## Token TMDB

Na primeira abertura do app, cole o `API Read Access Token` do TMDB. O token fica salvo localmente no aparelho.

## Gerar APK no GitHub Actions

O workflow `.github/workflows/build-apk.yml` já está incluído.

1. Envie o conteúdo deste projeto ao repositório GitHub.
2. Abra **Actions > Gerar APK Android**.
3. Clique **Run workflow**.
4. Ao finalizar com sucesso, baixe **Artifacts > MovieBox-Private-APK**.

O identificador Android permanece `com.moviebox.personal`.

## Fontes e direitos

O MovieBox v1.0 não decide se uma URL, magnet, torrent ou item remoto pode ser utilizado. Quando a fonte disponibiliza metadados de direitos/licença, o aplicativo os mostra apenas como informação. O app não inclui listas de fontes não autorizadas e não tenta contornar DRM ou proteções de acesso.
