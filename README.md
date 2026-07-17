# Anotador de Densidade

Ferramenta local para anotar densidade em imagens: você preenche **unidades** e **área**, a
**densidade** é calculada sozinha e gravada na própria imagem como uma legenda preta no canto
inferior direito, com a memória de cálculo.

É um único arquivo `index.html`, sem dependências e sem build.

## Privacidade

Roda **inteiramente no seu navegador**. Nenhuma imagem é enviada para qualquer servidor —
os arquivos são lidos e regravados direto no seu computador.

## O que acontece com o arquivo ao salvar

A **resolução e o formato são sempre preservados** (PNG continua PNG, JPEG continua JPEG).

- **PNG:** gravação sem perda — os pixels saem idênticos, exceto onde a legenda é desenhada.
- **JPEG:** a imagem é recomprimida com qualidade 0,95, porque não há como escrever a legenda
  sem reescrever o arquivo. A perda é imperceptível (diferença média medida: 0,5 em 255 por canal).
  A legenda é sempre desenhada a partir do original em memória, então salvar a mesma imagem
  várias vezes na mesma sessão **não acumula perdas**.

Os **metadados do original são transplantados** para o arquivo novo: EXIF, ICC, XMP, IPTC e
comentários no JPEG; `pHYs` (escala física/DPI), `tEXt`, `iCCP` e afins no PNG.

Uma exceção proposital: a tag EXIF de **orientação** é normalizada para `1`. O navegador já aplica
a rotação aos pixels ao decodificar, então manter a tag original faria o visualizador girar a
imagem uma segunda vez. Imagens WebP são gravadas sem metadados.

## Requisitos

**Chrome ou Edge**, por causa da [File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_Access_API),
que é o que permite sobrescrever os arquivos originais no disco.

No Firefox e no Safari a ferramenta ainda abre e calcula, mas o botão Salvar **baixa uma cópia**
em vez de sobrescrever o original.

## Como usar

1. **Selecionar pasta** (ou arraste uma pasta para a janela) — a permissão de gravação é pedida
   **uma única vez** e cobre todos os arquivos dela. Também dá para escolher/arrastar imagens avulsas,
   mas aí o navegador pede permissão uma vez por arquivo ao salvar.
2. Clique numa miniatura para abri-la.
3. Preencha **unidades** (o foco já está lá) → **Tab** → **área** (aceita `,` ou `.`).
   A densidade (`unidades ÷ área`) é calculada na hora e aparece como uma legenda sobre a imagem.
4. **Arraste a legenda** até o ponto que ela deve marcar. Isso a fixa ali e **zera os campos**,
   liberando a próxima: preencha de novo para criar outra legenda, quantas quiser na mesma imagem.
5. **Salvar e voltar** grava todas as legendas na imagem e volta para a lista.
   **Cancelar** volta sem gravar nada.

O botão **Legenda** define em que canto uma legenda nova nasce — útil quando o canto padrão cobre
algo importante. A última escolha vira o padrão da próxima.

### Imagem de referência (opcional)

Se você tem uma imagem com informações que precisa consultar o tempo todo, use
**Escolher imagem de referência** (ou o botão direito numa miniatura). Ela passa a ocupar a metade
esquerda da tela, fixa. Sem isso, as miniaturas e a anotação ocupam a tela inteira.

Na imagem de referência, clique para marcar com uma bolinha os pontos já trabalhados (clique na
bolinha para removê-la). Essas marcações são só visuais e não são gravadas em nada.

### Desfazer legendas

Como o programa mantém a imagem original em memória, uma imagem gravada **nesta sessão** pode ser
restaurada: use **Desfazer legendas** no visualizador, ou o botão direito na miniatura →
**Desfazer legenda**. O arquivo original é regravado byte a byte, então os metadados voltam intactos.

Isso só vale para o que foi salvo com o programa aberto. Se você fechar e reabrir, o arquivo já
gravado passa a ser o "original" e não há mais o que desfazer — a opção aparece desabilitada.
