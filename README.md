# Anotador de Densidade

Ferramenta local para anotar densidade em imagens: você preenche **unidades** e **área**, a
**densidade** é calculada sozinha e gravada em uma cópia da imagem como uma legenda preta no canto
inferior direito, com a memória de cálculo.

É um único arquivo `index.html`, sem dependências e sem build.

## Privacidade

Roda **inteiramente no seu navegador**. Nenhuma imagem é enviada para qualquer servidor —
os arquivos são lidos e as cópias são salvas direto no seu computador.

## O que acontece com o arquivo ao salvar

A imagem original permanece **intacta**. A versão anotada recebe o prefixo **`audit_`**:
`foto.jpg` vira `audit_foto.jpg`. Ao selecionar ou arrastar uma pasta, a cópia é salva nela.
Se esse nome já existir, é usado `audit_foto_1.jpg`, `audit_foto_2.jpg` etc.
Antes de gravar, o aplicativo verifica que o destino tem prefixo `audit_` e não é
nenhuma das imagens originais carregadas. A miniatura salva mostra o nome da cópia.
A versão e a data/hora da publicação aparecem na página inicial.

Novos salvamentos da mesma imagem na mesma sessão atualizam apenas a cópia criada.
Imagens avulsas geram um download com o prefixo `audit_`.

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
que permite salvar as cópias diretamente na pasta selecionada.

No Firefox e no Safari a ferramenta ainda abre e calcula, mas o botão Salvar **baixa uma cópia**
com o prefixo `audit_`.

## Como usar

1. **Selecionar pasta** (ou arraste uma pasta para a janela) — a permissão de gravação é pedida
   **uma única vez** e cobre todos os arquivos dela. Também dá para escolher/arrastar imagens avulsas,
   mas nesse caso a cópia é baixada ao salvar.
2. Clique numa miniatura para abri-la.
3. Preencha **unidades** (o foco já está lá) → **Tab** → **área** (aceita `,` ou `.`).
   A densidade (`unidades ÷ área`) é calculada na hora e aparece como uma legenda sobre a imagem.
4. **Arraste a legenda** até o ponto que ela deve marcar. Isso a fixa ali e **zera os campos**,
   liberando a próxima: preencha de novo para criar outra legenda, quantas quiser na mesma imagem.
5. **Salvar cópia e voltar** grava todas as legendas na cópia `audit_` e volta para a lista.
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

Use **Desfazer legendas** no visualizador, ou o botão direito na miniatura →
**Desfazer legenda**, para restaurar os bytes originais na **cópia `audit_`** salva nesta sessão.
Para imagens avulsas, é baixada uma nova cópia `audit_` sem legendas.
A imagem original nunca é regravada. Essa opção só vale para imagens salvas na sessão atual.
