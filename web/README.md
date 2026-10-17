# X85 web

Porte para navegador do X85 (versão de agosto de 2010, `X85-devcore 2/`): TypeScript, WebGL2, Web Audio, sem dependências em
tempo de execução. Para a história do jogo, controles e créditos, veja o [README da raiz](../README.md).

Jogo online: (link após o deploy). Mudanças deliberadas em relação ao original: [`FIXES.md`](FIXES.md).

## Comandos

Requer Node.js 22+.

| Comando | O que faz |
|---|---|
| `npm install` | instala as dependências de desenvolvimento (Vite, TypeScript, Vitest, Playwright) |
| `npm run dev` | servidor de desenvolvimento do Vite |
| `npm run build` | `tsc --noEmit` e `vite build`, saída em `dist/` |
| `npm run preview` | serve `dist/` em http://localhost:4317 (porta fixa, `--strictPort`) |
| `npm run typecheck` | só o TypeScript |
| `npm test` | testes unitários e de simulação (Vitest) |
| `npm run e2e` | testes de ponta a ponta (Playwright); faz o build e sobe o preview na porta 4317 |
| `npm run assets` | regenera `public/assets/` a partir de `../X85-devcore 2/dados` |

Na primeira vez, rode `npx playwright install` para baixar os navegadores dos testes e2e.

## Arquitetura

```
src/
  engine/   substitui a Chien2D 2: uma API com os mesmos nomes do subconjunto que o X85 usa
  game/     tradução 1:1 do código C++ (nomes em português mantidos, com comentários "orig: arquivo.cpp:linha")
  touch/    controles de toque sobrepostos ao canvas (DOM/CSS)
  main.ts   inicialização: WebGL2, carga de assets, splash, loop, tela, pausa
```

- **Engine shim + tradução 1:1.** O jogo em `src/game/` chama funções com os nomes originais (`C2D2_DesenhaSprite`, `CA2_TocaEfeito`, ...),
  expostas pela fachada `src/engine/c2d2.ts`. As telas e o laço da partida, que no C++ são laços bloqueantes com `C2D2_Sincroniza()`,
  são **geradores** (`function* menu_main() { ... yield; }`): cada `yield` marca o fim de um quadro, então a lógica do jogo
  fica quase idêntica ao original.
- **Passo fixo de 60 Hz.** `engine/loop.ts` roda a lógica com um acumulador a 60 Hz lógicos e desenha uma vez por `requestAnimationFrame`
  (estável em monitores de 120/144 Hz). Se a aba fica oculta, a lógica congela, sem recuperação de quadros.
- **WebGL2.** `engine/renderer.ts` agrupa quads texturizados em lotes (mistura alfa direta, filtro LINEAR como no backend GL original).
  O canvas tem sempre 800x600 de resolução lógica e escala via CSS (`engine/viewport.ts`: letterbox, tela cheia, áreas seguras).
- **Colisão por pixel.** Máscaras de bits geradas na etapa de assets a partir do RGBA dos PNGs (só RGBA == 0 é vazio, como na engine) em `engine/collision.ts`.
- **Web Audio.** `engine/audio.ts`: efeitos decodificados em buffers com 8 vozes (descarta quando cheio) e pan; música em `<audio>` ligado a um `GainNode`;
  volume 0 a 100; áudio liberado no primeiro gesto do usuário. AAC (`.m4a`) onde há suporte, senão Ogg.
- **localStorage.** `engine/storage.ts`: JSON versionado (`x85:v1`) com 3 slots de save, 7 recordes e as opções de volume.
- **rand().** `engine/rand.ts` reproduz o `rand()` da glibc (TYPE_3, sem semente), para manter as mesmas sequências do original.

### Tabela de mapeamento: API da Chien2D 2 para a web

| API original (Chien2D 2 / ChienAudio 2) | Implementação web |
|---|---|
| `C2D2_Inicia`, `C2D2P_Inicia`, `C2D2M_Inicia`, `CA2_Inicia`, `*_Encerra`, `C2D2_Remove*` | não fazem nada (inicialização em `src/main.ts`; sem liberação no navegador): `engine/c2d2.ts` |
| `C2D2_PegaTeclas`, `C2D2_PegaMouse` (+ `C2D2_PegaDigitados`, adição web) | `engine/input.ts` (classe `Entrada`: bordas pressionado/ativo/liberado por quadro; teclado, mouse, gamepad, toque), ligada por `bindEntrada` em `engine/c2d2.ts` |
| `C2D2_CarregaSpriteSet`, `C2D2_DesenhaSprite`, `C2D2_DesenhaSpriteEfeito`, `C2D2_LimpaTela`, `C2D2P_Pontos`, `C2D2_Sincroniza` | `engine/sprites.ts` (recorte de quadros, máscaras) sobre o `Backend` de `engine/renderer.ts` (`WebGL2Backend`; `RecordingBackend` nos testes) |
| `C2D2_CarregaFonte`, `C2D2_DesenhaTexto` | `engine/font.ts` (fonte bitmap `512.png`, métricas por glifo) |
| `C2D2_ColidiuSprites` | `engine/collision.ts` (AND por pixel das máscaras sobre o retângulo de interseção) |
| `C2D2M_CarregaMapaMappy`, `C2D2M_CamadaMarcas`, `C2D2M_PrimeiroBlocoMarca`, `C2D2M_ProximoBlocoMarca`, `C2D2M_PosicionaMapa` | `engine/mapa.ts` (mapas FMP do Mappy convertidos para JSON no build; lista de marcas) |
| `CA2_CarregaEfeito`, `CA2_TocaEfeito`, `CA2_TocaEfeitoTela` | `engine/audio.ts` (buffers decodificados, vozes, pan) |
| `CA2_CarregaMusica`, `CA2_TocaMusica`, `CA2_PausaMusica`, `CA2_ContinuaMusica`, `CA2_AjustaVolume` | `engine/audio.ts` (`criaPortaWebAudio`: `<audio>` para `MediaElementSource` para `GainNode`) |
| `rand`, `srand` | `engine/rand.ts` (glibc TYPE_3) |
| carga de arquivos de `dados/` | `engine/assets.ts` (`carregaTudo`: manifest, imagens, máscaras, mapas) |
| fopen/fwrite de saves e recordes | `engine/storage.ts` (`localStorage`) |
| laço principal bloqueante e `SDL_Delay` | `engine/loop.ts` (`PassoFixo`, `iniciaLoop`, `MedidorFps`) |
| janela SDL, tela cheia | `engine/viewport.ts` (`encaixa`, `paraLogico`, `alternaTelaCheia`) |

Os detalhes da semântica da engine original estão em [`docs/analysis/02-engine-and-formats.md`](../docs/analysis/02-engine-and-formats.md).

## Pipeline de assets

`npm run assets` (`tools/build-assets.mjs`) lê `../X85-devcore 2/dados` e gera `public/assets/`:
copia e renomeia imagens, gera as máscaras de colisão a partir do RGBA dos PNGs, exporta os mapas FMP das fases 1 a 5 como JSON de marcas,
converte o áudio e escreve `manifest.json`. A saída é **versionada no git**, então o deploy não precisa de ferramentas do macOS.

- O áudio vai para Ogg (a origem) e AAC `.m4a` (para o Safari/iOS). O `.m4a` é criado com `afconvert`, que só existe no macOS;
  sem ele o script mantém os `.m4a` já commitados, e a saída do `afconvert` não é determinística, então reexecuções reaproveitam os arquivos existentes.
- Os arquivos não têm hash no nome. O build copia `public/` para `dist/assets/` e a Netlify serve esse diretório com `max-age=86400`
  (veja `../netlify.toml`); só os bundles de JS/CSS do Vite (`dist/bundle/`) são `immutable`.

## Testes

- **Vitest** (`npm test`): `tests/unit/` (rand, bordas de entrada, recorte de sprites, máscaras e colisão, mapas FMP, armazenamento, áudio, toque, viewport, ferramentas de assets)
  e `tests/sim/` (simulações determinísticas: entradas roteirizadas, estado esperado no quadro N: jogador, inimigos e chefes, menus, partida completa).
- **Playwright** (`npm run e2e`): `tests/e2e/` com capturas de cada menu e do HUD e um jogo de fumaça. O servidor de teste usa a porta **4317** (build novo a cada execução)
  e há 5 projetos: `desktop-chromium`, `desktop-webkit`, `iphone-landscape`, `iphone-portrait` e `pixel`. As imagens de referência ficam em `tests/e2e/*-snapshots/`.

## Deploy

A Netlify usa o `netlify.toml` da raiz do repositório (`base = "web"`, `npm run build`, publica `dist/`) e define os cabeçalhos de cache
e a Content-Security-Policy (`default-src 'self'`, estilos inline permitidos pelo bloco `<style>` do `index.html`, nenhum script inline).
