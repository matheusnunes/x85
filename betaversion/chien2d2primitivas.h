#ifndef C2D2PRIMITIVAS_H
#define C2D2PRIMITIVAS_H

typedef int C2D2P_Ponto[2];

// Função que inicia a biblioteca
bool C2D2P_Inicia();
// Algoritmo para desenhar um vetor de pontos na tela
extern void (*C2D2P_Pontos)(C2D2P_Ponto pontos[], unsigned int nPontos, unsigned char r, unsigned char g, unsigned char b);
// Algoritmo para desenhar uma linha reta, baseado em duas coordenadas no plano e uma cor em RGB
extern void (*C2D2P_Linha)(int x1,int y1,int x2,int y2,unsigned char r, unsigned char g, unsigned char b);
// Algoritmo para desenhar um retângulo, baseado em duas coordenadas no plano e uma cor em RGB
extern void (*C2D2P_Retangulo)(int x1,int y1,int x2,int y2,unsigned char r, unsigned char g, unsigned char b);
// Algoritmo para desenhar um retângulo pintado, baseado em duas coordenadas no plano e uma cor em RGB
extern void (*C2D2P_RetanguloPintado)(int x1,int y1,int x2,int y2, unsigned char r, unsigned char g, unsigned char b);
// Algoritmo para desenhar um círculo, baseado em uma coordenada no plano, o raio e uma cor em RGB
extern void (*C2D2P_Circulo)(int x,int y,int raio, unsigned char r, unsigned char g, unsigned char b);
// Algoritmo para desenhar um círculo pintado, baseado em uma coordenada no plano, o raio e uma cor em RGB
extern void (*C2D2P_CirculoPintado)(int x,int y,int raio, unsigned char r, unsigned char g, unsigned char b);
// Algoritmo para desenhar uma elipse, baseado no centro da elipse, a relação "a" e "b", mais uma cor RGB
extern void (*C2D2P_Elipse)(int xc, int yc, int va, int vb, unsigned char r, unsigned char g, unsigned char b);
// Algoritmo para desenhar uma elipse pintada, baseado no centro da elipse, a relação "a" e "b", mais uma cor RGB
extern void (*C2D2P_ElipsePintada)(int xc, int yc, int va, int vb, unsigned char r, unsigned char g, unsigned char b);

#endif
