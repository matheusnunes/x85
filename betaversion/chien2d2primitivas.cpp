#if	defined(linux)
	#include <SDL/SDL.h>
#else
	#include <SDL.h>
#endif


#include <stdlib.h>
#include "chien2d2.h"
#include "chien2d2primitivas.h"
#include "chien2d2primitivas_sdl.h"
#include "chien2d2primitivas_gl.h"

// Variável que indica o tipo de renderer utilizado
extern int render;

// Função que inicia a biblioteca
//
// Data: 27/07/2008
//
bool C2D2P_Inicia()
{
	switch(render)
	{
	case C2D2_DESENHO_OPENGL:
		C2D2PGL_Inicia();
		break;
	case C2D2_DESENHO_PADRAO:
		C2D2PSDL_Inicia();
		return true;
	}
	return false;
}


// Algoritmo para desenhar um vetor de pontos na tela. O vetor pontos considera
// a posição 0 de cada linha como coordenada x, sendo a posição 1 a coordenada
// no eixo y. nPontos é o número de pontos no vetor. R,G, e B são os valores da cor.
//
// Data: 28/03/2008
//
void (*C2D2P_Pontos)(C2D2P_Ponto pontos[], unsigned int nPontos, unsigned char r, unsigned char g, unsigned char b);

// Desenha uma linha vertical, a partir do ponto x,y, com altura alt e na cor indicada
// Usada para desenhar rapidamente elementos pintados
//
// Data: 06/02/2008
//
// Algoritmo para desenhar uma linha reta, baseado em duas coordenadas no plano e uma cor em RGB
// Usa o algoritmo do ponto médio.
//
// Data: 05/02/2008
//
void (*C2D2P_Linha)(int x1,int y1,int x2,int y2,unsigned char r, unsigned char g, unsigned char b);

// Algoritmo para desenhar um retângulo, baseado em duas coordenadas no plano e uma cor em RGB
//
// Data: 05/02/2008
//

void (*C2D2P_Retangulo)(int x1,int y1,int x2,int y2,unsigned char r, unsigned char g, unsigned char b);

// Algoritmo para desenhar um retângulo pintado, baseado em duas coordenadas no plano e uma cor em RGB
//
// Data: 05/02/2008
//
void (*C2D2P_RetanguloPintado)(int x1,int y1,int x2,int y2,unsigned char r, unsigned char g, unsigned char b);

// Algoritmo para desenhar um círculo, baseado em uma coordenada no plano, o raio e uma cor em RGB
// Usa o algoritmo do ponto médio
//
// Data: 05/02/2008
//
void (*C2D2P_Circulo)(int xc,int yc, int raio, unsigned char r, unsigned char g, unsigned char b);

// Algoritmo para desenhar um círculo pintado, baseado em uma coordenada no plano, o raio e uma cor em RGB
// Baseado no algoritmo do círculo pelo ponto médio
//
// Data: 05/02/2008
//
void (*C2D2P_CirculoPintado)(int xc,int yc,int raio, unsigned char r, unsigned char g, unsigned char b);

// Algoritmo para desenhar uma elipse, baseado no centro da elipse, a relação "a" e "b", mais uma cor RGB
// Usa o algoritmo do ponto médio
//
// Data: 06/02/2008
//
void (*C2D2P_Elipse)(int xc, int yc, int va, int vb, unsigned char r, unsigned char g, unsigned char b);

// Algoritmo para desenhar uma elipse pintada, baseado no centro da elipse, a relação "a" e "b", mais uma cor RGB
// Usa o algoritmo do ponto médio
//
// Data: 06/02/2008
//
void (*C2D2P_ElipsePintada)(int xc, int yc, int va, int vb, unsigned char r, unsigned char g, unsigned char b);
