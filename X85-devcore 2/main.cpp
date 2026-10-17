#include "funcoes_M.h"
#include "funcoes_J.h"

int main(int ac, char **av)
{
	if(!C2D2_Inicia(800, 600, C2D2_JANELA, C2D2_DESENHO_OPENGL, (char*)"X85"))
	{
		printf("Nao conseguiu iniciar a tela. Encerrando.\n");
		return 1;
	}


	//logo que aparece no splash screen
	int spx85=C2D2_CarregaSpriteSet("./dados/menu/x85.jpg",0,0);
	C2D2_LimpaTela();
	C2D2_DesenhaSprite(spx85,0,312,270);
	C2D2_Sincroniza();

	// Inicia o áudio
	C2D2P_Inicia();
	CA2_Inicia();
    C2D2M_Inicia();
    CA2_AjustaVolume(volume_music, volume_effects);

	menu_carrega();

	estado_atual=TELA_MAIN;

	while(estado_atual!=SAIR)
	{
		//depois de sair do while da tela ele precisa voltar pra zero
		encerra=0;

		switch(estado_atual)
		{
            case TELA_MAIN:
				menu_main();
				break;
            case TELA_SLOT_SELECT:
				menu_slot_select();
				break;
            case TELA_SLOT_INSERT:
				menu_slot_insert();
				break;
			case TELA_MISSION:
				menu_mission();
				break;
			case TELA_RANKING:
				menu_ranking();
				break;
			case TELA_OPCOES:
				menu_opcoes();
				break;
            case TELA_ABOUT:
				menu_about();
				break;
			case TELA_JOGO:
                CA2_TocaMusica(music_jogo,-1);
				jogo_tela();
				CA2_TocaMusica(music_menu,-1);
				break;
			case SAIR:
				return 0;
				break;
		}
	}
	// Encerra tudo
	CA2_Encerra();
	C2D2_Encerra();
	return 0;
}
