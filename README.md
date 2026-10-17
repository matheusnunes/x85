# X85

Um jogo de nave (shoot'em up espacial) feito na faculdade, em C++ com a engine Chien2D 2, SDL 1.2 e OpenGL.
A versão de 2010 foi premiada em dois eventos de jogos independentes. Este repositório guarda o código-fonte original
(2009 e 2010) e uma **versão para navegador** do jogo de 2010 (TypeScript, WebGL2 e Web Audio), jogável no desktop e no celular.

Jogue online: **https://x85-game.netlify.app**

## História

- **2009 (`betaversion/`)**: a primeira versão do jogo. Está aqui como arquivo histórico e não foi portada.
- **2010 (`X85-devcore 2/`)**: a versão final, de agosto de 2010: cinco fases com chefes, armas liberáveis, planetas, ranking, três slots de save e
  as telas de menu como são conhecidas hoje. É a versão premiada e a que foi portada para a web.

O porte web é uma tradução fiel: mesma arte, mesmos sons e músicas, mesmos menus, mesmas constantes de jogo, hitboxes pixel a pixel e
a mesma sequência do `rand()` da glibc para o campo de estrelas e os padrões dos chefes. As únicas diferenças de comportamento
(correções de bugs do original e adaptações para o navegador, como controles de toque) estão listadas em [`web/FIXES.md`](web/FIXES.md).

## Mapa das pastas

| Pasta | Conteúdo |
|---|---|
| `betaversion/` | Versão de 2009 (arquivo histórico, não portada). |
| `X85-devcore/` | Snapshot de junho de 2010. Fica só na máquina local, fora do git (está no `.gitignore`), por ser redundante com a versão final. |
| `X85-devcore 2/` | Versão final, de agosto de 2010: o código-fonte C++, os assets (`dados/`) e a engine Chien2D 2. Somente leitura, nunca é modificada. |
| `web/` | O porte para o navegador. Veja [`web/README.md`](web/README.md). |
| `docs/analysis/` | Análise do original: [especificação do jogo](docs/analysis/01-game-spec.md), [engine e formatos](docs/analysis/02-engine-and-formats.md), [versões e assets](docs/analysis/03-versions-and-assets.md), [estratégia de porte](docs/analysis/04-port-strategy-research.md), [engenharia reversa dos binários](docs/analysis/05-reverse-engineering.md). |
| `docs/superpowers/` | [Spec de design](docs/superpowers/specs/2026-10-17-x85-web-port-design.md) e [plano de implementação](docs/superpowers/plans/2026-10-17-x85-web-port.md) do porte. |
| `netlify.toml` | Configuração de build e de cabeçalhos (cache, CSP) do deploy na Netlify. |

## Como jogar

Toque na tela inicial (ou clique/tecle) para começar. Nos menus, use o mouse ou o teclado. Na fase:

| | Mover | Atirar | Bomba | Trocar arma | Voltar ao menu |
|---|---|---|---|---|---|
| **Teclado** | setas ou WASD | Espaço (segurar) ou J | Ctrl esquerdo ou X | Alt esquerdo ou Z | Esc |
| **Mouse** | | botão esquerdo (segurar) | | | |
| **Gamepad** | direcional ou analógico esquerdo | A ou RT | B | LB ou RB | Start |
| **Toque (celular)** | arrastar o dedo na tela | enquanto o dedo está na tela | botão BOMBA | botão ARMA | botão de pausa e confirmação |

Outros atalhos: **F** alterna tela cheia. Ao perder o foco da aba, o jogo pausa sozinho. As opções de volume, os saves, os recordes
e o nome do jogador ficam no `localStorage` do navegador.

## Como rodar a versão web

Requer Node.js 22 ou mais novo.

```sh
cd web
npm install
npm run dev        # servidor de desenvolvimento (Vite)
```

Para uma versão de produção: `npm run build` (gera `web/dist/`) e `npm run preview` (serve em http://localhost:4317).
Testes, arquitetura e o pipeline de assets estão no [`web/README.md`](web/README.md).

## Créditos

- **Jogo original (2010)**: Christian Isenberg, Diego Lopes Simioni e Matheus Gobato Nunes (equipe principal, como créditos na tela "about" do jogo).
- **Porte para a web (2026)**: Matheus Gobato Nunes.
- **Engine original**: [Chien2D 2](docs/analysis/02-engine-and-formats.md), a biblioteca 2D educacional brasileira usada pelo jogo. O código dela não é redistribuído no porte web:
  o navegador usa uma reimplementação própria da API que o X85 usa (`web/src/engine/`).
- **Música do jogo** (`progression_sasquamox.ogg`): "Esprit", de **SasquaMox**, no Newgrounds Audio Portal
  ([newgrounds.com/audio/listen/347665](https://www.newgrounds.com/audio/listen/347665)), licença
  [CC BY-NC 3.0](https://creativecommons.org/licenses/by-nc/3.0/). A página da faixa informa que jogos para a web podem usá-la livremente.
  O arquivo no jogo original se chama "Progression".
- **Música do menu** (`recharge_alvys18.ogg`): "Recharge", de **alvys18**, no Newgrounds Audio Portal
  ([newgrounds.com/audio/listen/348628](https://www.newgrounds.com/audio/listen/348628)). A faixa não indica uma licença aberta;
  é usada aqui com crédito (na tela "about", na página de créditos do jogo e neste README). Se você é o autor e quer que ela seja removida, abra uma issue.
- A tela "Sobre / créditos" do jogo mostra os mesmos créditos com links.

A arte, o código original de 2009 e 2010 e as músicas mantêm os direitos e licenças dos respectivos autores.

## Correções e mudanças em relação ao original

Veja [`web/FIXES.md`](web/FIXES.md): cada correção de bug do original (vazamento do pool de tiros inimigos, travamento ao gravar recorde baixo,
INIMIGO3 sem pontuar, etc.) e cada adição da plataforma (toque, pausa, volume persistente), com o `arquivo:linha` do original.
