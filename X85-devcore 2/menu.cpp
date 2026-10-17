#include "funcoes_M.h"

//fundo animado
float yfundo1=0;
float yfundo2=0;
int redAlpha=0;

//sprites de uso geral
unsigned int cursor;
unsigned int fonte;
unsigned int fundo;
unsigned int cover;
unsigned int darkback;
unsigned int botmain;
unsigned int botback;
unsigned int menutxt;
unsigned int otherbots;

//sprite da tela de planetas
unsigned int sprite_planetas;
unsigned int selectbox;
unsigned int botplanetas;
unsigned int redback;


//sprites load slots
unsigned int botdelslot;
unsigned int slotback;
unsigned int slotloadcover;
unsigned int slotinsertcover;

//sprites opcoes
unsigned int spvolume;
unsigned int spoptionscover;


//sprites about
unsigned int spabout1;
unsigned int spabout2;

//sprites recordes
unsigned int trofeus;
unsigned int recordstab;

//sons !
unsigned int sombot;
unsigned int sombot2;
unsigned int acess;
unsigned int music_menu;
unsigned int music_jogo;

void menu_carrega()
{
	//main e leftmenu
	cursor = C2D2_CarregaSpriteSet("./dados/menu/cursor.png",40,40);
	fundo = C2D2_CarregaSpriteSet("./dados/menu/fundo.jpg",0,0);
	cover = C2D2_CarregaSpriteSet("./dados/menu/cover.png",0,0);
    darkback = C2D2_CarregaSpriteSet("./dados/menu/darkback.png",0,0);


	botmain = C2D2_CarregaSpriteSet("./dados/menu/botmain.png",262,62);
	botback = C2D2_CarregaSpriteSet("./dados/menu/botback.png",65,445);
	menutxt = C2D2_CarregaSpriteSet("./dados/menu/menutxt.png",0,0);

	otherbots = C2D2_CarregaSpriteSet("./dados/menu/otherbots.png",220,35);

	//slots select
	botdelslot = C2D2_CarregaSpriteSet("./dados/menu/botdelslot.png",62,62);
	slotloadcover = C2D2_CarregaSpriteSet("./dados/menu/slotloadcover.png",0,0);
	slotinsertcover = C2D2_CarregaSpriteSet("./dados/menu/slotinsertcover.png",0,0);
    slotback = C2D2_CarregaSpriteSet("./dados/menu/slotback.png",0,0);

	// planetas
	//sprite_planetas = C2D2_CarregaSpriteSet("./dados/menu/logo.png",150,150);
	sprite_planetas = C2D2_CarregaSpriteSet("./dados/menu/logo.png",128,128);
	selectbox = C2D2_CarregaSpriteSet("./dados/menu/select.png",180,180);
	botplanetas= C2D2_CarregaSpriteSet("./dados/menu/botplanetas.png",110,70);
	redback= C2D2_CarregaSpriteSet("./dados/menu/red.png",0,0);

	//opcoes
	spvolume=C2D2_CarregaSpriteSet("./dados/menu/volume.png",65,190);
	spoptionscover=C2D2_CarregaSpriteSet("./dados/menu/optionscover.png",0,0);

	//about
	spabout1=C2D2_CarregaSpriteSet("./dados/menu/about1.png",0,0);
	spabout2=C2D2_CarregaSpriteSet("./dados/menu/about2.png",0,0);

	//recordes
	trofeus = C2D2_CarregaSpriteSet("./dados/menu/trofeus.png", 50, 50);
	recordstab = C2D2_CarregaSpriteSet("./dados/menu/recordstab.png", 486, 52);

	//fontes
	fonte = C2D2_CarregaFonte("./dados/menu/512.png", 32);
	//sons loading
	sombot= CA2_CarregaEfeito("./dados/sons/click.ogg");
	sombot2= CA2_CarregaEfeito("./dados/sons/zoop.ogg");
	acess= CA2_CarregaEfeito("./dados/sons/acess.wav");
	music_jogo= CA2_CarregaMusica("./dados/sons/progression_sasquamox.ogg");
	music_menu=CA2_CarregaMusica("./dados/sons/recharge_alvys18.ogg");

	//toca !
	CA2_TocaMusica(music_menu,-1);
}

void menu_fundo()
{
	if (yfundo1 >= 0) {
		yfundo1 = -600;
	}
	if (yfundo2 >= 600) {
		yfundo2 = 0;
	}
	yfundo1 +=1;
	yfundo2 +=1;

	if(redAlpha > 0)
        redAlpha -=5;

	C2D2_DesenhaSprite(fundo,0,0,(int)yfundo1);
	C2D2_DesenhaSprite(fundo,0,0,(int)yfundo2);
	if(redAlpha)XDesenhaSprite(redback,0,0,0,800,600,redAlpha);
}

void menu_aux()
{
	static C2D2_Botao *teclado = C2D2_PegaTeclas();
	static C2D2_Mouse *mouse = C2D2_PegaMouse();

	//sai com esc
	if(teclado[C2D2_ESC].pressionado)
	{
	    if(estado_atual==TELA_MAIN) estado_atual=SAIR;
        else estado_atual=TELA_MAIN;
	}


    //para efeitos de fade
    if(!fadecontrol && fadealpha >0)
        fadealpha-=25;
    else if(fadecontrol)
    {
        if(fadealpha<250)
                fadealpha+=25;
            else
            {
                encerra=1;
                fadecontrol=false;
            }
    }
    if(fadealpha > 0)
    {
        XDesenhaSprite(fundo,0,0,(int)yfundo1,800,600,fadealpha);
        XDesenhaSprite(fundo,0,0,(int)yfundo2,800,600,fadealpha);
    }


	C2D2_DesenhaSprite(cover,0,0,0);

	C2D2_DesenhaSprite(cursor,0,mouse->x,mouse->y);
}

void menu_main()
{

	int balpha[12]={0,0,0,0,0,0,0,0,0,0,0,0};

	while(!encerra)
	{
		if(estado_atual != TELA_MAIN)
            fadecontrol=true;
			//encerra=1;

		C2D2_LimpaTela();
		menu_fundo();


        if(XDesenhaBotao(botmain,0,262,162,cursor,balpha[1])==1)
        {
            CA2_TocaEfeito(sombot,0);
            estado_atual=TELA_SLOT_SELECT;
        }
        if(XDesenhaBotao(botmain,0,262,226,cursor,balpha[2])==1)
        {
            CA2_TocaEfeito(sombot,0);
            estado_atual=TELA_OPCOES;
        }
        if(XDesenhaBotao(botmain,0,262,288,cursor,balpha[3])==1)
        {
            CA2_TocaEfeito(sombot,0);
            estado_atual=TELA_RANKING;
        }
        if(XDesenhaBotao(botmain,0,262,350,cursor,balpha[4])==1)
        {
            CA2_TocaEfeito(sombot,0);
            estado_atual=TELA_ABOUT;
        }

        if(XDesenhaBotao(botmain,0,262,412,cursor,balpha[5])==1)
            estado_atual=SAIR;

        C2D2_DesenhaSprite(menutxt,0,0,0);

		//esse é o menu da esquerda
		menu_aux();

		C2D2_Sincroniza();
	}
}



void menu_mission()
{
	C2D2_Botao *teclado = C2D2_PegaTeclas();

//	char nomes[12][20]={"SOL","TERRA","LUA","NAOSEI","BOSTA1","BOSTA2","BOSTA3","BOSTA4","BOSTA5","BOSTA6","BOSTA7","???"};

	int min=0,max=planeta_max;

	int i=0;

	// vetor com alpha de cada botão usado pela XDesenhaBotao
	int balpha[12]={0,0,0,0,0,0,0,0,0,0,0,0};

	//vetor de planetas
	planeta **planetas=(planeta**)malloc(sizeof(planeta*)*planeta_max);
	for(i=0;i<planeta_max;i++) planetas[i]=(planeta*)malloc(sizeof(planeta));

    char spontos[20];
    char snome[35];

	// inicia a posição central dos planetas
	for(i=0;i<planeta_max;i++)
	{
	    planetas[i]->x=400;
        planetas[i]->y=300;
        planetas[i]->tamanho=2;
        planetas[i]->alpha=0;
	}

	while(!encerra)
	{
		if(estado_atual != TELA_MISSION)
            fadecontrol=true;
			//encerra=1;

        sprintf(snome,"Welcome %s !",saveAtual.nome);
        sprintf(spontos,"Pts: %d",saveAtual.pts);

		// logica pra desenhar só 3 planetas pra cada lado
		if(	(saveAtual.planeta_atual+4) >= planeta_max) max=planeta_max;
		else max=saveAtual.planeta_atual + 5; // quatro por  causa do "<" e não "<="
		if(	(saveAtual.planeta_atual-3) < 0) min=0;
		else min=saveAtual.planeta_atual - 2;

		planetas_atualiza(planetas,saveAtual.planeta_atual,planeta_max);

		C2D2_LimpaTela();
		menu_fundo();

        if(XDesenhaBotao(selectbox,0,310,210,cursor,balpha[3])==1 || teclado[C2D2_ESPACO].pressionado )
        {
            if(saveAtual.planeta_atual<=saveAtual.planeta_liberado)
            {

				CA2_TocaEfeito(sombot,0);
				estado_atual=TELA_JOGO;
            }
            else
            {
                CA2_TocaEfeito(acess,0);
                redAlpha = 210;
            }
        }

		//desenha planetas
		for(i=min;i<max;i++)
		{
		    if(i<=saveAtual.planeta_liberado )
		    {
                XDesenhaSprite(sprite_planetas,i,
                               planetas[i]->x,
                               planetas[i]->y ,
                               planetas[i]->tamanho,
                               planetas[i]->tamanho,
                               planetas[i]->alpha);
		    }
            else
			{
			    XDesenhaSprite(sprite_planetas,8,
				               planetas[i]->x,
				               planetas[i]->y ,
				               planetas[i]->tamanho,
				               planetas[i]->tamanho,
				               planetas[i]->alpha);
			}
		}

		if(XDesenhaBotao(botback,0,8,94,cursor,balpha[0])==1)
        {
            CA2_TocaEfeito(sombot,0);
            estado_atual=TELA_MAIN;
        }

		if( ((XDesenhaBotao(botplanetas,0,255,450,cursor,balpha[1])==1) || teclado[C2D2_ESQUERDA].pressionado) && saveAtual.planeta_atual>0 )
		{
			CA2_TocaEfeito(sombot2,0);
			saveAtual.planeta_atual--;
		}

		if( ((XDesenhaBotao(botplanetas,2,450,450,cursor,balpha[2])==1) || teclado[C2D2_DIREITA].pressionado) && saveAtual.planeta_atual<max-1)
		{
			CA2_TocaEfeito(sombot2,0);
			saveAtual.planeta_atual++;
		}


       C2D2_DesenhaTexto(fonte, 100, 100,snome, C2D2_TEXTO_ESQUERDA);
       C2D2_DesenhaTexto(fonte, 780, 100,spontos, C2D2_TEXTO_DIREITA);

//		if(planeta_atual <= saveAtual.planeta_liberado)
//			;//C2D2_DesenhaTexto(fonte, 485, 480,nomes[planeta_atual], C2D2_TEXTO_CENTRALIZADO);
//		else
//			;//C2D2_DesenhaTexto(fonte, 485, 480,nomes[11], C2D2_TEXTO_CENTRALIZADO);

		menu_aux();

		C2D2_Sincroniza();
	}
}

void menu_ranking()
{
    // vetor com alpha de cada botão usado pela XDesenhaBotao
	int balpha[12]={0,0,0,0,0,0,0,0,0,0,0,0};

	tiporecorde vetrecs[7];
	FILE *recordes;
	//para imprimir na tela
	char pontos[7][10];


	//aplica default
	recordes=fopen("./dados/recs.x85" ,"rb");
	if (recordes==NULL)
	{
		menu_recordes_default();
		recordes=fopen("./dados/recs.x85" ,"rb");
	}
	fread(&vetrecs,sizeof(tiporecorde),7,recordes);

	while(!encerra)
	{
		if(estado_atual != TELA_RANKING)
            fadecontrol=true;

		C2D2_LimpaTela();
		menu_fundo();
		C2D2_DesenhaSprite(darkback,0,0,0);

		if(XDesenhaBotao(botback,0,8,94,cursor,balpha[0])==1)
        {
            CA2_TocaEfeito(sombot,0);
            estado_atual=TELA_MAIN;
        }

		//tabs:
		C2D2_DesenhaSprite(recordstab,0,200,115);
		C2D2_DesenhaSprite(recordstab,1,200,165);
		C2D2_DesenhaSprite(recordstab,1,200,215);
		C2D2_DesenhaSprite(recordstab,1,200,265);
		C2D2_DesenhaSprite(recordstab,2,200,315);
		C2D2_DesenhaSprite(recordstab,2,200,365);
        C2D2_DesenhaSprite(recordstab,2,200,415);
		C2D2_DesenhaSprite(recordstab,2,200,465);
		//trofeus:
		C2D2_DesenhaSprite(trofeus,0,190,166);
		C2D2_DesenhaSprite(trofeus,1,190,216);
		C2D2_DesenhaSprite(trofeus,2,190,266);

		//LABELS
		for(int i=0;i<7;i++)
			sprintf(pontos[i],"%d",vetrecs[i].pts);
		for(int i=0;i<7;i++)
		{

			C2D2_DesenhaTexto(fonte, 255, 175+(50*i),vetrecs[i].nome, C2D2_TEXTO_ESQUERDA);
			C2D2_DesenhaTexto(fonte, 640, 175+(50*i),pontos[i], C2D2_TEXTO_DIREITA);
		}
		//esse é o menu da esquerda
		menu_aux();

		C2D2_Sincroniza();
	}
}



void menu_about()
{
    // vetor com alpha de cada botão usado pela XDesenhaBotao
	int balpha[12]={0,0,0,0,0,0,0,0,0,0,0,0};
	int about_alpha=0;
	bool about_alpha_inc=true;

	while(!encerra)
	{
		if(estado_atual != TELA_ABOUT)
            fadecontrol=true;

        if(about_alpha_inc)
        {
            if(about_alpha<255)about_alpha+=5;
            else about_alpha_inc = false;
        }else
        {
             if(about_alpha>1)about_alpha-=5;
            else about_alpha_inc = true;
        }

		C2D2_LimpaTela();
		menu_fundo();
		C2D2_DesenhaSprite(darkback,0,0,0);

		if(XDesenhaBotao(botback,0,8,94,cursor,balpha[0])==1)
        {
            CA2_TocaEfeito(sombot,0);
            estado_atual=TELA_MAIN;
        }

        C2D2_DesenhaSprite(spabout1,0,200,100);
        XDesenhaSprite(spabout2,0,200,100,0,0,about_alpha);

		//esse é o menu da esquerda
		menu_aux();

		C2D2_Sincroniza();
	}
}



void menu_opcoes()
{
	C2D2_Mouse *mouse = C2D2_PegaMouse();

	int balpha[12]={0,0,0,0,0,0,0,0,0,0,0,0};
	//controle do volume
	int tempvolume;
	int ymusic = 422-(volume_music*172)/100;
	int yeffects = 422-(volume_effects*172)/100;


	while(!encerra)
	{
		//leftmenualpha[3]=255;

		if(estado_atual != TELA_OPCOES)
            fadecontrol=true;
			//encerra=1;

		C2D2_LimpaTela();
		menu_fundo();

		C2D2_DesenhaSprite(darkback,0,0,0);
		C2D2_DesenhaSprite(spoptionscover,0,0,0);

		if(XDesenhaBotao(botback,0,8,94,cursor,balpha[0])==1)
        {
            CA2_TocaEfeito(sombot,0);
            estado_atual=TELA_MAIN;
        }

		//módulo do volume da musica
		C2D2_DesenhaSprite(spvolume,0,230,240);
		XDesenhaSprite(spvolume,1,230,430,65,(ymusic-430)-1,255);
		if(XDesenhaBotao(spvolume,2,230,ymusic-95,cursor,balpha[1])==2)
			volume_music = atualiza_barra(ymusic,422,250,mouse);

		//módulo do volume do efeito
		C2D2_DesenhaSprite(spvolume,0,320,240);
		XDesenhaSprite(spvolume,1,320,430,65,(yeffects-430)-1,255);
		if(XDesenhaBotao(spvolume,2,320,yeffects-95,cursor,balpha[2])==2){
			tempvolume = atualiza_barra(yeffects,422,250,mouse);
			if(volume_effects != tempvolume )
				CA2_TocaEfeito(sombot2,0);
			volume_effects = tempvolume;
		}

		//mute
		if(XDesenhaBotao(otherbots,0,440,230,cursor,balpha[3])==1)
		{
			volume_music=0;
			volume_effects=0;
			ymusic = 422-(volume_music*172)/100;
			yeffects = 422-(volume_effects*172)/100;
		}

//		//fullscreen
//		if(XDesenhaBotao(otherbots,0,440,270,cursor,balpha[4])==1)
//		{
//
//		}
//		//reset
//		if(XDesenhaBotao(otherbots,0,440,310,cursor,balpha[5])==1)
//		{
//            volume_music=50;
//			volume_effects=50;
//			ymusic = 422-(volume_music*172)/100;
//			yeffects = 422-(volume_effects*172)/100;
//		}

		//clear records
		if(XDesenhaBotao(otherbots,0,440,270,cursor,balpha[6])==1)
			menu_recordes_default();
        //clear records
		if(XDesenhaBotao(otherbots,0,440,310,cursor,balpha[7])==1)
			menu_saves_default();

		C2D2_DesenhaTexto(fonte, 550, 232,"mute", C2D2_TEXTO_CENTRALIZADO);
		//C2D2_DesenhaTexto(fonte, 550, 272,"fullscreen", C2D2_TEXTO_CENTRALIZADO);
		//C2D2_DesenhaTexto(fonte, 550, 312,"reset all", C2D2_TEXTO_CENTRALIZADO);
		C2D2_DesenhaTexto(fonte, 550, 272,"clear records", C2D2_TEXTO_CENTRALIZADO);
        C2D2_DesenhaTexto(fonte, 550, 312,"clear saves", C2D2_TEXTO_CENTRALIZADO);

		//esse é o menu da esquerda
		menu_aux();

		CA2_AjustaVolume(volume_music, volume_effects);
		C2D2_Sincroniza();
	}
}

void menu_slot_select()
{
    int balpha[12]={0,0,0,0,0,0,0,0,0,0,0,0};

	tiposave vetsaves[3];
    FILE *saves;

	saves=fopen("./dados/saves.x85" ,"rb");
	if(saves==NULL)
	{
		menu_saves_default();
		saves=fopen("./dados/saves.x85" ,"rb");
	}
	fread(&vetsaves,sizeof(tiposave),3,saves);
	fclose(saves);

	while(!encerra)
	{
		if(estado_atual != TELA_SLOT_SELECT)
            fadecontrol=true;

		C2D2_LimpaTela();
		menu_fundo();

		C2D2_DesenhaSprite(darkback,0,0,0);
		C2D2_DesenhaSprite(slotback,0,0,0);
		C2D2_DesenhaSprite(slotloadcover,0,0,0);

		if(XDesenhaBotao(botback,0,8,94,cursor,balpha[0])==1)
        {
            CA2_TocaEfeito(sombot,0);
            estado_atual=TELA_MAIN;
        }

        if(XDesenhaBotao(botmain,0,262,226,cursor,balpha[1])==1)
        {
            //continue
            if(!vetsaves[0].empty)
            {
                slotAtual=0;
                menu_saves_loadslot(0);
                estado_atual=TELA_MISSION;
            }
            else
            {
                slotAtual = 0;
                estado_atual= TELA_SLOT_INSERT;
            }

        }
        if(XDesenhaBotao(botmain,0,262,288,cursor,balpha[2])==1)
        {
            //continue
            if(!vetsaves[1].empty)
            {
                slotAtual=1;
                menu_saves_loadslot(1);
                estado_atual=TELA_MISSION;
            }
            else
            {
                slotAtual = 1;
                estado_atual= TELA_SLOT_INSERT;
            }

        }
        if(XDesenhaBotao(botmain,0,262,350,cursor,balpha[3])==1)
        {
            //continue
            if(!vetsaves[2].empty)
            {
                slotAtual=2;
                menu_saves_loadslot(2);
                estado_atual=TELA_MISSION;
            }
            else
            {
                slotAtual = 2;
                estado_atual= TELA_SLOT_INSERT;
            }

        }

        //delbots
        if(!vetsaves[0].empty && XDesenhaBotao(botdelslot,0,515,226,cursor,balpha[4])==1)
        {
                menu_saves_edit(0,"new",EASY,true);
                menu_saves_carregavetor(vetsaves);
        }

        if(!vetsaves[1].empty && XDesenhaBotao(botdelslot,0,515,288,cursor,balpha[5])==1)
        {
                menu_saves_edit(1,"new",EASY,true);
                menu_saves_carregavetor(vetsaves);
        }

        if( !vetsaves[2].empty && XDesenhaBotao(botdelslot,0,515,350,cursor,balpha[6])==1)
        {
                menu_saves_edit(2,"new",EASY,true);
                menu_saves_carregavetor(vetsaves);
        }

        for(int i=0;i<3;i++)
			C2D2_DesenhaTexto(fonte, 390, 238+(62*i),vetsaves[i].nome, C2D2_TEXTO_CENTRALIZADO);


		menu_aux();

		C2D2_Sincroniza();
	}
}

void menu_slot_insert()
{
    int balpha[12]={0,0,0,0,0,0,0,0,0,0,0,0};

    C2D2_Botao *teclado = C2D2_PegaTeclas();

    int pisca=0;
    int indxnome=0;
    char nome[15]={'\0'};
    char nometemp[15]={'\0'};

    while(!encerra)
    {
        if(estado_atual != TELA_SLOT_INSERT)
            fadecontrol=true;

        if(indxnome<12)
        {
            if(teclado[C2D2_A].pressionado) nome[indxnome++] ='a';
            else if(teclado[C2D2_B].pressionado) nome[indxnome++] = 'b';
            else if(teclado[C2D2_C].pressionado) nome[indxnome++] = 'c';
            else if(teclado[C2D2_D].pressionado) nome[indxnome++] = 'd';
            else if(teclado[C2D2_E].pressionado) nome[indxnome++] = 'e';
            else if(teclado[C2D2_F].pressionado) nome[indxnome++] = 'f';
            else if(teclado[C2D2_G].pressionado) nome[indxnome++] = 'g';
            else if(teclado[C2D2_H].pressionado) nome[indxnome++] = 'h';
            else if(teclado[C2D2_I].pressionado) nome[indxnome++] = 'i';
            else if(teclado[C2D2_J].pressionado) nome[indxnome++] = 'j';
            else if(teclado[C2D2_K].pressionado) nome[indxnome++] = 'k';
            else if(teclado[C2D2_L].pressionado) nome[indxnome++] = 'l';
            else if(teclado[C2D2_M].pressionado) nome[indxnome++] = 'm';
            else if(teclado[C2D2_N].pressionado) nome[indxnome++] = 'n';
            else if(teclado[C2D2_O].pressionado) nome[indxnome++] = 'o';
            else if(teclado[C2D2_P].pressionado) nome[indxnome++] = 'p';
            else if(teclado[C2D2_Q].pressionado) nome[indxnome++] = 'q';
            else if(teclado[C2D2_R].pressionado) nome[indxnome++] = 'r';
            else if(teclado[C2D2_S].pressionado) nome[indxnome++] = 's';
            else if(teclado[C2D2_T].pressionado) nome[indxnome++] = 't';
            else if(teclado[C2D2_U].pressionado) nome[indxnome++] = 'u';
            else if(teclado[C2D2_V].pressionado) nome[indxnome++] = 'v';
            else if(teclado[C2D2_X].pressionado) nome[indxnome++] = 'x';
            else if(teclado[C2D2_Y].pressionado) nome[indxnome++] = 'y';
            else if(teclado[C2D2_W].pressionado) nome[indxnome++] = 'w';
            else if(teclado[C2D2_Z].pressionado) nome[indxnome++] = 'z';
            else if(teclado[C2D2_ESPACO].pressionado) nome[indxnome++] =' ';
        }

        if(teclado[C2D2_BACKSPACE].pressionado && indxnome>0)
            nome[--indxnome]='\0';

        nome[indxnome]='\0';
        strcpy(nometemp,nome);
		sprintf(nometemp,"%s|",nome);


        /*-------------------------- DESEHO --------------------------*/

        C2D2_LimpaTela();
		menu_fundo();

        C2D2_DesenhaSprite(darkback,0,0,0);
		C2D2_DesenhaSprite(slotback,0,0,0);
		C2D2_DesenhaSprite(slotinsertcover,0,0,0);


		if(XDesenhaBotao(botback,0,8,94,cursor,balpha[0])==1)
        {
            CA2_TocaEfeito(sombot,0);
            estado_atual=TELA_SLOT_SELECT;
        }

		if(XDesenhaBotao(otherbots,0,275,280,cursor,balpha[1])==1)
		{
            if(nome[0] != '\0')
            {
                menu_saves_edit(slotAtual,nome,EASY,0);
                menu_saves_loadslot(slotAtual);
                estado_atual=TELA_MISSION;
            }
            else
            {
                redAlpha=220;
                CA2_TocaEfeito(acess,0);
            }
		}
		if(XDesenhaBotao(otherbots,0,275,320,cursor,balpha[2])==1)
		{
            if(nome[0] != '\0')
            {
                menu_saves_edit(slotAtual,nome,NORMAL,0);
                menu_saves_loadslot(slotAtual);
                estado_atual=TELA_MISSION;
            }
            else
            {
                redAlpha=220;
                CA2_TocaEfeito(acess,0);
            }
		}
		if(XDesenhaBotao(otherbots,0,275,360,cursor,balpha[3])==1)
		{
            if(nome[0] != '\0')
            {
                menu_saves_edit(slotAtual,nome,HARD,0);
                menu_saves_loadslot(slotAtual);
                estado_atual=TELA_MISSION;
            }
            else
            {
                redAlpha=220;
                CA2_TocaEfeito(acess,0);
            }
		}
        if(XDesenhaBotao(otherbots,0,275,400,cursor,balpha[4])==1)
        {
            if(nome[0] != '\0')
            {
                menu_saves_edit(slotAtual,nome,GODMODE,0);
                menu_saves_loadslot(slotAtual);
                estado_atual=TELA_MISSION;
            }
            else
            {
                redAlpha=220;
                CA2_TocaEfeito(acess,0);
            }
		}

        //labels
        C2D2_DesenhaTexto(fonte, 380, 282,"Easy", C2D2_TEXTO_CENTRALIZADO);
        C2D2_DesenhaTexto(fonte, 380, 322,"Normal", C2D2_TEXTO_CENTRALIZADO);
        C2D2_DesenhaTexto(fonte, 380, 362,"Hard", C2D2_TEXTO_CENTRALIZADO);
        C2D2_DesenhaTexto(fonte, 380, 402,"GOD MODE", C2D2_TEXTO_CENTRALIZADO);

        C2D2_DesenhaTexto(fonte, 300, 205,nome, C2D2_TEXTO_ESQUERDA);
		if(pisca++ <=30) C2D2_DesenhaTexto(fonte, 300, 205,nometemp, C2D2_TEXTO_ESQUERDA);
		else if(pisca>=60) pisca=0;

        menu_aux();
        C2D2_Sincroniza();
    }
}
