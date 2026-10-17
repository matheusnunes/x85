// Includes de biblioteca padrão
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>
#include <time.h>

// Includes da biblioteca multimídia
#include "chien2d2.h"
#include "chien2d2primitivas.h"
#include "chienaudio2.h"
#include "chien2d2mapa.h"

typedef struct
{
	int img;
	int alpha;
	int indx; //indexação atual opcional
	int x,l,y,a; //posição, largura,altura
	
} tipobotao;

typedef struct
{
	char nome[15];
	int pts;
	
} tiporecorde;

typedef struct
{
	// Tipo do personagem
	int tipo;
	// Posição
	int x, y;
	int dx;
	int energia;
	int sprite;
	int quadro;
}Personagem;

// Os tipos de personagens
enum {INVALIDO, X85, TIRO, METEORO,INIMIGO_VERDE,INIMIGO_VERMELHO,INIMIGO03,INIMIGO04,ENERGY, EXPLOSAO, EXPLOSAO_X85,ESCUDO,TIRO2,TIRO3};
//nome dos quadros a serem procurados no mapa
enum {BOLA=C2D2M_PROG, INIMIGO1, INIMIGO2,INIMIGO3,INIMIGO4,TIPOMETEORO,ENERGIA,M_ESCUDO,TIROTIPO1,TIROTIPO2};
// Constantes do jogo
enum {TELA_SPLASH, TELA_PRINCIPAL, TELA_JOGO, TELA_OPCOES, TELA_CREDITOS, TELA_RECORDES};

#define MAXINIMIGOS 200
// A velocidade do tiro
#define VTIRO	8
// Defines para o tamanho da janela do mapa
#define JANELA_MAPA_X	800
#define JANELA_MAPA_Y	600
//prototipos do menu
void DesenhaSprite(unsigned int id,unsigned int indice,int posx, int posy,int largura,int altura,int red,int green,int blue,int alpha);
int DB(tipobotao *bot,int maxbots);
int carrega(int i);
int loading(int i);
int ask(int model);
void play();
void options();
void records();
void credits();
void mainmenu();

	
// Protótipos de funções principais do jogo
void CarregaRecursos();
void RemoveRecursos();
int TelaJogo();
void GameOver();
void recordesNome(char *nome);
void recordesInsere(int pontos);
// Função para atualizar o jogador e demias personagens
void AtualizaJogador(Personagem *jogador);
void AtualizaTiro(Personagem *tiro);
void AtualizaInimigo(Personagem *inimigo);
void CriaTiro(Personagem *tiro, Personagem *jogador,int ymapa);
void DesenhaPersonagem(Personagem *pers, int ymapa);
bool ColidiuPersonagemInimigo(Personagem *pers, Personagem *inim,int ymapa);
void CriaInimigo(Personagem *inimigo, int tipos, int x , int y);
void CriaExplosao(Personagem *pers, int x , int y);
void AtualizaExplosao(Personagem *pers);
void AtualizaExplosaoInimigo(Personagem *inim);
void AtualizaTiroInimigo(Personagem *tiro,Personagem *inimigo);
void CriaExplosaoInimigo (Personagem *inim , int x , int y);
void CriaMeteoro(Personagem *meteo,int x , int y);
void CriaEstrelas();
void AtualizaEstrelas();

int mainjogo(int nave, int fase);
