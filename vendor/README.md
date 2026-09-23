# Conversor HEIC distribuído com o aplicativo

- Arquivo: `heic-to-1.5.2.js`, sem alterações.
- Origem: https://cdn.jsdelivr.net/npm/heic-to@1.5.2/dist/iife/heic-to.js
- Projeto e código-fonte: https://github.com/hoppergee/heic-to
- Fonte da versão: https://registry.npmjs.org/heic-to/-/heic-to-1.5.2.tgz
- Licença: LGPL-3.0-or-later; consulte `heic-to-LICENSE` e `GPL-3.0.txt`.
- Inclui libheif 1.22.2 (LGPL-3.0): fontes e instruções de compilação em
  https://github.com/strukturag/libheif/tree/v1.22.2
- Decodificador libde265 1.0.16 (LGPL-3.0): fontes em
  https://github.com/strukturag/libde265/tree/v1.0.16
- Instruções para reconstruir a biblioteca JavaScript:
  https://github.com/hoppergee/heic-to#how-to-build-libheifjs-from-libheif-on-mac

A biblioteca é carregada como um arquivo separado. Pode ser substituída por uma
versão modificada compatível com a interface `HeicTo({blob, type})`.
Nenhum arquivo de imagem é enviado ao projeto heic-to ou a um CDN durante o uso.
