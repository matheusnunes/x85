#ifndef FUNCOES_J_H
#define FUNCOES_J_H
#include "funcoes_M.h"

#define  MAXTIROS 300
#define  MAXMARCAS 1000
#define MAXSTARS 100
#define MAXEXPLOS 100

//tipos da nave
enum { INVALIDO=0 , X85, INVUNERAVEL};

//tipos de marcações no mapa
/* colocar novos itens sempre antes da explosão */
enum {BOLA=C2D2M_PROG, M_INIMIGO1, M_INIMIGO2,M_INIMIGO3,M_INIMIGO4,M_METEORO,M_BOSS,M_T1,M_T2,M_T3,M_T4,M_T5,M_T6};

enum { INIMIGO1=1, INIMIGO2,INIMIGO3,INIMIGO4,METEORO,BOSS1,BOSS2,BOSS3,BOSS4,BOSS5,T1,T2,T3,T4,T5,T6,EXPLOSAO};

//tipos de tiro <!> não tirar o "=1" senão fode tudo <!>
enum {TIRO1=1, TIRO2 , TIRO3, TIRO4, TIRO5, TIRO6, BOMBA1 ,TIROINI1,TIROINI2,TIROINI3};

typedef struct
{
	int tipo;
	int x, y;
	int xaux,yaux;
	int energia;
	int escudo;
	int velocidade;
	int tiro_atual;
	int bomba_atual;
	int n_bombas;
	int intervalo_tiro;
	unsigned int sprite;
}Nave;

typedef struct
{
	int tipo;
	int x,y;
	int alpha;
	int tamanho; //diametro
	int id; //auxiliar para efeitos
	unsigned int sprite;
}Tiro;

typedef struct
{
	int tipo;
	int estado_atual;
	int tempotiro;
	int x;
	int y;
    int centroX, centroY;
	int energia;
	int ativo;
	float angulo;
	unsigned int sprite;
}Marca;

typedef struct
{
    int tipo;
    int x,y;
    int tamanho;
    int alpha;
}Explo;

typedef struct
{
    int xinicio,xfinal,yinicio,yfinal;
    int ymapa;
    unsigned int mapa;
}Fase;

/* ATENÇÃO aqui ! */

void jogo_atualiza_fundo(float *ypersf1, float *ypersf2);
void jogo_cria_estrela(C2D2P_Ponto *estrelas, int max);
void jogo_atualiza_estrela(C2D2P_Ponto *estrelas, int vel, int max);

void jogo_atualiza_jogador(Nave  *jogador,Explo *explos);
void jogo_inicia_jogador(Nave *jogador);

void jogo_cria_tiro(Tiro *tiro, Nave *jogador, int tipo_tiro);
void jogo_cria_tiro_inimigo(Tiro *tiros, Marca marca, int tipo_tiro);
void jogo_atualiza_tiro(Tiro *tiro,Nave *jogador);


void jogo_atualiza_barras(int *altura_energia, Nave *jogador);

void jogo_procura_marca(unsigned int mapa,int marcacao,Marca *vetmarca,int &contadormarcas);
void jogo_atualiza_marca(Marca *marcas, int ymapa, Nave *jogador, Explo *explos, unsigned int somExplo, Tiro *tiros,int *score);
void jogo_inicia_marca(Marca *marcas,int contadormarcas, unsigned int tipo);

void jogo_testa_colisao(Marca *marcas, Tiro *tiros, unsigned int *spMarca, unsigned int *spTiro, Nave *jogador,int *score);

void jogo_cria_explosao(int x, int y, Explo *explos);
void jogo_atualiza_explosao(Explo *explos);

int jogo_tela();
void jogo_carrega();



#endif

