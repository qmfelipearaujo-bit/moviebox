# MovieBox Private v0.7

Aplicativo Android privado em React + Capacitor.

## Novidade v0.7 — filmes para baixar e assistir offline

A área **Offline** agora contém uma seleção curada de Blender Open Movies hospedados no Wikimedia Commons e publicados com licenças Creative Commons que permitem compartilhamento/download com atribuição.

Incluídos inicialmente:
- Big Buck Bunny
- Sintel
- Tears of Steel
- Spring
- Sprite Fright

O app consulta o Wikimedia Commons em tempo real para obter thumbnail, licença e transcodes de vídeo disponíveis (preferencialmente 360p/480p/720p/1080p). No APK Android, o download é feito pelo plugin nativo `@capacitor/file-transfer` para o armazenamento privado do aplicativo e pode ser reproduzido sem internet.

**O download offline não extrai conteúdo do EmbedMovies.** O EmbedMovies continua separado e serve somente para streaming online.

## TMDB

O token TMDB pode ser informado dentro do próprio aplicativo na primeira abertura. Não é necessário publicar seu token no GitHub.

## Gerar APK no GitHub Actions

1. Envie o conteúdo desta pasta para o repositório GitHub.
2. Confirme que existe `.github/workflows/build-apk.yml`.
3. Vá em **Actions → Gerar APK Android → Run workflow**.
4. Após `Success`, abra o resumo da execução e baixe o artifact **MovieBox-Private-APK**.
5. Extraia o ZIP e instale `MovieBox-Private-debug.apk` no Android.

## Armazenamento offline

Os filmes baixados ficam em `Directory.Data`, área privada do aplicativo. Excluir o aplicativo pode remover esses arquivos. A opção **Excluir** na aba Meus downloads apaga o vídeo e seu registro local.

## Licenças

A tela Offline mostra a licença e a atribuição de cada obra e inclui um botão **Fonte e licença** para abrir a página correspondente do Wikimedia Commons. O catálogo é propositalmente curado; ele não transforma todo o Wikimedia Commons em uma biblioteca indiscriminada de downloads.
