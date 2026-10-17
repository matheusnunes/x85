#ifndef FUNCOES_M_H
#define FUNCOES_M_H

#include <stdio.h>
#include <math.h>
#include <string.h>

#include "chien2d2.h"
#include "chienaudio2.h"
#include "chien2d2_interno.h" /* usei pra manipular as texturas manualmente */
#include "chien2d2primitivas.h"
#include "chien2d2mapa.h"


enum {TELA_MAIN,TELA_SLOT_SELECT,TELA_SLOT_INSERT,TELA_MISSION,TELA_OPCOES,TELA_RANKING,TELA_ABOUT,TELA_JOGO,SAIR};
enum {EASY=1, NORMAL, HARD, GODMODE};

struct planeta
{
	int x,y;
	int tamanho;
	int alpha;
};

struct tiporecorde
{
	char nome[15];
	int pts;
};

struct tiposave
{
    bool empty;
    int pts;
	char nome[15];
	int level;
	int planeta_liberado;
	int planeta_atual;
    bool tiro_liberado[6];
};

//globalzzzz
extern tiposave saveAtual;

//qual slot esta em execução
extern int slotAtual;

extern int estado_atual;
extern int planeta_max;
extern int volume_effects, volume_music;

extern int encerra;
extern int fadealpha;
extern bool fadecontrol;

extern unsigned int music_menu;
extern unsigned int music_jogo;

/* funcoes_M aqui vão as funções auxiliares do menu */
void XDesenhaSprite(unsigned int id,unsigned int indice,int posx, int posy,int largura,int altura,int alpha);
int XDesenhaBotao(unsigned int idbot,int indx, int x,int y, unsigned int idcursor,int &alpha );
void planetas_atualiza(planeta **planetas, int atual,int max);
int atualiza_barra(int &yatual, int ymax, int ymin, C2D2_Mouse *mouse);

/*recordes e cia*/
void menu_recordes_default();
void menu_recordes_insere(int pontoschar,char *tempnome);

/*slot e cia*/
void menu_saves_default();
void menu_saves_carregavetor(tiposave *vetsaves);
void menu_saves_saveslot(int slot);
void menu_saves_loadslot(int slot);
void menu_saves_edit(int slot, char nome[15],int level, bool empty);


/* menu.cpp funções principais do menu */
void menu_carrega();

void menu_fundo();
void menu_aux();
void menu_main();


void menu_mission();
void menu_ranking();
void menu_opcoes();
void menu_about();
void menu_slot_select();
void menu_slot_insert();

#endif
