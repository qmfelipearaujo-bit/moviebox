# MovieBox Private v1.2

Aplicativo pessoal de filmes e séries com duas formas de instalação:

- **Android:** APK via GitHub Actions.
- **iPhone:** PWA/Web App via GitHub Pages, sem App Store e sem Mac.

## Principais recursos

- Catálogo e pesquisa via TMDB.
- Player incorporado com proteção contra pop-ups/redirecionamentos.
- Filmes e séries, temporadas e episódios.
- Favoritos e histórico locais.
- Internet Archive, Open Movies e Meus Links.
- Busca automática de capa/metadados no TMDB para links cadastrados.
- Downloads nativos no Android.
- Encaminhamento de downloads diretos para Safari/Arquivos no iPhone.
- Manifesto PWA, ícone e modo standalone no iOS.
- Service Worker para cache do shell/interface.

## Token TMDB

O token não precisa ficar no GitHub. Na primeira execução, o MovieBox pede o
**API Read Access Token** e o salva no armazenamento local do dispositivo.

## Android

Use o workflow:

`Actions → Gerar APK Android → Run workflow`

O APK será disponibilizado em Artifacts.

## iPhone (GitHub Pages)

Leia `IPHONE_PWA.txt`.

Resumo:

1. Em `Settings → Pages`, selecione **GitHub Actions** como Source.
2. Execute `Actions → Publicar MovieBox para iPhone → Run workflow`.
3. Abra a URL publicada no Safari do iPhone.
4. `Compartilhar → Adicionar à Tela de Início → Abrir como App da Web`.

### GitHub Free

GitHub Pages é gratuito para repositórios públicos em contas GitHub Free. Como
o token TMDB é cadastrado no aparelho, ele não precisa ser publicado junto com
o código.

## Observação sobre offline no iPhone

O PWA consegue manter a interface em cache, mas arquivos grandes não usam o
mesmo armazenamento nativo do APK. Ao baixar um vídeo direto no iPhone, o Safari
é usado para salvar o arquivo em Downloads/Arquivos.
