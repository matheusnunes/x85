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
#include "jogo.h"

//argus-sprites de vida e escudo
unsigned int barra_vida;
unsigned int barra_escudo;
unsigned int barras_cover;
//argus- controle das barras e efeitos de vida talz...
int altura_vida=0;
int altura_escudo=0;


int score = 0;
//fundo da tela
int fundo = 0;
int fundogameover=0;
//controle de tempo para fim do jogo
int fim = 0;
//explosao
unsigned int explosao = 0;
unsigned int som_explosao = 0;
//barra de energia
unsigned int BarraEnergia = 100;
int estadoJogo = TELA_JOGO;
// modelo de nave
int tiponave = 0;
int tipofase = 0;
//pontos
char spontos[80];
// Indica se deve encerrar a aplicação
bool quit = false;
//mapa
unsigned int mapa;
//sprite dos meteoros
int spMeteoros = 0;
//condicao de possibilidade de morte (ex escudo)
int morte = 1;
//fonte
unsigned int fonte;
//musica jogo
unsigned int musica_jogo;
//tiro
unsigned int jogoTiro;

//som do contador do game over
unsigned int blip=0;

//variaveis para escudo
int tempoescudo = 120;
//sprite
unsigned int  escudo = 0;
unsigned int explosao_jog = 0;

//estrelas
C2D2P_Ponto estrelas[50];
C2D2P_Ponto estrelas2[50];
//declara variáveis fundo animado
float ypersf1 = 0;
float ypersf2 = 0;
// Variáveis para os personagens
unsigned int spx85 = 0, spTiro = 0, spinimigo1 = 0, spinimigo2 = 0;
unsigned int explosao_jogador = 0;
//controle de animacao dos inimigos variavel global
int control = 0;
int control2 = 0;
int itens = 0;

void GameOver(int score)
{
	CA2_FadeMusica (60);
	int tempo=200;
	int pontostemp=0;
	char spontos[80];
	
	while (tempo>0)
		{
			
				if(pontostemp<score)
				{
					pontostemp+=50;
					CA2_TocaEfeito (blip, 0);
				}
				else tempo--;
			
			C2D2_LimpaTela();
			sprintf(spontos, "%09i", pontostemp);
			C2D2_DesenhaSprite(fundogameover, 0,0,0);
			C2D2_DesenhaTexto(fonte, 450,300, spontos,  C2D2_TEXTO_CENTRALIZADO);
			C2D2_Sincroniza();
		}
}


void CarregaRecursos() {
    // Fonte do sistema
    fonte = C2D2_CarregaFonte("dados/512.png", 32);
    // Carrega o mapa
    mapa = C2D2M_CarregaMapaMappy("sprites/mapa.FMP", "sprites/tileset.png");
    //tela de fundo
    if (tipofase == 0)
        fundo = C2D2_CarregaSpriteSet("sprites/back.jpg", 0, 0);
    else
        fundo = C2D2_CarregaSpriteSet("sprites/back2.jpg", 0, 0);
    //personagens
    //personagem 
    spx85 = C2D2_CarregaSpriteSet("sprites/naves.png", 80, 80);
    printf("Sprite da nave: %i\n");
    //inimigo1
    spinimigo1 = C2D2_CarregaSpriteSet("sprites/inim.png", 65, 65);
    spinimigo2 = C2D2_CarregaSpriteSet("sprites/inim2.png", 65, 65);
    //fundo game over
fundogameover=C2D2_CarregaSpriteSet("sprites/fundogameover.jpg",0,0);
    //tiro 1
    spTiro = C2D2_CarregaSpriteSet("sprites/tiro.png", 8, 8);
    //meteoro
    spMeteoros = C2D2_CarregaSpriteSet("sprites/meteoro.png", 100, 100);
    
   
    //escudo
    escudo = C2D2_CarregaSpriteSet("sprites/escudo.png", 0, 0);
    //explosao
    explosao_jogador = C2D2_CarregaSpriteSet("sprites/explo64.png", 64, 64);
    //itens
    itens = C2D2_CarregaSpriteSet("sprites/itens.png", 50, 50);
    //Sons
    //musica do jogo
    musica_jogo = CA2_CarregaMusica("sons/gameplay2.ogg");
    
	//son do tiro
    jogoTiro = CA2_CarregaEfeito("sons/tiro1.ogg");
    //som da explosao
    som_explosao = CA2_CarregaEfeito("sons/explo.ogg");
	//blip do game over...
	blip= CA2_CarregaEfeito("./sons/blip.wav");
	
	barras_cover=C2D2_CarregaSpriteSet("sprites/barras_cover.png", 800, 303);
	barra_vida=C2D2_CarregaSpriteSet("sprites/barra_vida.png", 0, 0);
	barra_escudo=C2D2_CarregaSpriteSet("sprites/barra_escudo.png", 0, 0);
}

void RemoveRecursos() {
    // Remove a fonte da memória
    C2D2_RemoveFonte(fonte);
    // Remove os personagens
    C2D2_RemoveSpriteSet(spx85);
    C2D2_RemoveSpriteSet(spTiro);
    C2D2_RemoveSpriteSet(escudo);
	//argus
    C2D2_RemoveSpriteSet(barras_cover);

}

int TelaJogo() {
    C2D2_Botao *teclado = C2D2_PegaTeclas();
    C2D2_Mouse *mouse = C2D2_PegaMouse();
    Personagem jogador = {X85, 100, 0, 0, 0, 0, 0};
    Personagem explo = {EXPLOSAO, 0, 0, 0, 0, 0, 0};
    Personagem inimigo1[MAXINIMIGOS];
    Personagem inimigo2[MAXINIMIGOS];
    Personagem inimigo3[MAXINIMIGOS];
    Personagem inimigo4[MAXINIMIGOS];
    Personagem meteoro[MAXINIMIGOS];
    Personagem energia[MAXINIMIGOS];
    //Personagem tiroinimigo[MAXINIMIGOS];
    Personagem pegaescudo[MAXINIMIGOS];
    /*for(int i=0;i<MAXINIMIGOS;i++)
    {
            tiroinimigo[i].tipo=INVALIDO;
            tiroinimigo[i].dx=180;
    }*/
    tempoescudo = 120;
    Personagem tiro[20] = {
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180},
        { INVALIDO, 0, 0, 180}
    };
    bool PAUSE = false;
    int tempotiro = 0;
    int x = 60, y = 60;
    // As coordenadas do mapa
    int xmapa = 0, ymapa = 6000;
    // Procura saber quantos inimigos tem na fase
    int contadorin = 0;
    //zera variavel de pontos
    score = 0;
    //Velocidade das camadas...
    C2D2M_VelocidadeCamadaMapa(mapa, 0, 1);
    C2D2M_CamadaMarcas(mapa, 0, 1);
    C2D2M_PrimeiroBlocoMarca(mapa, C2D2M_INICIO, &x, &y);
    jogador.x = x;
    jogador.y = y - ymapa;
    int xfinal, yfinal;
    C2D2M_PrimeiroBlocoMarca(mapa, C2D2M_FIM, &xfinal, &yfinal);
    // Deixa as estrelas em posições aleatórias na tela
    for (int i = 0; i < 50; i++) {

        estrelas[i][0] = rand() % 800;
        estrelas[i][1] = rand() % 600;

        estrelas2[i][0] = rand() % 800;
        estrelas2[i][1] = rand() % 600;
    }
    //Zera Inimigos
    for (int i = 0; i < MAXINIMIGOS; i++) {
        inimigo1[i].tipo = INVALIDO;
        inimigo1[i].energia = 100;
        inimigo2[i].tipo = INVALIDO;
        inimigo2[i].energia = 100;
        inimigo3[i].tipo = INVALIDO;
        inimigo3[i].energia = 100;
        inimigo4[i].tipo = INVALIDO;
        inimigo4[i].energia = 100;
        meteoro[i].tipo = INVALIDO;
        meteoro[i].energia = 100;
        energia[i].tipo = INVALIDO;
        pegaescudo[i].tipo = INVALIDO;
    }
    //Conta quantos inimigos tem no mapa
    //INIMIGO VERDE ... Inimigo1 Procura no mapa e seta o tipo do personagem
    if (C2D2M_PrimeiroBlocoMarca(mapa, INIMIGO1, &inimigo1[contadorin].x, &inimigo1[contadorin].y)) {
        while (C2D2M_ProximoBlocoMarca(mapa, &inimigo1[contadorin].x, &inimigo1[contadorin].y)) {
            inimigo1[contadorin].tipo = INIMIGO_VERDE;
            contadorin++;
        }
        contadorin = 0;
    }
    //INIMIGO VERMELHO ... Inimigo2 Procura no mapa e seta o tipo do personagem
    if (C2D2M_PrimeiroBlocoMarca(mapa, INIMIGO2, &inimigo2[contadorin].x, &inimigo2[contadorin].y)) {
        while (C2D2M_ProximoBlocoMarca(mapa, &inimigo2[contadorin].x, &inimigo2[contadorin].y)) {
            inimigo2[contadorin].tipo = INIMIGO_VERMELHO;
            contadorin++;
        }
        contadorin = 0;
    }

    //INIMIGO 3 ... Inimigo 3 Procura no mapa e seta o tipo
    if (C2D2M_PrimeiroBlocoMarca(mapa, INIMIGO3, &inimigo3[contadorin].x, &inimigo3[contadorin].y)) {
        while (C2D2M_ProximoBlocoMarca(mapa, &inimigo3[contadorin].x, &inimigo3[contadorin].y)) {
            inimigo3[contadorin].tipo = INIMIGO03;
            contadorin++;
        }
        contadorin = 0;
    }
    //INIMIGO 4 ... Inimigo 4 Procura no mapa e seta o tipo
    if (C2D2M_PrimeiroBlocoMarca(mapa, INIMIGO4, &inimigo4[contadorin].x, &inimigo4[contadorin].y)) {
        while (C2D2M_ProximoBlocoMarca(mapa, &inimigo4[contadorin].x, &inimigo4[contadorin].y)) {
            inimigo4[contadorin].tipo = INIMIGO04;
            contadorin++;
        }
        contadorin = 0;
    }
    //METEORO ... METEORO Procura no mapa e seta o tipo
    if (C2D2M_PrimeiroBlocoMarca(mapa, TIPOMETEORO, &meteoro[contadorin].x, &meteoro[contadorin].y)) {
        while (C2D2M_ProximoBlocoMarca(mapa, &meteoro[contadorin].x, &meteoro[contadorin].y)) {
            meteoro[contadorin].tipo = METEORO;
            contadorin++;
        }
        contadorin = 0;
    }
    //ENERGIA Procura no mapa e seta o tipo
    if (C2D2M_PrimeiroBlocoMarca(mapa, ENERGIA, &energia[contadorin].x, &energia[contadorin].y)) {
        while (C2D2M_ProximoBlocoMarca(mapa, &energia[contadorin].x, &energia[contadorin].y)) {
            energia[contadorin].tipo = ENERGY;
            contadorin++;
        }
        contadorin = 0;
    }
    //ESCUDO Procura no mapa e seta o tipo
    if (C2D2M_PrimeiroBlocoMarca(mapa, M_ESCUDO, &pegaescudo[contadorin].x, &pegaescudo[contadorin].y)) {
        while (C2D2M_ProximoBlocoMarca(mapa, &pegaescudo[contadorin].x, &pegaescudo[contadorin].y)) {
            pegaescudo[contadorin].tipo = ESCUDO;
            contadorin++;
        }
        contadorin = 0;
    }

    //int ContTiroInimigo=0;
    //toca musica
    CA2_TocaMusica(musica_jogo, 999);
    x = 0;
    //energia do jogador
    jogador.energia = 120;
    int fim = 0;
    //roda jogo...
    while (estadoJogo == TELA_JOGO && !teclado[C2D2_ESC].pressionado && !teclado[C2D2_ENCERRA].ativo) {

        C2D2_LimpaTela();

        if (teclado[C2D2_P].pressionado) {
            PAUSE = !PAUSE;
        }

        if (PAUSE == false) {



            //variavel que controla animacao de alguns personagens
            control++;
            control2++;
            //variavel de controle do tiro do inimigo
            /*ContTiroInimigo++;
            if(ContTiroInimigo==50)
            {
                    for(int i=0;i<MAXINIMIGOS;i++)
                            for(int j=0;j<MAXINIMIGOS;j++)
                                    CriaTiro(&tiroinimigo[i],&inimigo1[j],ymapa);
                    ContTiroInimigo=0;
            }
            for(int i=0;i<MAXINIMIGOS;i++)
                    for(int j=0;j<MAXINIMIGOS;j++)
                            AtualizaTiroInimigo (&tiroinimigo[i],&inimigo1[j]);*/
            //Variavel que faz com que o mapa desloque pela tela
            ymapa -= 1.1;
            //funcao que desenha as estrelas
            AtualizaEstrelas();
            //funcao para atualizar inimigos

            for (int i = 0; i < MAXINIMIGOS; i++) {
                AtualizaInimigo(&inimigo1[i]);
                AtualizaInimigo(&inimigo2[i]);
                AtualizaInimigo(&inimigo3[i]);
                AtualizaInimigo(&inimigo4[i]);
                AtualizaInimigo(&meteoro[i]);
                AtualizaInimigo(&energia[i]);
            }

            // Posiciona o mapa
            C2D2M_PosicionaMapa(mapa, xmapa, ymapa);

            // Roda a lógica dos personagens
            AtualizaJogador(&jogador);
            //faz lógica fundo animado
            if (ypersf1 > 0) {
                ypersf1 = -1120;
            }
            if (ypersf2 > 1120) {
                ypersf2 = 0;
            }
            ypersf1 += 0.5;
            ypersf2 += 0.5;

            //funcao para atualizar tiro
            for (int i = 0; i < 20; i++) {
                if (tiro[i].tipo == TIRO)
                    AtualizaTiro(&tiro[i]);
            }
            //variavel de controle do tiro(tempo entre cada tiro)
            if (tempotiro > 0)
                tempotiro--;
            // Testa se pode atirar
            if (mouse->botoes[C2D2_MESQUERDO].ativo && tempotiro == 0 && jogador.tipo == X85) {
                for (int i = 0; i < 20; i++) {
                    if (tiro[i].tipo == INVALIDO && jogador.tipo == X85) {
                        tempotiro = 6;
                        CriaTiro(&tiro[i], &jogador, ymapa);
                        break;
                    }
                }
            }
            //testa colisao tiro inimigo1 
            for (int i = 0; i < 20; i++) {
                for (int j = 0; j < MAXINIMIGOS; j++) {
                    if (ColidiuPersonagemInimigo(&tiro[i], &inimigo1[j], ymapa)) {
                        if (inimigo1[j].energia <= 0) {
                            explo.quadro = 0;
                            CriaExplosao(&explo, inimigo1[j].x, inimigo1[j].y - ymapa);
                            CA2_TocaEfeito(som_explosao, 0);
                            explo.x = inimigo1[j].x;
                            explo.y = inimigo1[j].y;
                            inimigo1[j].tipo = INVALIDO;
                            if (explo.quadro == 70)
                                inimigo1[j].tipo = INVALIDO;
                            score = score + 100;
                        }
                    }
                }
            }
            //testa colisao tiro inimigo2
            for (int i = 0; i < 20; i++) {
                for (int j = 0; j < MAXINIMIGOS; j++) {
                    if (ColidiuPersonagemInimigo(&tiro[i], &inimigo2[j], ymapa)) {
                        if (inimigo2[j].energia <= 0) {
                            explo.quadro = 0;
                            CriaExplosao(&explo, inimigo2[j].x, inimigo2[j].y - ymapa);
                            CA2_TocaEfeito(som_explosao, 0);
                            explo.x = inimigo2[j].x;
                            explo.y = inimigo2[j].y;
                            inimigo2[j].tipo = INVALIDO;
                            if (explo.quadro == 7)
                                inimigo2[j].tipo = INVALIDO;
                            score = score + 150;
                        }
                    }
                }
            }
            //testa colisao tiro meteoro
            for (int i = 0; i < 20; i++) {
                for (int j = 0; j < MAXINIMIGOS; j++) {
                    if (ColidiuPersonagemInimigo(&tiro[i], &meteoro[j], ymapa)) {
                        if (meteoro[j].energia <= 0) {
                            explo.quadro = 0;
                            CriaExplosao(&explo, meteoro[j].x, meteoro[j].y - ymapa);
                            CA2_TocaEfeito(som_explosao, 0);
                            explo.x = meteoro[j].x;
                            explo.y = meteoro[j].y;
                            meteoro[j].tipo = INVALIDO;
                            if (explo.quadro == 7)
                                meteoro[j].tipo = INVALIDO;
                            score = score + 200;
                        }
                    }
                }
            }
            //testa colisao nave inimigo
            for (int j = 0; j < MAXINIMIGOS; j++) {
                if(jogador.tipo==X85)
				if (ColidiuPersonagemInimigo(&jogador, &inimigo1[j], ymapa))
				{
					if (morte == 1)
                        jogador.energia -= 15;
                    inimigo1[j].tipo = INVALIDO;
                    explo.quadro = 0;
                    CriaExplosao(&explo, inimigo1[j].x, inimigo1[j].y - ymapa);
                    CA2_TocaEfeito(som_explosao, 0);
                    explo.x = inimigo1[j].x;
                    explo.y = inimigo1[j].y;
                    if (jogador.energia <= 0) {
                        jogador.tipo = EXPLOSAO;
                        GameOver(score);
                        return 0;
                    }
                }
            }
            //testa colisao nave inimigo
            for (int j = 0; j < MAXINIMIGOS; j++) {
                if (ColidiuPersonagemInimigo(&jogador, &inimigo2[j], ymapa)) {
                    if (morte == 1)
                        jogador.energia -= 15;
                    score = score + 150;
                    explo.quadro = 0;
                    CriaExplosao(&explo, inimigo2[j].x, inimigo2[j].y - ymapa);
                    CA2_TocaEfeito(som_explosao, 0);
                    explo.x = inimigo2[j].x;
                    explo.y = inimigo2[j].y;
                    inimigo2[j].tipo = INVALIDO;
                    if (explo.quadro == 7)
                        inimigo2[j].tipo = INVALIDO;
                    if (jogador.energia <= 0) {
                        jogador.tipo = EXPLOSAO;
                        GameOver(score);
                        return 0;
                    }
                }
            }
            //testa colisao nave meteoro
            for (int j = 0; j < MAXINIMIGOS; j++) {
                if (ColidiuPersonagemInimigo(&jogador, &meteoro[j], ymapa)) {
                    if (morte == 1)
                        jogador.energia -= 30;
                    score = score + 200;
                    explo.quadro = 0;
                    CriaExplosao(&explo, meteoro[j].x, meteoro[j].y - ymapa);
                    CA2_TocaEfeito(som_explosao, 0);
                    explo.x = meteoro[j].x;
                    explo.y = meteoro[j].y;
                    meteoro[j].tipo = INVALIDO;
                    if (explo.quadro == 7)
                        meteoro[j].tipo = INVALIDO;
                    if (jogador.energia <= 0) {
                        jogador.tipo = EXPLOSAO;
                        GameOver(score);
                        return 0;
                    }
                }
            }
            //colidiu nave energia
            for (int j = 0; j < MAXINIMIGOS; j++) {
                if (ColidiuPersonagemInimigo(&jogador, &energia[j], ymapa))
                    energia->tipo = INVALIDO;
            }
            //colidiu nave pegaescudo
            for (int i = 0; i < MAXINIMIGOS; i++) {
                if (ColidiuPersonagemInimigo(&jogador, &pegaescudo[i], ymapa))
                    tempoescudo = 120;
            }
            //escudo
            if (mouse->botoes[C2D2_MDIREITO].ativo && tempoescudo >= 0) {
                tempoescudo--;
                morte = 0;
            }
        }

        AtualizaExplosao(&explo);
        // Desenha as fundo animado
        C2D2_DesenhaSprite(fundo, 0, 0, ypersf1);
        C2D2_DesenhaSprite(fundo, 0, 0, ypersf2);
        // Desenha as estrelas
        C2D2P_Pontos(estrelas2, 50, 200, 200, 200);
        C2D2P_Pontos(estrelas, 50, 255, 255, 255);
        //C2D2M_DesenhaCamadaMapa(mapa,0,0,0,JANELA_MAPA_X,JANELA_MAPA_Y);
        //pause
        if (PAUSE == true)
            C2D2_DesenhaTexto(fonte, 400, 300, "PAUSE", C2D2_TEXTO_CENTRALIZADO);


        //argus -  desenha barras de vida e escudo
         C2D2_DesenhaSprite(barras_cover,1,0,10);
        DesenhaSprite(barra_vida,0,0,240,54,(-altura_vida*166/100),255,255,255,255);
        DesenhaSprite(barra_escudo,0,746,240,54,(-altura_escudo*166/100),255,255,255,255);
        C2D2_DesenhaSprite(barras_cover,0,0,10);
        
        //argus - lógica barras de vida e energia ( valores invertidos para barra crescer pra cima )
        if(altura_escudo<tempoescudo*100/120)
        	altura_escudo+=2;
        if(altura_escudo>tempoescudo*100/120)
		altura_escudo-=2;

        if(altura_vida< jogador.energia*100/120)
        	altura_vida+=2;
        if(altura_vida> jogador.energia*100/120)
        	altura_vida-=2;
        

	/////
        for (int i = 0; i < MAXINIMIGOS; i++) {
            if (inimigo1[i].tipo == INIMIGO_VERDE)
                C2D2_DesenhaSprite(spinimigo1, 0, inimigo1[i].x, inimigo1[i].y - ymapa);
            if (inimigo2[i].tipo == INIMIGO_VERMELHO)
                C2D2_DesenhaSprite(spinimigo2, 0, inimigo2[i].x, inimigo2[i].y - ymapa);
        }
        //tiroinimigo
        //for(int i=0;i<MAXINIMIGOS;i++)
        //C2D2_DesenhaSprite(spTiro,0,tiroinimigo[i].x,tiroinimigo[i].y-ymapa);

        //explosao
        if (explo.tipo == EXPLOSAO)
            C2D2_DesenhaSprite(explosao_jogador, explo.quadro, explo.x, explo.y - ymapa);
            
        // DEsenha os personagens
        DesenhaPersonagem(&jogador, ymapa);
        for (int i = 0; i < 20; i++) {
            if (tiro[i].tipo == TIRO)
                DesenhaPersonagem(&tiro[i], ymapa);
        }
        
        //Desenha Energia
        for (int i = 0; i < MAXINIMIGOS; i++) {
            if (energia[i].tipo == ENERGY)
                DesenhaPersonagem(&energia[i], ymapa);
        }
        //Desenha PegaEscudo
        for (int i = 0; i < MAXINIMIGOS; i++) {
            if (pegaescudo[i].tipo == ESCUDO)
                DesenhaPersonagem(&pegaescudo[i], ymapa);
        }
        //Desenha Meteoro
        for (int i = 0; i < MAXINIMIGOS; i++)
            if (meteoro[i].tipo == METEORO)
                DesenhaPersonagem(&meteoro[i], ymapa);
        //Tiro Inimigo
        /*		for(int i=0;i<MAXINIMIGOS;i++)
                        {
                                if(tiroinimigo[i].tipo==TIRO)
                                        DesenhaPersonagem (&tiroinimigo[i],ymapa);
                        }*/
        //Desenha o escudo
        if (morte == 0 && tempoescudo > 0)
            C2D2_DesenhaSprite(escudo, 0, jogador.x, jogador.y);
        //Mensagem final do jogo
        if (ymapa < 0) {
            C2D2_DesenhaTexto(fonte, 400, 300, "Congratulations !!!", C2D2_TEXTO_CENTRALIZADO);
            fim++;
            if (fim > 360) {
                GameOver(score);
                return 0;
            }

        }
        //Desenha pontos e vidas
        sprintf(spontos, "Pontos:%09i", score);
        C2D2_DesenhaTexto(fonte, 0, 0, spontos, C2D2_TEXTO_ESQUERDA);
        // Anima o mapa
        //C2D2M_AnimaMapa(mapa);
        C2D2_Sincroniza();

        if (teclado[C2D2_ESC].pressionado)
            printf("Pressionou ESC.\n:");
    }
    jogador.energia = 120;
    control = 0;
    tempoescudo = 120;
    return 0;
}

void AtualizaEstrelas() {
    // Faz a lógica das estrelas ( camada 1 e 2 )
    for (int i = 0; i < 50; i++) {
        // Testa se saiu fora da tela (segunda camada )
        if ((estrelas[i][1] += 6) > 599) {
            estrelas[i][1] = rand() % 1;
            estrelas[i][0] = rand() % 808;
        }
    }

    for (int i = 0; i < 50; i++) {
        // Testa se saiu fora da tela 
        if ((estrelas2[i][1] += 3) > 599) {
            estrelas2[i][1] = rand() % 1;
            estrelas2[i][0] = rand() % 800;
        }
    }


}

void AtualizaJogador(Personagem *jogador) {
    // Variável estática, cria e inicia apenas uma vez, na segunda vez que chama a função, pega o valor anterior
    static C2D2_Botao *teclado = C2D2_PegaTeclas();
    static C2D2_Mouse *mouse = C2D2_PegaMouse();
        jogador->x = mouse->x;
        jogador->y = mouse->y;

    //escudo
    if (mouse->botoes[C2D2_MDIREITO].ativo && tempoescudo >= 0)
        morte = 0;
    else
        morte = 1;
}

void CriaInimigo(Personagem *inimigo, int tipos, int x, int y) {
    for (int i = 0; i < MAXINIMIGOS; i++) {
        if (inimigo[i].tipo == INVALIDO) {
            inimigo[i].y = y;
            inimigo[i].x = x;
            inimigo[i].tipo = tipos;
        }
    }
}

void AtualizaInimigo(Personagem *inimigo) {
    if (inimigo->tipo == INIMIGO_VERDE || inimigo->tipo == INIMIGO_VERMELHO) {
        if (control == 49)
            control = 0;
        if (control < 23 && control % 2 == 0 && inimigo->x < 400)
            inimigo->x--;
        else if (control < 23 && control % 2 == 0 && inimigo->x >= 400)
            inimigo->x++;
        else if (control > 25 && control % 2 == 0 && inimigo->x < 400)
            inimigo->x++;
        else if (control > 25 && control % 2 == 0 && inimigo->x >= 400)
            inimigo->x--;

    }

}

// Função para atualizar a posição de um tiro

void AtualizaTiro(Personagem *tiro) {
    if (tiro->y < 0)
        tiro->tipo = INVALIDO;
    else {
        // Calcula a posição do tiro
        tiro->y -= 10;

    }
}

void AtualizaTiroInimigo(Personagem *tiro, Personagem *inimigo) {
    //if(tiro->y>600)
    //tiro->tipo = INVALIDO;
    //else
    tiro->y -= 8;

}
//Funcao que cria o tiro

void CriaTiro(Personagem *tiro, Personagem *jogador, int ymapa) {
    // Só pode atirar se o tipo do tiro for INVALIDO

    if (tiro->tipo == INVALIDO) {
        // Coloca o tiro como válido
        tiro->tipo = TIRO;
        // Pega a posição do centro da nave para o tiro
        if (jogador->tipo == X85)
            tiro->x = jogador->x + 40;
        else if (jogador->tipo == INIMIGO_VERDE || jogador->tipo == INIMIGO_VERMELHO)
            tiro->x = jogador->x - 40;
        if (jogador->tipo == INIMIGO_VERDE || jogador->tipo == INIMIGO_VERMELHO)
            tiro->y = jogador->y - ymapa;
        else
            tiro->y = jogador->y;
        // Armazena a distância já percorrida pelo tiro
        tiro->dx = 0;
        // Enfim, toca o efeito sonoro
        CA2_TocaEfeitoTela(jogoTiro, jogador->x);
    }

}

void DesenhaPersonagem(Personagem *pers, int ymapa) {
    int sprite;
    // Determina o sprite que vai desenhar
    switch (pers->tipo) {
        case X85:
            sprite = spx85;
            break;
        case TIRO:
            sprite = spTiro;
            break;
        case INIMIGO_VERDE:
            sprite = spinimigo1;
            break;
        case INIMIGO_VERMELHO:
            sprite = spinimigo2;
            break;
        case METEORO:
            sprite = spMeteoros;
            break;
        case EXPLOSAO:
            sprite = explosao_jogador;
            break;
        case ENERGY:
            sprite = itens;
            break;
        case ESCUDO:
            sprite = itens;
            break;
        default:
            return;
    }

    if (pers->tipo == METEORO)
        pers->quadro++;
    else
        pers->quadro = 0;
    if (pers->tipo == METEORO && pers->quadro > 49)
        pers->quadro = 0;

    if (pers->tipo == X85)
        C2D2_DesenhaSprite(sprite, tiponave, pers->x, pers->y);
    else C2D2_DesenhaSprite(sprite, 0, pers->x, pers->y);
    if (pers->tipo == EXPLOSAO || pers->tipo == ENERGY || pers->tipo == METEORO)
        C2D2_DesenhaSprite(sprite, pers->quadro / 7, pers->x, pers->y - ymapa);
    if (pers->tipo == ESCUDO)
        C2D2_DesenhaSprite(sprite, 1, pers->x, pers->y - ymapa);
}

//funcao que testa colisao entre personagens

bool ColidiuPersonagemInimigo(Personagem *pers, Personagem *inim, int ymapa) {
    unsigned int spPers, spInim;
    // Recupera o sprite do personagem
    switch (pers->tipo) {
        case X85:
            spPers = spx85;
            break;
        case TIRO:
            spPers = spTiro;
            break;
        default:
            return false;
    }
    // Recupera o sprite do geometróide
    switch (inim->tipo) {
        case INIMIGO_VERDE:
            spInim = spinimigo1;
            break;
        case INIMIGO_VERMELHO:
            spInim = spinimigo2;
            break;
        case ENERGY:
            spInim = itens;
            break;
        case ESCUDO:
            spInim = itens;
            break;
        case METEORO:
            spInim = spMeteoros;
            break;
        default:
            return false;
    }
    // testa se colidiu
    if (inim->tipo == INIMIGO_VERDE || inim->tipo == INIMIGO_VERMELHO || inim->tipo == METEORO) {
        if (C2D2_ColidiuSprites(spPers, 0, pers->x, pers->y,
                spInim, 0, inim->x, inim->y - ymapa)) {

            if (pers->tipo != X85)
                pers->tipo = INVALIDO;
            if (inim->tipo == INIMIGO_VERDE)
                inim->energia -= 100;
            if (inim->tipo == INIMIGO_VERMELHO)
                inim->energia -= 50;
            if (inim->tipo == METEORO)
                inim->energia -= 25;
            return true;
        }
    } else if (inim->tipo == ENERGY) {
        if (C2D2_ColidiuSprites(spPers, 0, pers->x, pers->y, spInim, 0, inim->x, inim->y - ymapa)) {
            if (inim->tipo == ENERGY)
                inim->tipo = INVALIDO;
            if (pers->energia <= 90)
                pers->energia += 30;
            else
                pers->energia = 120;
            return true;
        }
    } else if (inim->tipo == ESCUDO) {
        if (C2D2_ColidiuSprites(spPers, 0, pers->x, pers->y, spInim, 1, inim->x, inim->y - ymapa)) {
            inim->tipo = INVALIDO;
            return true;
        }
    }// testa se colidiu
    else
        return false;
}

void CriaExplosao(Personagem *pers, int x, int y) {
    pers->tipo = EXPLOSAO;
    pers->x = x;
    pers->y = y;
}

void AtualizaExplosao(Personagem *pers) {
    pers->quadro++;
    if (pers->quadro >= 8 && pers->tipo == EXPLOSAO) {
        pers->tipo = INVALIDO;
        pers->quadro = 0;
    }
}

int mainjogo(int nave, int fase) {

    printf("iniciou biblioteca dos mapas");
    tiponave = nave;
    tipofase = fase;
    // Carrega os recursos do jogo
    CarregaRecursos();
    TelaJogo();
    recordesInsere(score);
    // Remove os recursos do jogo
    RemoveRecursos();
    // Encerra
    return 0;
}

