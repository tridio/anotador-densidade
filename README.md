# Anotador de Densidade

Ferramenta local para anotar densidade em imagens: você preenche **unidades** e **área**, a
**densidade** é calculada sozinha e gravada na própria imagem como uma legenda preta no canto
inferior direito, com a memória de cálculo.

É um único arquivo `index.html`, sem dependências e sem build.

## Privacidade

Roda **inteiramente no seu navegador**. Nenhuma imagem é enviada para qualquer servidor —
os arquivos são lidos e regravados direto no seu computador.

## Requisitos

**Chrome ou Edge**, por causa da [File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_Access_API),
que é o que permite sobrescrever os arquivos originais no disco.

No Firefox e no Safari a ferramenta ainda abre e calcula, mas o botão Salvar **baixa uma cópia**
em vez de sobrescrever o original.

## Como usar

1. **Selecionar pasta** (ou arraste uma pasta para a janela) — a permissão de gravação é pedida
   **uma única vez** e cobre todos os arquivos dela. Também dá para escolher/arrastar imagens avulsas,
   mas aí o navegador pede permissão uma vez por arquivo ao salvar.
2. Clique na imagem que servirá de **referência**. Ela fica fixa na metade esquerda.
3. Na metade direita, clique numa miniatura para abri-la.
4. Preencha **unidades** (o foco já está lá) → **Tab** → **área** (aceita `,` ou `.`).
   A densidade (`unidades ÷ área`) é calculada na hora.
5. Se a legenda estiver cobrindo algo importante, o botão **Legenda** (canto inferior direito)
   alterna entre os quatro cantos da foto. A última escolha vira o padrão da próxima imagem.
6. **Salvar e voltar** sobrescreve a imagem com a legenda e volta para a lista.
   **Cancelar** volta sem gravar nada, descartando o que foi digitado.

Na imagem de referência à esquerda, clique para marcar com uma bolinha os pontos já trabalhados
(clique na bolinha para removê-la). Essas marcações são só visuais e não são gravadas em nada.
