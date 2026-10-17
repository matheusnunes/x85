#include "funcoes_J.h"
#include "funcoes_M.h" //para fazer os autocomplementos tive que por aqui .. mas ainda ta no _J.h !

//coisas do load
unsigned int loading;
unsigned int ready;

//fundos
unsigned int spFundo;
//Fase
Fase fase;
//nave e sprites em geral
unsigned int spX85;
unsigned int spFlame;
unsigned int spExplo;
//vetor de sprites tiros
unsigned int spTiro[30];
unsigned int spMarca[40];

//interface e cia ( barras e frescuras )
unsigned int barras_energy;
unsigned int barras_bomba;
unsigned int barras_back;
unsigned int barra_informacao;

//fonte
unsigned int fontejogo;

//vetor de sons de tiros e bombas
unsigned int somTiro[10];
unsigned int somExplo;

void jogo_exibe_informacao(int tipo);


void jogo_carrega()
{
    //pega teclado para sair com espaço
	C2D2_Botao *teclado = C2D2_PegaTeclas();

    loading = C2D2_CarregaSpriteSet("./dados/jogo/loading.jpg",0,0);
    ready = C2D2_CarregaSpriteSet("./dados/jogo/ready.png",0,0);
    C2D2_LimpaTela();
	C2D2_DesenhaSprite(loading,0,0,0);
	C2D2_Sincroniza();

    switch(saveAtual.planeta_atual)
    {
        case 0:fase.mapa = C2D2M_CarregaMapaMappy("dados/jogo/mapas/fase1.fmp", "dados/jogo/mapas/tileset.png");break;
        case 1:fase.mapa = C2D2M_CarregaMapaMappy("dados/jogo/mapas/fase2.fmp", "dados/jogo/mapas/tileset.png");break;
        case 2:fase.mapa = C2D2M_CarregaMapaMappy("dados/jogo/mapas/fase3.fmp", "dados/jogo/mapas/tileset.png");break;
        case 3:fase.mapa = C2D2M_CarregaMapaMappy("dados/jogo/mapas/fase4.fmp", "dados/jogo/mapas/tileset.png");break;
        case 4:fase.mapa = C2D2M_CarregaMapaMappy("dados/jogo/mapas/fase5.fmp", "dados/jogo/mapas/tileset.png");break;
        case 5:fase.mapa = C2D2M_CarregaMapaMappy("dados/jogo/mapas/fase6.fmp", "dados/jogo/mapas/tileset.png");break;
        case 6:fase.mapa = C2D2M_CarregaMapaMappy("dados/jogo/mapas/fase7.fmp", "dados/jogo/mapas/tileset.png");break;
        case 7:fase.mapa = C2D2M_CarregaMapaMappy("dados/jogo/mapas/fase8.fmp", "dados/jogo/mapas/tileset.png");break;
    }

    spFundo = C2D2_CarregaSpriteSet("./dados/jogo/fundo1.jpg",0,0);
	spX85 = C2D2_CarregaSpriteSet("./dados/jogo/nave.png",60,60);
    spFlame = C2D2_CarregaSpriteSet("./dados/jogo/flame.png",40,40);
    spExplo = C2D2_CarregaSpriteSet("./dados/jogo/explo.png",0,0);

	spTiro[TIRO1] = C2D2_CarregaSpriteSet("./dados/jogo/tiros/tiro1.png",0,0);
	spTiro[TIRO2] = C2D2_CarregaSpriteSet("./dados/jogo/tiros/tiro2.png",0,0);
	spTiro[TIRO3] = C2D2_CarregaSpriteSet("./dados/jogo/tiros/tiro3.png",0,0);
	spTiro[TIRO4] = C2D2_CarregaSpriteSet("./dados/jogo/tiros/tiro4.png",0,0);
	spTiro[TIRO5] = C2D2_CarregaSpriteSet("./dados/jogo/tiros/tiro5.png",0,0);
    spTiro[TIRO6] = C2D2_CarregaSpriteSet("./dados/jogo/tiros/tiro6.png",0,0);
	spTiro[BOMBA1] = C2D2_CarregaSpriteSet("./dados/jogo/tiros/bomba.png",0,0);
	spTiro[TIROINI1] = C2D2_CarregaSpriteSet("./dados/jogo/tiros/tiroini1.png",0,0);
	spTiro[TIROINI2] = C2D2_CarregaSpriteSet("./dados/jogo/tiros/tiroini2.png",0,0);
	spTiro[TIROINI3] = C2D2_CarregaSpriteSet("./dados/jogo/tiros/tiroini3.png",0,0);

	spMarca[INIMIGO1] = C2D2_CarregaSpriteSet("./dados/jogo/inimigos/inim1.png",0,0);
	spMarca[INIMIGO2] = C2D2_CarregaSpriteSet("./dados/jogo/inimigos/inim2.png",0,0);
	spMarca[INIMIGO3] = C2D2_CarregaSpriteSet("./dados/jogo/inimigos/inim3.png",0,0);
	spMarca[INIMIGO4] = C2D2_CarregaSpriteSet("./dados/jogo/inimigos/inim4.png",0,0);
	spMarca[METEORO] = C2D2_CarregaSpriteSet("./dados/jogo/inimigos/meteoro.png",75,75);
	spMarca[BOSS1] = C2D2_CarregaSpriteSet("./dados/jogo/inimigos/boss1.png",0,0);
	spMarca[BOSS2] = C2D2_CarregaSpriteSet("./dados/jogo/inimigos/boss2.png",0,0);
	spMarca[BOSS3] = C2D2_CarregaSpriteSet("./dados/jogo/inimigos/boss3.png",0,0);
	spMarca[BOSS4] = C2D2_CarregaSpriteSet("./dados/jogo/inimigos/boss4.png",0,0);
	spMarca[BOSS5] = C2D2_CarregaSpriteSet("./dados/jogo/inimigos/boss5.png",0,0);

//  spMarca[ENERGIA] = C2D2_CarregaSpriteSet("./dados/jogo/inim.png",0,0);
//  spMarca[ESCUDO] = C2D2_CarregaSpriteSet("./dados/jogo/inim.png",0,0);
    spMarca[T1] = C2D2_CarregaSpriteSet("./dados/jogo/itens/T1.png",0,0);
    spMarca[T2] = C2D2_CarregaSpriteSet("./dados/jogo/itens/T2.png",0,0);
    spMarca[T3] = C2D2_CarregaSpriteSet("./dados/jogo/itens/T3.png",0,0);
    spMarca[T4] = C2D2_CarregaSpriteSet("./dados/jogo/itens/T4.png",0,0);
    spMarca[T5] = C2D2_CarregaSpriteSet("./dados/jogo/itens/T5.png",0,0);
    spMarca[T6] = C2D2_CarregaSpriteSet("./dados/jogo/itens/T6.png",0,0);


	barras_energy = C2D2_CarregaSpriteSet("./dados/jogo/barras_energy.png",0,0);
	barras_bomba = C2D2_CarregaSpriteSet("./dados/jogo/barras_bomba.png",0,0);
	barras_back = C2D2_CarregaSpriteSet("./dados/jogo/barras_back.png",0,0);
    barra_informacao = C2D2_CarregaSpriteSet("./dados/jogo/barra_inf.png",0,0);

    //fonte
    fontejogo = C2D2_CarregaFonte("./dados/menu/512.png", 32);


/*---------------- EFEITOS E MUSICAS -------------------------------------------------*/

    somExplo= CA2_CarregaEfeito("./dados/sons/explo.wav");
	somTiro[TIRO1]= CA2_CarregaEfeito("./dados/sons/tiro1.wav");
    somTiro[TIRO2]= CA2_CarregaEfeito("./dados/sons/tiro2.wav");
//	somTiro[TIRO4]= CA2_CarregaEfeito("./dados/sons/tiro1.wav");
//	somTiro[TIRO6]= CA2_CarregaEfeito("./dados/sons/tiro1.wav");
	somTiro[BOMBA1]= CA2_CarregaEfeito("./dados/sons/bomba.wav");


	// põe o "espaço para continuar"
	C2D2_DesenhaSprite(ready,0,180,440);


	while(1)
	{
	    if(teclado[C2D2_ESPACO].pressionado)break;
        C2D2_Sincroniza();
	}
}

int jogo_tela()
{
    float yfundo1=0;
	float yfundo2=0;

	int quadroFlame=24;

	int altura_energia=0;
    int contadormarcas=0;

    int contadorfinal=0;
    //variaveis para saveAtual.pts
    char spontos[30];
    int temp_pts=0;

    //variavel para controle de exibicao de informacao na tela
    int informacao=-1;

    jogo_carrega();

	C2D2_Botao *teclado = C2D2_PegaTeclas();
	C2D2_Mouse *mouse = C2D2_PegaMouse();

	//mapa & marcas
	C2D2M_VelocidadeCamadaMapa(fase.mapa, 0, 1);
	C2D2M_CamadaMarcas(fase.mapa, 0, 1);
    C2D2M_PosicionaMapa(fase.mapa,0,fase.yinicio);
	C2D2M_PrimeiroBlocoMarca(fase.mapa, C2D2M_INICIO, &fase.xinicio, &fase.yinicio);
	C2D2M_PrimeiroBlocoMarca(fase.mapa, C2D2M_FIM, &fase.xfinal, &fase.yfinal);
    fase.ymapa = fase.yinicio;


    //Declaracao de Personagens , itens e tiros
	Nave jogador;
	Tiro tiros[MAXTIROS];
    Marca marcas[MAXMARCAS];
    Explo explos[MAXEXPLOS];
    Marca *Boss=0;

    //inicia jogador, marcas e tiros
	jogo_inicia_jogador(&jogador);
	jogador.sprite = spX85;
	memset(tiros,INVALIDO,sizeof(Tiro)*MAXTIROS);
	memset(marcas,INVALIDO,sizeof(Marca)*MAXMARCAS);
    memset(explos,INVALIDO,sizeof(Explo)*MAXEXPLOS);

    jogo_procura_marca(fase.mapa,M_INIMIGO1,marcas,contadormarcas);
    jogo_procura_marca(fase.mapa,M_INIMIGO2,marcas,contadormarcas);
    jogo_procura_marca(fase.mapa,M_INIMIGO3,marcas,contadormarcas);
    jogo_procura_marca(fase.mapa,M_INIMIGO4,marcas,contadormarcas);
    jogo_procura_marca(fase.mapa,M_METEORO,marcas,contadormarcas);
    jogo_procura_marca(fase.mapa,M_BOSS,marcas,contadormarcas);
    jogo_procura_marca(fase.mapa,M_T1,marcas,contadormarcas); // não tem nenhuma no mapa, mas se não por da pau no T6
    jogo_procura_marca(fase.mapa,M_T2,marcas,contadormarcas);
    jogo_procura_marca(fase.mapa,M_T3,marcas,contadormarcas);
    jogo_procura_marca(fase.mapa,M_T4,marcas,contadormarcas);
    jogo_procura_marca(fase.mapa,M_T5,marcas,contadormarcas);
    jogo_procura_marca(fase.mapa,M_T6,marcas,contadormarcas);
    for(int i=0; i<MAXMARCAS;i++)
		if(marcas[i].tipo>=BOSS1 && marcas[i].tipo<=BOSS5)
        {
            Boss = &marcas[i];
            break;
        }

	C2D2P_Ponto estrelas[MAXSTARS];
	jogo_cria_estrela(estrelas,MAXSTARS);

	while(!encerra)
	{
		if(estado_atual != TELA_JOGO)
			encerra=1;

		if(teclado[C2D2_ESC].pressionado)
			estado_atual=TELA_MISSION;

		if(Boss->tipo == INVALIDO || jogador.energia<=0)
        {
			//lógica de liberação de fases e save só entra uma vez
  			if(contadorfinal==0)
			{
				//matou o boss.. pasou de fase
				if(Boss->energia<=0 )
				{
					if((saveAtual.planeta_liberado == saveAtual.planeta_atual) && saveAtual.planeta_liberado < 4)
						saveAtual.planeta_liberado++;

					saveAtual.pts+=temp_pts;
					menu_saves_saveslot(slotAtual);
					menu_recordes_insere(saveAtual.pts,saveAtual.nome);
				}

				//zera pontos;
				temp_pts=0;
				menu_saves_loadslot(slotAtual);
			}

			if(contadorfinal<200)
				contadorfinal++;
			else estado_atual=TELA_MISSION;
        }


        /*Troca tiros.. */
        if(teclado[C2D2_LALT].pressionado){
        do{ if(jogador.tiro_atual-- < 1) jogador.tiro_atual = 6;
        }while (!saveAtual.tiro_liberado[jogador.tiro_atual-1]);
        informacao=180;
        }

//        if(teclado[C2D2_2].pressionado){
//        do{ if(jogador.tiro_atual++ > 6) jogador.tiro_atual = 1;
//        }while (!saveAtual.tiro_liberado[jogador.tiro_atual-1]);
//        informacao=180;
//        }


		jogo_atualiza_fundo(&yfundo1,&yfundo2);
		jogo_atualiza_estrela(estrelas,1,MAXSTARS);
		jogo_atualiza_jogador(&jogador,explos);
		jogo_atualiza_barras(&altura_energia,&jogador);
        jogo_atualiza_explosao(explos);
        jogo_atualiza_tiro(tiros,&jogador);
        jogo_atualiza_marca(marcas, fase.ymapa,&jogador,explos,somExplo,tiros,&temp_pts);
        jogo_testa_colisao(marcas,tiros,spMarca,spTiro,&jogador,&temp_pts);




		if (jogador.intervalo_tiro > 0)jogador.intervalo_tiro--;

        if(fase.ymapa > -600) fase.ymapa-=2;

        if(quadroFlame > 1) quadroFlame --;
        else quadroFlame =24;



		if ((mouse->botoes[C2D2_MESQUERDO].ativo || teclado[C2D2_ESPACO].pressionado || teclado[C2D2_ESPACO].ativo)&& jogador.intervalo_tiro <= 0 && jogador.tipo != INVALIDO)
		{
            CA2_TocaEfeitoTela(somTiro[jogador.tiro_atual],jogador.x);
            jogo_cria_tiro(tiros,&jogador,jogador.tiro_atual);
		}

		if(teclado[C2D2_LCTRL].pressionado && jogador.tipo != INVALIDO && jogador.n_bombas > 0)
		{
            CA2_TocaEfeitoTela(somTiro[BOMBA1],jogador.x);
            jogo_cria_tiro(tiros,&jogador,jogador.bomba_atual);
            jogador.n_bombas--;
		}

        //joga valor de saveAtual.pts em uma string para que possa ser desenhado
        sprintf(spontos, "pts: %09i", temp_pts + saveAtual.pts);

/*--------------------------------------------------------------------------------------*/
/*-----------------    FIM DAS LOGICAS E COMECO DO DESENHO    --------------------------*/
/*--------------------------------------------------------------------------------------*/

        C2D2_LimpaTela();

        //desenha fundo
		C2D2_DesenhaSprite(spFundo,0,0,(int)yfundo1);
		C2D2_DesenhaSprite(spFundo,0,0,(int)yfundo2);
		C2D2P_Pontos(estrelas, 100, 200, 200, 200);


        if(jogador.tipo!=INVALIDO)
            C2D2_DesenhaSprite(spFlame,quadroFlame,jogador.x+9,jogador.y+45);
        //desenha a nave
        if(jogador.tipo == X85)
			C2D2_DesenhaSprite(spX85,0,jogador.x,jogador.y);
		else if(jogador.tipo == INVUNERAVEL)
			C2D2_DesenhaSprite(spX85,1,jogador.x,jogador.y);


		//desenha tiros
		for(int i=0;i<MAXTIROS;i++)
		{
			if(tiros[i].tipo==TIRO1)
				XDesenhaSprite(spTiro[TIRO1],0,tiros[i].x,tiros[i].y,tiros[i].tamanho,tiros[i].tamanho,tiros[i].alpha);
            else if(tiros[i].tipo==TIRO2)
				XDesenhaSprite(spTiro[TIRO2],0,tiros[i].x,tiros[i].y,tiros[i].tamanho,tiros[i].tamanho,tiros[i].alpha);
            else if(tiros[i].tipo==TIRO3)
				XDesenhaSprite(spTiro[TIRO3],0,tiros[i].x-tiros[i].tamanho/2,tiros[i].y,tiros[i].tamanho,tiros[i].tamanho,tiros[i].alpha);
			else if(tiros[i].tipo==TIRO4)
				XDesenhaSprite(spTiro[TIRO4],0,tiros[i].x-tiros[i].tamanho/2,tiros[i].y,tiros[i].tamanho,tiros[i].tamanho,tiros[i].alpha);
            else if(tiros[i].tipo==TIRO5)
				XDesenhaSprite(spTiro[TIRO5],0,tiros[i].x-tiros[i].tamanho/2,tiros[i].y,tiros[i].tamanho,tiros[i].tamanho,tiros[i].alpha);
            else if(tiros[i].tipo==TIRO6)
				XDesenhaSprite(spTiro[TIRO6],0,tiros[i].x-tiros[i].tamanho/2,tiros[i].y,tiros[i].tamanho,tiros[i].tamanho*2,tiros[i].alpha);
			else if(tiros[i].tipo==BOMBA1)
				XDesenhaSprite(spTiro[BOMBA1],0,tiros[i].x,tiros[i].y,800,600,tiros[i].alpha);
            else if(tiros[i].tipo==TIROINI1)
				XDesenhaSprite(spTiro[TIROINI1],0,tiros[i].x,tiros[i].y,tiros[i].tamanho,tiros[i].tamanho,tiros[i].alpha);
            else if(tiros[i].tipo==TIROINI2)
				XDesenhaSprite(spTiro[TIROINI2],0,tiros[i].x,tiros[i].y,tiros[i].tamanho,tiros[i].tamanho,tiros[i].alpha);
			else if(tiros[i].tipo==TIROINI3)
				XDesenhaSprite(spTiro[TIROINI3],0,tiros[i].x,tiros[i].y,tiros[i].tamanho,tiros[i].tamanho,tiros[i].alpha);

		}


        //desenha todas marcas ativas
        for(int i=0 ;i<MAXMARCAS;i++)
        {
            if(marcas[i].tipo !=INVALIDO && marcas[i].ativo )
                C2D2_DesenhaSprite(spMarca[marcas[i].tipo],0,marcas[i].x,marcas[i].y);
        }
        //desenha explosoes
        for(int i=0 ;i<MAXEXPLOS;i++)
        {
            if(explos[i].tipo !=INVALIDO)
                XDesenhaSprite(spExplo,0,explos[i].x-explos[i].tamanho/2,explos[i].y-explos[i].tamanho/2,explos[i].tamanho,explos[i].tamanho,explos[i].alpha);
        }


        //desenha barras de vida e escudo e bombas
		C2D2_DesenhaSprite(barras_back,0,0,0);
		if(jogador.energia>0)
		XDesenhaSprite(barras_energy,0,6,595,16,-altura_energia*586/100,255);
		for(int i=0;i<jogador.n_bombas;i++)
			C2D2_DesenhaSprite(barras_bomba,0,774,116-(i*26));
        //desenha saveAtual.pts
        C2D2_DesenhaTexto(fontejogo, 40, 0, spontos, C2D2_TEXTO_ESQUERDA);

        //informacao
        if(informacao >= 0)
        {
            informacao--;
            jogo_exibe_informacao(jogador.tiro_atual);
        }

        C2D2_Sincroniza();

	}
	return 0;
}
//funcao para exibir informações durante o jogo
void jogo_exibe_informacao(int tipo)
{
    int x,y;
    x=380;
    y=5;
    C2D2_DesenhaSprite(barra_informacao,0,x,y);
    switch(tipo)
    {
        case 1:
            C2D2_DesenhaSprite(spMarca[T1],0,x+10,y+10);
            C2D2_DesenhaTexto(fontejogo,x+70,y+5,"Weapon 1",C2D2_TEXTO_ESQUERDA);
            C2D2_DesenhaTexto(fontejogo,x+70,y+25,"Blue Laser",C2D2_TEXTO_ESQUERDA);
        break;
        case 2 :
            C2D2_DesenhaSprite(spMarca[T2],0,x+10,y+10);
            C2D2_DesenhaTexto(fontejogo,x+70,y+5,"Weapon 2",C2D2_TEXTO_ESQUERDA);
            C2D2_DesenhaTexto(fontejogo,x+70,y+25,"Red Laser",C2D2_TEXTO_ESQUERDA);
        break;
        case 3 :
            C2D2_DesenhaSprite(spMarca[T3],0,x+10,y+10);
            C2D2_DesenhaTexto(fontejogo,x+70,y+5,"Weapon 3",C2D2_TEXTO_ESQUERDA);
            C2D2_DesenhaTexto(fontejogo,x+70,y+25,"Exploding Balls",C2D2_TEXTO_ESQUERDA);
        break;
        case 4 :
            C2D2_DesenhaSprite(spMarca[T4],0,x+10,y+10);
            C2D2_DesenhaTexto(fontejogo,x+70,y+5,"Weapon 4",C2D2_TEXTO_ESQUERDA);
            C2D2_DesenhaTexto(fontejogo,x+70,y+25,"Triple Exploding Balls",C2D2_TEXTO_ESQUERDA);
        break;
        case 5:
            C2D2_DesenhaSprite(spMarca[T5],0,x+10,y+10);
            C2D2_DesenhaTexto(fontejogo,x+70,y+5,"Weapon 5",C2D2_TEXTO_ESQUERDA);
            C2D2_DesenhaTexto(fontejogo,x+70,y+25,"Hyper Wave",C2D2_TEXTO_ESQUERDA);
        break;
        case 6:
            C2D2_DesenhaSprite(spMarca[T6],0,x+10,y+10);
            C2D2_DesenhaTexto(fontejogo,x+70,y+5,"Weapon 6",C2D2_TEXTO_ESQUERDA);
            C2D2_DesenhaTexto(fontejogo,x+70,y+25,"That's FIRE BABY!",C2D2_TEXTO_ESQUERDA);
        break;


    }


}
