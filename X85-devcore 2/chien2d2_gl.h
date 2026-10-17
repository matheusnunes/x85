#ifndef CHIEN2D2_GL_H
#define CHIEN2D2_GL_H

/**
	Chien2D v2.0 Render OpenGL
	Por Paulo V. W. Radtke - pvwradtke@gmail.com

	Licença: o software Chien2D v2.0 e seus componentes periféricos (Chien2D Mapppy, Chien2D Primitivas) são licenciados
	para aplicações não comerciais. O software não possui garantias, sendo que qualquer problema causado pelo seu uso
	correto ou incorreto não podem ser considerados responsabilidade do autor.

	Data: 12/06/2008

**/
#include "chien2d2.h"
#include "chien2d2_interno.h"

// funções da Chien2D2

// Função que inicia a Chien2D 2
bool C2D2GL_Inicia(unsigned int largura, unsigned int altura, int modoVideo, char *tituloJanela);
// Função que encerra a Chien2D 2
void C2D2GL_Encerra();
// Função para sincronizar o vídeo a 60ppfps
void C2D2GL_Sincroniza();
// Função para limpar a tela
void C2D2GL_LimpaTela();
// Função para escolher a cor de limpeza da tela
void C2D2GL_TrocaCorLimpezaTela(Uint8 r, Uint8 g, Uint8 b);
// Função para limitar a área de desenho da tela
void C2D2GL_LimitaAreaDesenho(int x, int y, int largura, int altura);
// Função para eliminar o limite da área de desenho
void C2D2GL_LiberaAreaDesenho();

// Funções para manipular sprites

// função para carregar um sprite set na memória
unsigned int C2D2GL_CarregaSpriteSet(const char *arquivo, int largura, int altura);
// Remove um sprite set da memória
void C2D2GL_RemoveSpriteSet(unsigned int id);
// Função para desenhar um sprite
bool C2D2GL_DesenhaSprite(unsigned int identificador, unsigned int indice, int x, int y);
// Função para desenhar um sprite distorcido e com efeitos de cor/alpha
bool C2D2GL_DesenhaSpriteEfeito(unsigned int identificador, unsigned int indice, int x[4], int y[4], Uint8 r, Uint8 g, Uint8 b, Uint8 a);


// funções específicas para a OpenGL
// Protótipos de funções internas da versão Open GL
inline void resetaGL();
inline void alteraBlend(bool estado);
void setaTexturizacao(bool estado);
inline void modoBlend(GLenum fatorOrigem, GLenum fatorDestino);
inline void setaTextura(GLuint textura);
inline void modoWrapTextura(GLenum wrapTexturaS, GLenum wraptTexturaT);
inline void modoFiltragem(GLenum filtroMax, GLenum filtroMin);


#endif
