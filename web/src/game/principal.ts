// State machine. orig: X85-devcore 2/main.cpp (all)
// main() becomes a generator: each screen function is a sub-generator run with `yield*` (one yield per frame).
// C2D2_Inicia (window, WebGL2 context), the asset preload and the frame clock are set up by src/main.ts.
import {
  C2D2_Inicia, C2D2_CarregaSpriteSet, C2D2_LimpaTela, C2D2_DesenhaSprite, C2D2_Sincroniza,
  C2D2P_Inicia, CA2_Inicia, C2D2M_Inicia, CA2_AjustaVolume, CA2_TocaMusica, CA2_Encerra, C2D2_Encerra,
  C2D2_JANELA, C2D2_DESENHO_OPENGL,
} from '../engine/c2d2';
import { g } from './funcoes_M';
import {
  menu_carrega, menu_main, menu_slot_select, menu_slot_insert, menu_mission, menu_ranking, menu_opcoes, menu_about,
} from './menu';
import { jogo_tela } from './jogo';
import {
  TELA_MAIN, TELA_SLOT_SELECT, TELA_SLOT_INSERT, TELA_MISSION, TELA_RANKING, TELA_OPCOES, TELA_ABOUT, TELA_JOGO, SAIR,
} from './constantes';

// orig: main.cpp:4 main — returns when estado_atual becomes SAIR (main.ts then shows the start splash again)
export function* principal(): Generator<void, void, void> {
  if (!C2D2_Inicia(800, 600, C2D2_JANELA, C2D2_DESENHO_OPENGL, 'X85')) {
    console.error('Nao conseguiu iniciar a tela. Encerrando.'); // orig: main.cpp:8 printf
    return;
  }

  //logo que aparece no splash screen
  const spx85 = C2D2_CarregaSpriteSet('./dados/menu/x85.jpg', 0, 0);
  C2D2_LimpaTela();
  C2D2_DesenhaSprite(spx85, 0, 312, 270);
  C2D2_Sincroniza();
  yield;

  // Inicia o áudio
  C2D2P_Inicia();
  CA2_Inicia();
  C2D2M_Inicia();
  CA2_AjustaVolume(g.volume_music, g.volume_effects);

  menu_carrega();

  g.estado_atual = TELA_MAIN;

  while (g.estado_atual !== SAIR) {
    //depois de sair do while da tela ele precisa voltar pra zero
    g.encerra = 0;

    switch (g.estado_atual) {
      case TELA_MAIN:
        yield* menu_main();
        break;
      case TELA_SLOT_SELECT:
        yield* menu_slot_select();
        break;
      case TELA_SLOT_INSERT:
        yield* menu_slot_insert();
        break;
      case TELA_MISSION:
        yield* menu_mission();
        break;
      case TELA_RANKING:
        yield* menu_ranking();
        break;
      case TELA_OPCOES:
        yield* menu_opcoes();
        break;
      case TELA_ABOUT:
        yield* menu_about();
        break;
      case TELA_JOGO:
        CA2_TocaMusica(g.music_jogo, -1);
        yield* jogo_tela();
        CA2_TocaMusica(g.music_menu, -1);
        break;
      default:
        // orig: an unknown state spins forever in the C loop; here yield a frame so the page stays responsive
        yield;
        break;
    }
  }
  // Encerra tudo
  CA2_Encerra();
  C2D2_Encerra();
}
