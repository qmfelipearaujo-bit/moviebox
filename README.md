# MovieBox Private v1.4

Aplicativo pessoal de catálogo e reprodução, com Android via Capacitor e versão PWA para iPhone.

## v1.4

- catálogo inicial ampliado e separado por gêneros;
- player com botão Início e modo imersivo Android;
- downloads Android gerenciados pelo DownloadManager, com cancelamento e indicador de velocidade;
- aba Ao vivo com TV e rádios;
- rádios do Brasil, Estados Unidos e Moçambique via Radio Browser;
- cadastro de canais próprios;
- conta opcional com Supabase para sincronizar favoritos e histórico;
- mantém PWA para iPhone e proteção do player.

## Login em nuvem

Leia `SUPABASE_LOGIN.txt`. O login é opcional: sem Supabase, o MovieBox continua funcionando com favoritos e histórico locais.

## Build Android

Use GitHub Actions → **Gerar APK Android**. O workflow v1.4 instala automaticamente o plugin nativo usado para modo imersivo e cancelamento de downloads.

## iPhone

Use GitHub Actions → **Publicar MovieBox para iPhone** e adicione a página à Tela de Início pelo Safari.
