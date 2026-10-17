#ifndef C2D2PRIMITIVASGL_H
#define C2D2PRIMITIVASGL_H

// Função que inicia a biblioteca
bool C2D2PGL_Inicia();
// Algoritmo para desenhar um vetor de pontos na tela
void C2D2PGL_Pontos(C2D2P_Ponto pontos[], unsigned int nPontos, unsigned char r, unsigned char g, unsigned char b);
// Algoritmo para desenhar uma linha reta, baseado em duas coordenadas no plano e uma cor em RGB
void C2D2PGL_Linha(int x1,int y1,int x2,int y2,unsigned char r, unsigned char g, unsigned char b);
// Algoritmo para desenhar um retângulo, baseado em duas coordenadas no plano e uma cor em RGB
void C2D2PGL_Retangulo(int x1,int y1,int x2,int y2,unsigned char r, unsigned char g, unsigned char b);
// Algoritmo para desenhar um retângulo pintado, baseado em duas coordenadas no plano e uma cor em RGB
void C2D2PGL_RetanguloPintado(int x1,int y1,int x2,int y2, unsigned char r, unsigned char g, unsigned char b);
// Algoritmo para desenhar um círculo, baseado em uma coordenada no plano, o raio e uma cor em RGB
void C2D2PGL_Circulo(int x,int y,int raio, unsigned char r, unsigned char g, unsigned char b);
// Algoritmo para desenhar um círculo pintado, baseado em uma coordenada no plano, o raio e uma cor em RGB
void C2D2PGL_CirculoPintado(int x,int y,int raio, unsigned char r, unsigned char g, unsigned char b);
// Algoritmo para desenhar uma elipse, baseado no centro da elipse, a relação "a" e "b", mais uma cor RGB
void C2D2PGL_Elipse(int xc, int yc, int va, int vb, unsigned char r, unsigned char g, unsigned char b);
// Algoritmo para desenhar uma elipse pintada, baseado no centro da elipse, a relação "a" e "b", mais uma cor RGB
void C2D2PGL_ElipsePintada(int xc, int yc, int va, int vb, unsigned char r, unsigned char g, unsigned char b);


#endif
