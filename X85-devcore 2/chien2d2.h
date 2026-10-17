#ifndef CHIEN2D2_H
#define CHIEN2D2_H

// Includes da SDL includes
#if	defined(linux)
	#include <SDL/SDL.h>
	#include <SDL/SDL_image.h>
#else
	#include <SDL.h>
	#include <SDL_image.h>
#endif



// Includes OpenGL (multiplataforma)
#if defined(__APPLE__) && defined(__MACH__)
    #include <OpenGL/gl.h>
    #include <OpenGL/glu.h>
#else
	#ifndef linux
		#include <windows.h>
	#endif
	#include <GL/gl.h>
	#include <GL/glu.h>
#endif

// Defines úteis

#define C2D2_TAM_PATH				2048	// Tamanho do path de um arquivo completo em bytes
#define C2D2_MAX_SPRITESET			1024	// Número máximo de sprite sets que podem ser carregados
#define C2D2_MAX_FONTES				64		// Número máximo de fontes que podem ser carregadas
#define C2D2_TEXTO_CENTRALIZADO		0	// Texto centralizado
#define C2D2_TEXTO_DIREITA			1	// Texto à direita
#define C2D2_TEXTO_ESQUERDA			2	// Texto à direita

enum {C2D2_JANELA, C2D2_TELA_CHEIA};	// Modos de vídeo em janela e tela cheia

// tipos de desenho de telas. Por enquanto, apenas o default está disponível
enum {C2D2_DESENHO_PADRAO, C2D2_DESENHO_OPENGL};

#if SDL_BYTEORDER == SDL_BIG_ENDIAN
	#define	RMASK	0xff000000
	#define	GMASK	0x00ff0000
	#define BMASK	0x0000ff00
	#define AMASK	0x000000ff
#else
	#define	RMASK	0x000000ff
	#define	GMASK	0x0000ff00
	#define BMASK	0x00ff0000
	#define AMASK	0xff000000
#endif

// Constantes de teclado

enum {C2D2_CIMA, C2D2_BAIXO, C2D2_DIREITA, C2D2_ESQUERDA, C2D2_ESC, C2D2_F1, C2D2_F2, C2D2_F3, C2D2_F4,
C2D2_A, C2D2_B, C2D2_C, C2D2_D, C2D2_E, C2D2_F, C2D2_G, C2D2_H, C2D2_I, C2D2_J, C2D2_K, C2D2_L, C2D2_M,
C2D2_N, C2D2_O, C2D2_P, C2D2_Q, C2D2_R, C2D2_S, C2D2_T, C2D2_U, C2D2_V, C2D2_W, C2D2_X, C2D2_Y, C2D2_Z,
C2D2_0, C2D2_1, C2D2_2, C2D2_3, C2D2_4, C2D2_5, C2D2_6, C2D2_7, C2D2_8, C2D2_9,
C2D2_ENTER, C2D2_ESPACO, C2D2_BACKSPACE,
C2D2_LALT, C2D2_RALT, C2D2_LCTRL, C2D2_RCTRL, C2D2_LSHIFT, C2D2_RSHIFT, C2D2_ENCERRA, C2D2_MAXTECLAS};
// Constantes dos botões do mouse
enum {C2D2_MESQUERDO, C2D2_MDIREITO, C2D2_MMEIO, C2D2_MMAX};

//     A estrutura C2D2_BitMask define a máscara de bits para colisão.
//
// Data: 03/05/2007

typedef struct C2D2_BitMask
{
	// As dimensões da máscara
	int largura, altura;
	// A largura em dwords
	int ldwords;
	// A máscara de bits por definição (uma dword)
	Uint32 *mask;
}C2D2_BitMask;

//     A estrutura C2D2_SpriteSet possui campos relacionados aos sprites no sistema.
//
// Data: 29/03/2007

typedef struct C2D2_SpriteSet
{
    // Quantos elementos usam esse sprite set. Elimina quando chega a zero
    unsigned int usuarios;
    // O apelido do sprite set. Único no sistema
    char apelido[C2D2_TAM_PATH];
    // O tamanho total da imagem do sprite set
    int largura, altura;
    // As dimensões dos sprites
    int spLargura, spAltura;
    // As dimensões da matriz de sprites
    int matrizX, matrizY;
    // Os dados da imagem lida do disco
    SDL_Surface *imagem;
	// A textura OpenGL (exclusivo OpenGL)
	GLuint textura;
	// Indica se a textura está ligada na placa de vídeo ou não
	bool texturaLigada;
	// Indica o tamanho da textura OpenGL (pode ser maior que o tamanho da imagem em si)
	int larguraTextura, alturaTextura;
    // O vetor de BitMasks
    C2D2_BitMask **bmask;
} C2D2_SpriteSet;


//     A estrutura Fonte possui campos relacionados às fontes do sistema.
//
// Data: 29/03/2007

typedef struct C2D2_Fonte
{
    // Quantos elementos usam esse azulejo. Elimina quando chega a zero
    int usuarios;
    // O apelido da fonte. Único no sistema
    char apelido[C2D2_TAM_PATH];
    // Qual o tamanho quadrado (em pixels) da fonte
    int tamanhoFonte;
    // Identificador do spriteset da fonte
    unsigned int idSpriteSet;
    // Os deslocamentos em pontos das letras
    int deslocamentos[256];
    // As larguras das fontes
    int larguras[256];
} C2D2_Fonte;

//     A estrutura Botao possui campos relacionados a teclas/botoes do sistema de teclado
//
// Data: 04/05/2007

typedef struct C2D2_Botao
{
	// Indica se o botão acabou de ser pressionado
	bool pressionado;
	// Indica se o botão está sendo mantido pressionado
	bool ativo;
	// Indica quando o botão foi liberado
	bool liberado;
} C2D2_Botao;

typedef struct C2D2_Mouse
{
	// Indica as coordenadas atuais do mouse
	int x, y;
	// Indica os estados dos botões do mouse
	C2D2_Botao botoes[C2D2_MMAX];
}C2D2_Mouse;

// Função que inicia a Chien2D 2
bool C2D2_Inicia(unsigned int largura, unsigned int altura, int modoVideo, int tipoRender, char *tituloJanela);

// Função que encerra a Chien2D 2
extern void (*C2D2_Encerra)();
// Função para sincronizar o vídeo a 60ppfps
extern void (*C2D2_Sincroniza)();
// Função para limpar a tela
extern void (*C2D2_LimpaTela)();
// Função para escolher a cor de limpeza da tela
extern void (*C2D2_TrocaCorLimpezaTela)(Uint8 r, Uint8 g, Uint8 b);
// Função para limitar a área de desenho da tela
extern void (*C2D2_LimitaAreaDesenho)(int x, int y, int largura, int altura);
// Função para eliminar o limite da área de desenho
extern void (*C2D2_LiberaAreaDesenho)();
// Função para recuperar o tempo do sistema
unsigned long C2D2_TempoSistema();

// Funções para manipular sprites

// função para carregar um sprite set na memória
extern unsigned int (*C2D2_CarregaSpriteSet)(const char *arquivo, int largura, int altura);
// Remove um sprite set da memória
extern void (*C2D2_RemoveSpriteSet)(unsigned int id);
// Função para desenhar um sprite
extern bool (*C2D2_DesenhaSprite)(unsigned int identificador, unsigned int indice, int x, int y);
// Função para desenhar um sprite distorcido e com efeitos de cor/alpha
extern bool (*C2D2_DesenhaSpriteEfeito)(unsigned int identificador, unsigned int indice, int x[4], int y[4], Uint8 r, Uint8 g, Uint8 b, Uint8 a);

// Funções comuns de sprites
// Procura um spriteset pelo nome do arquivo original
unsigned int C2D2_ProcuraSpriteSet(const char *apelido);
// Função para verificar a colisão entre sprites
int C2D2_ColidiuSprites(unsigned int id1, unsigned int indice1, int x1, int y1,
					unsigned int id2, unsigned int indice2, int x2, int y2);

// função comuns para carregar uma fonte na memória
unsigned int C2D2_CarregaFonte(const char *arquivo, int dimensao);
// Remove uma fonte da memória
void C2D2_RemoveFonte(unsigned int id);
// Procura uma fonte pelo nome do arquivo original
unsigned int C2D2_ProcuraFonte(const char *apelido);
// Função para desenhar um texto
bool C2D2_DesenhaTexto(unsigned int identificador, int x, int y, char const *texto, unsigned int alinhamento);
// Função para calcular as dimensões de um texto
bool C2D2_DimensoesTexto(unsigned int idFonte, const char *texto, int *largura, int *altura);

// Funções comuns de entrada

// Poling das entradas. TRata todos os eventos relacionados a dispositivos de
// entrada do sistema
void C2D2_Entrada();
// Função para recuperar as teclas
C2D2_Botao* C2D2_PegaTeclas();
// Função para recuperar o mouse
C2D2_Mouse* C2D2_PegaMouse();


#endif
