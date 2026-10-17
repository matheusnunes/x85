#include <stdio.h>
#include <math.h>
#include "chien2d2.h"
#include "chien2d2primitivas.h"
#include "chienaudio2.h"


#include "jogo.h"

//main menu
tipobotao botsmain[5];
//play
tipobotao botsplay[6];
//options
tipobotao botsops[8];
//records
tipobotao botsrecords[1];
//credits
tipobotao botscredits[1];
//askwindow
tipobotao botsask[2];
//insere nome
tipobotao botsinserenome[2];



//declara
int i;
int loaded=0;

int modotela=0;
int fechajogo=0;
int estado=0;
int modnave=0;
int modfase=0;

int mute=0;
int oldvolumes[2];
int volmusic=100;
int volefeitos=80;


//loading
unsigned int fundol;

//mainmenu
unsigned int left;
unsigned int botmainimg;
unsigned int botok;
unsigned int askwind;
unsigned int askicons;
unsigned int askname;
unsigned int fundomain;
unsigned int fundosub;
unsigned int fundoask;
unsigned int fundorecorde;
unsigned int navesslide;


unsigned int botsmall;
unsigned int botcheck;

unsigned int cursor;
unsigned int fontemenu;
unsigned int fontemenu2;
unsigned int black;

unsigned int sombot;
unsigned int sombot2;
unsigned int musicmenu;
unsigned int switchon;
unsigned int switchoff;

//play
unsigned int winds;
unsigned int naves;
unsigned int fases;
unsigned int specs;
unsigned int barspec;
//options
unsigned int backvol;
unsigned int barvol;
//records
unsigned int trofeus;
unsigned int recordstab;
//credits
unsigned int logotipos;



void DesenhaSprite(unsigned int id,unsigned int indice,int posx, int posy,int largura,int altura,int red,int green,int blue,int alpha)
{
	int x[4];
	int y[4];
	x[0]=posx;
	x[1]=posx+largura;
	x[2]=posx+largura;
	x[3]=posx;
	y[0]=posy;
	y[1]=posy;
	y[2]=posy+altura;
	y[3]=posy+altura;
	
	C2D2_DesenhaSpriteEfeito(id, indice, x, y, red, green, blue, alpha);
}

int DB(tipobotao *bot,int maxbots)
{
	//desenha bots
	for(i=0;i<maxbots;i++)
	{
		C2D2_DesenhaSprite(bot[i].img, bot[i].indx, bot[i].x, bot[i].y);
		DesenhaSprite(bot[i].img, bot[i].indx+1, bot[i].x, bot[i].y, bot[i].l, bot[i].a,255,255,255, bot[i].alpha);
	}
	//testa colidiu bots
	for(i=0; i<maxbots; i++)
	{
		C2D2_Mouse *mouse = C2D2_PegaMouse();
		if(C2D2_ColidiuSprites(cursor, 1, mouse->x, mouse->y, bot[i].img, 0, bot[i].x, bot[i].y))
		{
			if(bot[i].alpha==0)
			{
				//sobre			
			}	
			if(mouse->botoes[C2D2_MESQUERDO].pressionado)
			{
				//CA2_TocaEfeito(sombot1, 1);
				return i;			
			}
			if(mouse->botoes[C2D2_MESQUERDO].ativo)
			{
				return i + 10;			
			}
			if(bot[i].alpha<255)
				bot[i].alpha+=15;

		}
		else if(bot[i].alpha>0)
				bot[i].alpha-=15;
	}
}
////////////////////////////////////////////////////////////////////////////////

int carrega(int i)
{
	switch(i)
	{
		//main-menu
		case 1: 
		{
			/// aki v�o os arquivos
			
				fontemenu = C2D2_CarregaFonte("./dados/512.png", 32);
				fontemenu2 = C2D2_CarregaFonte("./dados/512-2.png", 32);
				cursor = C2D2_CarregaSpriteSet("./dados/cursor.png", 40,40);
				botok = C2D2_CarregaSpriteSet("./dados/botok.png", 60,40);
				askwind = C2D2_CarregaSpriteSet("./dados/ask.png",0,0);
				askicons= C2D2_CarregaSpriteSet("./dados/askicons.png",48,48);
				askname= C2D2_CarregaSpriteSet("./dados/askname.png",0,0);
				fundomain = C2D2_CarregaSpriteSet("./dados/fundo.jpg", 0,0);
				fundosub = C2D2_CarregaSpriteSet("./dados/fundo2.jpg", 0,0);
				fundorecorde = C2D2_CarregaSpriteSet("./dados/fundo3.jpg", 0,0);
				fundoask = C2D2_CarregaSpriteSet("./dados/fundoask.jpg", 0,0);
				left = C2D2_CarregaSpriteSet("./dados/leftcover.png", 0,0);
				botmainimg = C2D2_CarregaSpriteSet("./dados/botmain.png", 350, 60);
				botsmall = C2D2_CarregaSpriteSet("./dados/botsmall.png", 40,40);
				botcheck = C2D2_CarregaSpriteSet("./dados/botscheck.png", 220, 35);
				navesslide = C2D2_CarregaSpriteSet("./dados/naves-slide.png", 320, 320);

				//play
				winds = C2D2_CarregaSpriteSet("./dados/winds.png", 0, 0);
				naves = C2D2_CarregaSpriteSet("./dados/naves.png", 140, 140);
				fases = C2D2_CarregaSpriteSet("./dados/fases.png", 140, 140);
				specs = C2D2_CarregaSpriteSet("./dados/specs.png",0 ,0);
				barspec = C2D2_CarregaSpriteSet("./dados/barspec.png",0 ,0);
	
				//options
				barvol = C2D2_CarregaSpriteSet("./dados/barvol.png", 180, 48);
				backvol = C2D2_CarregaSpriteSet("./dados/backvol.png", 0, 0);
	
				//records
				trofeus = C2D2_CarregaSpriteSet("./dados/trofeus.png", 50, 50);
				recordstab = C2D2_CarregaSpriteSet("./dados/recordstab.png", 486, 52);
				//credits
				logotipos = C2D2_CarregaSpriteSet("./dados/logotipos.png", 0,0);
				
				//music
				musicmenu = CA2_CarregaMusica("./sons/menu.ogg");
				sombot= CA2_CarregaEfeito("./sons/cosmic.wav");
				sombot2= CA2_CarregaEfeito("./sons/cosmic2.wav");
				switchon = CA2_CarregaEfeito("./sons/switchon.wav");
				switchoff = CA2_CarregaEfeito("./sons/switchoff.wav");
				
			return 1;
			break;
		}
			
	}//switch
}
////////////////////////////////////////////////////////////////////////////////

int loading(int i)
{
	C2D2_Botao *teclado = C2D2_PegaTeclas();
	
	//controle
	int encerra=0;
	int carregou=0;

	//fade
	int alphaf=250;
	
	do
	{
		
		// FADES ...
		//in. ..
		if(alphaf>0 && !carregou)
			alphaf-=10;
		//out..
		if(carregou)
		{
			if(alphaf<255)
				alphaf+=5;
			else
				encerra=1;
		}
		
		if(!alphaf)
			if(carrega(i))
				carregou=1;
						
		C2D2_LimpaTela();
		
		C2D2_DesenhaSprite(fundol,0,0,0);

		DesenhaSprite(black,0,0,0,800,600,255,255,255,alphaf);
		C2D2_Sincroniza();
	}
	while(!encerra);
	estado=1;
}

////////////////////////////////////////////////////////////////////////////////


void recordesDefault()
{
		//arquivo
		tiporecorde vetrecs[5];
		FILE *recordes;

		recordes=fopen("./dados/recs.x85" ,"wb");
		//default records :D
		sprintf(vetrecs[0].nome,"Matheus");
		vetrecs[0].pts=9000;
		sprintf(vetrecs[1].nome,"Argus");
		vetrecs[1].pts=8000;
		sprintf(vetrecs[2].nome,"chucknorris");
		vetrecs[2].pts=3000;
		sprintf(vetrecs[3].nome,"magaiver");
		vetrecs[3].pts=2000;
		sprintf(vetrecs[4].nome,"loser");
		vetrecs[4].pts=1000;
		fwrite(&vetrecs,sizeof(tiporecorde),5,recordes);
		fclose(recordes);
}



////////////////////////////////////////////////////////////////////////////////

void recordesNome(char *nome)
{	
	//c2d2...
	C2D2_Botao *teclado = C2D2_PegaTeclas();
	C2D2_Mouse *mouse = C2D2_PegaMouse();
	C2D2_TrocaCorLimpezaTela(0,0,0);
	
	//efeito fade entra sai
	int alphaf=250;
	int encerra=0;
	int fadeout=0;
	
	int pisca=0;
	
	int numbots=1;

	int indxnome=0;
	char nometemp[18];

	//posi��o etc dos bots
	botsinserenome[0].x=364;
	botsinserenome[0].y=320;
	botsinserenome[0].a=40;
	botsinserenome[0].l=60;
	botsinserenome[0].img = botok;
	botsinserenome[0].indx=0;
	
	
/// come�o do DO
	do
	{

// efeitos...		
		//fade in...
		if(!fadeout && alphaf >0)
			alphaf-=10;
		//fadeout...
		if(fadeout)
			if(alphaf<=225)
			{	alphaf+=25;
			}else encerra=1;
			
		//vari�veis nome...
		strcpy(nometemp,nome);
		sprintf(nometemp,"%s|",nome);
			
//fim logicas
			

		if(indxnome<12){
				if(teclado[C2D2_A].pressionado)
					nome[indxnome++] = 'a';
				else if(teclado[C2D2_B].pressionado)
					nome[indxnome++] = 'b';
				else if(teclado[C2D2_C].pressionado)
					nome[indxnome++] = 'c';
				else if(teclado[C2D2_D].pressionado)
					nome[indxnome++] = 'd';
				else if(teclado[C2D2_E].pressionado)
					nome[indxnome++] = 'e';
				else if(teclado[C2D2_F].pressionado)
					nome[indxnome++] = 'f';
				else if(teclado[C2D2_G].pressionado)
					nome[indxnome++] = 'g';		
				else if(teclado[C2D2_H].pressionado)
					nome[indxnome++] = 'h';
				else if(teclado[C2D2_I].pressionado)
					nome[indxnome++] = 'i';
				else if(teclado[C2D2_J].pressionado)
					nome[indxnome++] = 'j';		
				else if(teclado[C2D2_K].pressionado)
					nome[indxnome++] = 'k';
				else if(teclado[C2D2_L].pressionado)
					nome[indxnome++] = 'l';
				else if(teclado[C2D2_M].pressionado)
					nome[indxnome++] = 'm';
				else if(teclado[C2D2_N].pressionado)
					nome[indxnome++] = 'n';
				else if(teclado[C2D2_O].pressionado)
					nome[indxnome++] = 'o';
				else if(teclado[C2D2_P].pressionado)
					nome[indxnome++] = 'p';
				else if(teclado[C2D2_Q].pressionado)
					nome[indxnome++] = 'q';
				else if(teclado[C2D2_R].pressionado)
					nome[indxnome++] = 'r';
				else if(teclado[C2D2_S].pressionado)
					nome[indxnome++] = 's';
				else if(teclado[C2D2_T].pressionado)
					nome[indxnome++] = 't';
				else if(teclado[C2D2_U].pressionado)
					nome[indxnome++] = 'u';
				else if(teclado[C2D2_V].pressionado)
					nome[indxnome++] = 'v';
				else if(teclado[C2D2_X].pressionado)
					nome[indxnome++] = 'x';
				else if(teclado[C2D2_Y].pressionado)
					nome[indxnome++] = 'y';
				else if(teclado[C2D2_W].pressionado)
					nome[indxnome++] = 'w';
				else if(teclado[C2D2_Z].pressionado)
					nome[indxnome++] = 'z';
				else if(teclado[C2D2_ESPACO].pressionado)
					nome[indxnome++]=' ';
			}
			// backspace
			if(teclado[C2D2_BACKSPACE].pressionado && indxnome>0)
				nome[--indxnome]='\0';
			nome[indxnome]='\0';
			
			 if(teclado[C2D2_ENTER].pressionado && !nome[0]=='\0')
			 {
			 	estado=4;
				fadeout=1;
			}
			

			
/// Desenho..
		C2D2_LimpaTela();
		
		C2D2_DesenhaSprite(fundorecorde,0, 0,0);
		C2D2_DesenhaSprite(askwind,0, 221,200);
		C2D2_DesenhaSprite(askname,0, 275,260);

		switch(DB(botsinserenome,numbots))
		{
			case 0:
				if(!nome[0]=='\0')
				{
					estado=4;
					fadeout=1;
				}
				break;
		}
		
		C2D2_DesenhaTexto(fontemenu, 280, 264,nome, C2D2_TEXTO_ESQUERDA);	
		if(pisca<=30)
			C2D2_DesenhaTexto(fontemenu, 280, 264,nometemp, C2D2_TEXTO_ESQUERDA);
		if(pisca==60)
			pisca=0;
		pisca++;
		
		//labels
		C2D2_DesenhaTexto(fontemenu, 275, 220,"Insert your name:", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu2, 375, 322,"OK", C2D2_TEXTO_ESQUERDA);


		DesenhaSprite(black,0,0,0,800,600,255,255,255,alphaf);
		C2D2_DesenhaSprite(cursor,0,mouse->x,mouse->y);
		
/// FIM DESENHA

		C2D2_Sincroniza();
	}
	while(!encerra);
}

////////////////////////////////////////////////////////////////////////////////
void recordesInsere(int pontos)
{	

//arquivo
	tiporecorde vetrecs[5];
	FILE *recordes;
	
	recordes=fopen("./dados/recs.x85" ,"rb");
	fread(&vetrecs,sizeof(tiporecorde),5,recordes);
	
	int i;
	int temp, temp2;
	char tempnome[15]="none", tempnome2[15];
	int menorquedecima=1;
	
	for(i=4; i>=0; i-- )
	{
		
		menorquedecima=1;
		
		if( i > 0)
		{
			if(!(pontos<vetrecs[i-1].pts))
				menorquedecima=0;
		}
		
		if(pontos>=vetrecs[i].pts && menorquedecima==1 )
		{
			temp=pontos;
			
			recordesNome(tempnome);
			
			recordes=fopen("./dados/recs.x85" ,"wb");
			for(i=i; i<5; i++)
			{
				temp2=vetrecs[i].pts;
				strcpy(tempnome2,vetrecs[i].nome);
				vetrecs[i].pts=temp;
				strcpy(vetrecs[i].nome,tempnome);
				temp=temp2;
				strcpy(tempnome,tempnome2);
			}
			break;
		}
	}
	fwrite(&vetrecs,sizeof(tiporecorde),5,recordes);
	fclose(recordes);
	
}

////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////

int ask(int model)
{	

	// 1 - deseja sair ..
	// 2 - excluir recordes 
	// 3 - FUllscreen

	//c2d2...
	C2D2_Botao *teclado = C2D2_PegaTeclas();
	C2D2_Mouse *mouse = C2D2_PegaMouse();
	C2D2_TrocaCorLimpezaTela(0,0,0);
	
	//efeito fade entra sai
	int alphaf=250;
	int encerra=0;
	int fadeout=0;
	
	int numbots=2;
	
	switch(model)
	{
	
		case 1:
			estado=-1;
			fechajogo=1;
			break;
		case 2:
			estado=3; //quando der esc volta
			break;
		case 3:
			estado=3; //quando der esc volta
			break;
	}
	
	
	//posi��o etc dos bots
	botsask[0].x=182;
	botsask[0].y=320;
	botsask[0].a=40;
	botsask[0].l=40;
	botsask[0].img = botsmall;
	botsask[0].indx=0;

	
	botsask[1].x=578;
	botsask[1].y=320;
	botsask[1].a=40;
	botsask[1].l=40;
	botsask[1].img = botsmall;
	botsask[1].indx=2;
	
	
/// come�o do DO

	CA2_AjustaVolume(volmusic/2, volefeitos);
	
	do
	{

// efeitos...		
		//fade in...
		if(!fadeout && alphaf >0)
			alphaf-=10;
		//fadeout...
		if(fadeout)
			if(alphaf<=225)
			{	alphaf+=25;
			}else encerra=1;	
//fim efeitos	
			
		// sai com esc e fechando janela
		if(teclado[C2D2_ESC].pressionado || teclado[C2D2_ENCERRA].pressionado)
			fadeout=1;	
			
			
/// Desenho..
		C2D2_LimpaTela();
		
		C2D2_DesenhaSprite(fundoask,0, 0,0);	
		C2D2_DesenhaSprite(askwind,0, 221,200);	

		switch(DB(botsask,numbots))
		{
			case 0: // NO
				switch(model)
				{
					case 1:
						estado=1;
						fadeout=1;
						break;
					case 2:
						estado=3;
						fadeout=1;
						break;
					case 3:
						estado=3;
						fadeout=1;
						break;
				}
				break;
			case 1: // YES
				switch(model)
				{
					case 1:
						estado=-1;
						fechajogo=1;
						fadeout=1;
						break;
					case 2:
						recordesDefault();
						estado=3;
						fadeout=1;
						CA2_TocaEfeito(switchoff, 1);
						break;
					case 3:
						modotela=1;
						estado=-1;
						fadeout=1;
						break;
				}
				break;
		}
	
		//labels

		
		
		
		switch(model)
		{
			case 1:
				C2D2_DesenhaSprite(askicons,0,365,312);
				C2D2_DesenhaTexto(fontemenu, 275, 240,"Exit the game ?", C2D2_TEXTO_ESQUERDA);
				C2D2_DesenhaTexto(fontemenu2, 240, 320,"No", C2D2_TEXTO_ESQUERDA);
				C2D2_DesenhaTexto(fontemenu2, 508, 320,"Yes", C2D2_TEXTO_ESQUERDA);

				break;
			case 2:
				C2D2_DesenhaSprite(askicons,1,365,312);
				C2D2_DesenhaTexto(fontemenu, 265, 240,"Erase all records ?", C2D2_TEXTO_ESQUERDA);
				C2D2_DesenhaTexto(fontemenu2, 240, 320,"No", C2D2_TEXTO_ESQUERDA);
				C2D2_DesenhaTexto(fontemenu2, 508, 320,"Yes", C2D2_TEXTO_ESQUERDA);

				break;
			case 3:
				C2D2_DesenhaSprite(askicons,2,365,312);
				C2D2_DesenhaTexto(fontemenu, 320, 215,"Fullscreen?", C2D2_TEXTO_ESQUERDA);
				C2D2_DesenhaTexto(fontemenu, 234, 240,"must restart the game!", C2D2_TEXTO_ESQUERDA);
				C2D2_DesenhaTexto(fontemenu2, 240, 320,"No", C2D2_TEXTO_ESQUERDA);
				C2D2_DesenhaTexto(fontemenu2, 508, 320,"Yes", C2D2_TEXTO_ESQUERDA);

				break;
		}

		DesenhaSprite(black,0,0,0,800,600,255,255,255,alphaf);
		C2D2_DesenhaSprite(cursor,0,mouse->x,mouse->y);
		
/// FIM DESENHA

		C2D2_Sincroniza();
	}
	while(!encerra);
	CA2_AjustaVolume(volmusic, volefeitos);
}
////////////////////////////////////////////////////////////////////////////////

void play()
{
	
	SDL_WM_SetCaption("X85 / play", 0);	
	
	//c2d2...
	C2D2_Botao *teclado = C2D2_PegaTeclas();
	C2D2_Mouse *mouse = C2D2_PegaMouse();
	C2D2_TrocaCorLimpezaTela(0,0,0);
	
	//efeito fade entra sai
	int alphaf=250;
	int encerra=0;
	int fadeout=0;
	
	char spec_nave[10];
	
	int spec_speed;
	int spec_strenght;
	int spec_level;
	
	int largbar1=0;
	int largbar2=0;
	int largbar3=0;
	
	//posi��o etc dos bots
	//back <<
	botsplay[0].x=42;
	botsplay[0].y=440;
	botsplay[0].a=40;
	botsplay[0].l=40;
	botsplay[0].img = botsmall;
	botsplay[0].indx=0;
	//play
	botsplay[1].x=546;
	botsplay[1].y=400;
	botsplay[1].a=40;
	botsplay[1].l=60;
	botsplay[1].img = botok;
	botsplay[1].indx=0;
	//wind nave <<
	botsplay[2].x=148;
	botsplay[2].y=230;
	botsplay[2].a=40;
	botsplay[2].l=40;
	botsplay[2].img = botsmall;
	botsplay[2].indx=0;
	//wind nave >>
	botsplay[3].x=348;
	botsplay[3].y=230;
	botsplay[3].a=40;
	botsplay[3].l=40;
	botsplay[3].img = botsmall;
	botsplay[3].indx=2;
	//wind level <<
	botsplay[4].x=418;
	botsplay[4].y=230;
	botsplay[4].a=40;
	botsplay[4].l=40;
	botsplay[4].img = botsmall;
	botsplay[4].indx=0;
	//wind level >>
	botsplay[5].x=618;
	botsplay[5].y=230;
	botsplay[5].a=40;
	botsplay[5].l=40;
	botsplay[5].img = botsmall;
	botsplay[5].indx=2;
	
	
/// come�o do DO
	do
	{

// efeitos...		
		//fade in...
		if(!fadeout && alphaf >0)
			alphaf-=10;
		//fadeout...
		if(fadeout)
			if(alphaf<=225)
			{	alphaf+=25;
			}else encerra=1;
			
			
		//logica barra speed
		if(((largbar1*100)/180)<spec_speed)
			largbar1+=5;
		if(((largbar1*100)/180)>spec_speed)
			largbar1-=5;
		//logica barra strenght
		if(((largbar2*100)/180)<spec_strenght)
			largbar2+=5;
		if(((largbar2*100)/180)>spec_strenght)
			largbar2-=5;
		//logica barra level
		if(((largbar3*100)/180)<spec_level)
			largbar3+=5;
		if(((largbar3*100)/180)>spec_level)
			largbar3-=5;
		
//fim efeitos	
			
		// sai com esc e fechando janela
		if(teclado[C2D2_ESC].pressionado || teclado[C2D2_ENCERRA].pressionado)
		{
			estado=1;
			fadeout=1;
		}
		
		//specs
		switch(modnave+1)
		{
			case 1:
				sprintf(spec_nave,"X85-1");
				spec_speed=20;
				spec_strenght=80;
				break;
				
			case 2:
				sprintf(spec_nave,"X85-2");
				spec_speed=80;
				spec_strenght=20;
				break;
				
			case 3:
				sprintf(spec_nave,"X85-3");
				spec_speed=40;
				spec_strenght=60;
				break;
		}
		switch(modfase+1)
		{
			case 1:
				spec_level=20;
				break;
			case 2:
				spec_level=60;
				break;
			case 3:
				spec_level=100;
				break;

		}	
		
/// Desenho..
		C2D2_LimpaTela();
		C2D2_DesenhaSprite(fundosub,0,0,0);
		
		//specs wind
		C2D2_DesenhaSprite(specs,0,180,338);

		switch(DB(botsplay,6))
		{
			case 0:// back
				estado=1;
				fadeout=1;
				break;
			case 1: // GO !
				estado=10;
				fadeout=1;
				CA2_TocaEfeito(switchon, 1);
				break;
			case 2:
				if(modnave>0)
					modnave--;
				else modnave=2;
				CA2_TocaEfeito(sombot2, 1);
				break;
			case 3:
				if(modnave<=1)
					modnave++;
				else modnave=0;
				CA2_TocaEfeito(sombot, 1);
				break;
			case 4:
				if(modfase>0)
					modfase--;
				else modfase=2;
				CA2_TocaEfeito(sombot2, 1);
				break;
			case 5:
				if(modfase<=1)
					modfase++;
				else modfase=0;
				CA2_TocaEfeito(sombot, 1);
				break;
		}
		
		//winds
		C2D2_DesenhaSprite(winds,0,180,160);
		C2D2_DesenhaSprite(winds,0,450,160);
		
		//naves
		C2D2_DesenhaSprite(naves,modnave,200,178);
		//fases
		C2D2_DesenhaSprite(fases,modfase,468,178);
		
		//barras
		DesenhaSprite(barspec,0, 290, 388, largbar1,23,255,255,255, 255);
		DesenhaSprite(barspec,0, 290, 418, largbar2,23,255,255,255, 255);
		DesenhaSprite(barspec,0, 290, 448, largbar3,23,255,255,255, 255);

		//labels
		C2D2_DesenhaTexto(fontemenu2, 120, 100,"play", C2D2_TEXTO_ESQUERDA);

		C2D2_DesenhaTexto(fontemenu, 555, 402,"go!", C2D2_TEXTO_ESQUERDA);
		
		//spec-labels
		C2D2_DesenhaTexto(fontemenu, 298, 350,spec_nave, C2D2_TEXTO_ESQUERDA);
		
		
		DesenhaSprite(black,0,0,0,800,600,255,255,255,alphaf);
		C2D2_DesenhaSprite(cursor,0,mouse->x,mouse->y);
/// FIM DESENHA

		C2D2_Sincroniza();
	}
	while(!encerra);

}
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
void options()
{	

	 SDL_WM_SetCaption("X85 / options", 0);		
	
	//c2d2...
	C2D2_Botao *teclado = C2D2_PegaTeclas();
	C2D2_Mouse *mouse = C2D2_PegaMouse();
	C2D2_TrocaCorLimpezaTela(0,0,0);
	
	//efeito fade entra sai
	int alphaf=250;
	int encerra=0;
	int fadeout=0;
	
	//volume
	int largvolbarm=(volmusic*180)/100;
	int largvolbare=(volefeitos*180)/100;
	char varvolmusic[5];
	char varvolefeitos[5];
	
	
	//posi��o etc dos bots
	botsops[0].x=42;
	botsops[0].y=440;
	botsops[0].a=40;
	botsops[0].l=40;
	botsops[0].img = botsmall;
	botsops[0].indx=0;
	
	botsops[1].x=144;
	botsops[1].y=165;
	botsops[1].a=40;
	botsops[1].l=40;
	botsops[1].img = botsmall;
	botsops[1].indx=0;
	
	botsops[2].x=366;
	botsops[2].y=165;
	botsops[2].a=40;
	botsops[2].l=40;
	botsops[2].img = botsmall;
	botsops[2].indx=2;

	botsops[3].x=144;
	botsops[3].y=225;
	botsops[3].a=40;
	botsops[3].l=40;
	botsops[3].img = botsmall;
	botsops[3].indx=0;

	botsops[4].x=366;
	botsops[4].y=225;
	botsops[4].a=40;
	botsops[4].l=40;
	botsops[4].img = botsmall;
	botsops[4].indx=2;

	botsops[5].x=165;
	botsops[5].y=300;
	botsops[5].a=35;
	botsops[5].l=220;
	botsops[5].img = botcheck;
	botsops[5].indx=0;
	
	botsops[6].x=165;
	botsops[6].y=350;
	botsops[6].a=35;
	botsops[6].l=220;
	botsops[6].img = botcheck;
	if(modotela==0)
		botsops[6].indx=0;
	else
		botsops[6].indx=2;
		
	botsops[7].x=165;
	botsops[7].y=400;
	botsops[7].a=35;
	botsops[7].l=220;
	botsops[7].img = botcheck;
	botsops[7].indx=0;
	
	
	
/// come�o do DO
	do
	{

// efeitos...		
		//fade in...
		if(!fadeout && alphaf >0)
			alphaf-=10;
		//fadeout...
		if(fadeout)
			if(alphaf<=225)
			{	alphaf+=25;
			}else encerra=1;
			

			
		
		
		
//fim efeitos	
			
		// sai com esc e fechando janela
		if(teclado[C2D2_ESC].pressionado || teclado[C2D2_ENCERRA].pressionado)
		{
			estado=1;
			fadeout=1;
		}	
			
		//logica barra volume mus
		if(((largvolbarm*100)/180)<volmusic)
			largvolbarm+=2;
		if(((largvolbarm*100)/180)>volmusic)
			largvolbarm-=2;
		//logica barra volume fx
		if(((largvolbare*100)/180)<volefeitos)
			largvolbare+=2;
		if(((largvolbare*100)/180)>volefeitos)
			largvolbare-=2;
		if(mute)
			botsops[5].indx=2;


			
/// Desenho..
		C2D2_LimpaTela();
		C2D2_DesenhaSprite(fundosub,0,0,0);

		switch(DB(botsops,8))
		{
			case 0:
				estado=1;
				fadeout=1;
				break;
			case 11:
				if(volmusic>0)
					volmusic-=1;
				break;
			case 12:
				if(volmusic<100 && !mute)
					volmusic+=1;
				break;
			case 13:
				if(volefeitos>0)
					volefeitos-=1;
				CA2_TocaEfeito(sombot2, 1);
				break;
			case 14:
				if(volefeitos<100 && !mute)
					volefeitos+=1;
				CA2_TocaEfeito(sombot, 1);
				break;
			
		//mute
			case 5: 
				if(botsops[5].indx==0){
					botsops[5].indx=2;
					mute=1;
					oldvolumes[0]=volmusic;
					oldvolumes[1]=volefeitos;
					volmusic=0;
					volefeitos=0;
				}else{
					mute=0;
					botsops[5].indx=0;
					volmusic=oldvolumes[0];
					volefeitos=oldvolumes[1];
				}	
				break;
				
			case 6:  // FULLSCREEN
				if(modotela==0){
					estado=8;
					fadeout=1;
				}else{
					modotela=0;
					estado=-1;
					fadeout=1;
				}	
				break;
			//ask screen
			case 7:
				estado=7;
				fadeout=1;
				break;

			
		}
		
		//desenha volume
		C2D2_DesenhaSprite(backvol,0,175,150);
		C2D2_DesenhaSprite(backvol,0,175,210);
		
		DesenhaSprite(barvol,0, 186, 161, largvolbarm, 48, 255,255,255, 255);
		DesenhaSprite(barvol,0, 186, 221, largvolbare, 48, 255,255,255, 255);

		
		//labels
		C2D2_DesenhaTexto(fontemenu2, 120, 100,"options", C2D2_TEXTO_ESQUERDA);
		sprintf(varvolmusic,"%d%%",volmusic);
		sprintf(varvolefeitos,"%d%%",volefeitos);
		C2D2_DesenhaTexto(fontemenu, 255,168 ,varvolmusic, C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu, 255,228 ,varvolefeitos, C2D2_TEXTO_ESQUERDA);

		C2D2_DesenhaTexto(fontemenu, 450,164 ,"(music)", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu, 450,224 ,"(efects)", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu, 215,300 ,"all mute", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu, 198,350 ,"fullscreen", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu, 180,400 ,"clear records", C2D2_TEXTO_ESQUERDA);
		
		DesenhaSprite(black,0,0,0,800,600,255,255,255,alphaf);
		C2D2_DesenhaSprite(cursor,0,mouse->x,mouse->y);
/// FIM DESENHA
		CA2_AjustaVolume(volmusic, volefeitos);
		C2D2_Sincroniza();
	}
	while(!encerra);
}

////////////////////////////////////////////////////////////////////////////////
void records()
{	

	SDL_WM_SetCaption("X85 / records", 0);

	//c2d2...
	C2D2_Botao *teclado = C2D2_PegaTeclas();
	C2D2_Mouse *mouse = C2D2_PegaMouse();
	C2D2_TrocaCorLimpezaTela(0,0,0);
	
	//arquivo
	tiporecorde vetrecs[5];
	FILE *recordes;
	
	
	int i;
	char pontos[5][10];
	
	//efeito fade entra sai
	int alphaf=250;
	int encerra=0;
	int fadeout=0;
	
	//alpha logo barra primeiro colocado
	int alpha=0, dalpha=5;
	
	//aplica default
	recordes=fopen("./dados/recs.x85" ,"rb");
	if (recordes==NULL)
	{
		recordesDefault();
		recordes=fopen("./dados/recs.x85" ,"rb");
	}
	fread(&vetrecs,sizeof(tiporecorde),5,recordes);
	
	
	//posi��o etc dos bots
	botsrecords[0].x=42;
	botsrecords[0].y=440;
	botsrecords[0].a=40;
	botsrecords[0].l=40;
	botsrecords[0].img = botsmall;
	botsrecords[0].indx=0;
	
	
/// come�o do DO
	do
	{

// efeitos...		
		//fade in...
		if(!fadeout && alphaf >0)
			alphaf-=10;
		//fadeout...
		if(fadeout)
			if(alphaf<=225)
			{	alphaf+=25;
			}else encerra=1;
		
		//alpha da barra do primeiro lugar
		alpha+=dalpha;
		if(alpha==0|| alpha==255)
			dalpha*=-1;
			
//fim efeitos	
			
		// sai com esc e fechando janela
		if(teclado[C2D2_ESC].pressionado || teclado[C2D2_ENCERRA].pressionado)
			fadeout=1;	
			
			
/// Desenho..
		C2D2_LimpaTela();
		C2D2_DesenhaSprite(fundosub,0,0,0);

		switch(DB(botsrecords,1))
		{
			case 0:
				fadeout=1;
				break;
		}
		//tabs:
		C2D2_DesenhaSprite(recordstab,0,160,154);
		C2D2_DesenhaSprite(recordstab,1,160,210);
		DesenhaSprite(recordstab,3,160,210,486,52,255,255,255,alpha);
		C2D2_DesenhaSprite(recordstab,1,160,265);
		C2D2_DesenhaSprite(recordstab,1,160,320);
		C2D2_DesenhaSprite(recordstab,2,160,375);
		C2D2_DesenhaSprite(recordstab,2,160,430);
		//trofeus:
		C2D2_DesenhaSprite(trofeus,0,160,212);
		C2D2_DesenhaSprite(trofeus,1,160,267);
		C2D2_DesenhaSprite(trofeus,2,160,322);
		
		//labels
		C2D2_DesenhaTexto(fontemenu2, 120, 100,"records", C2D2_TEXTO_ESQUERDA);

		
		//teste pontos
		for(i=0;i<5;i++)
			sprintf(pontos[i],"%d",vetrecs[i].pts);
		for(i=0;i<5;i++)
		{	
			
			C2D2_DesenhaTexto(fontemenu, 315, 220+(55*i),vetrecs[i].nome, C2D2_TEXTO_CENTRALIZADO);
			C2D2_DesenhaTexto(fontemenu, 630, 220+(55*i),pontos[i], C2D2_TEXTO_DIREITA);
		}
		
		DesenhaSprite(black,0,0,0,800,600,255,255,255,alphaf);
		C2D2_DesenhaSprite(cursor,0,mouse->x,mouse->y);
/// FIM DESENHA

		C2D2_Sincroniza();
	}
	while(!encerra);
	fclose(recordes);
	estado=1;

}

////////////////////////////////////////////////////////////////////////////////
void credits()
{	

	SDL_WM_SetCaption("X85 / about", 0);

	//c2d2...
	C2D2_Botao *teclado = C2D2_PegaTeclas();
	C2D2_Mouse *mouse = C2D2_PegaMouse();
	C2D2_TrocaCorLimpezaTela(0,0,0);
	
	//efeito fade entra sai
	int alphaf=250;
	int encerra=0;
	int fadeout=0;
	
	
	//posi��o etc dos bots
	botscredits[0].x=42;
	botscredits[0].y=440;
	botscredits[0].a=40;
	botscredits[0].l=40;
	botscredits[0].img = botsmall;
	botscredits[0].indx=0;
	
	
/// come�o do DO
	do
	{

// efeitos...		
		//fade in...
		if(!fadeout && alphaf >0)
			alphaf-=10;
		//fadeout...
		if(fadeout)
			if(alphaf<=225)
			{	alphaf+=25;
			}else encerra=1;	
//fim efeitos	
			
		// sai com esc e fechando janela
		if(teclado[C2D2_ESC].pressionado || teclado[C2D2_ENCERRA].pressionado)
			fadeout=1;	
			
			
/// Desenho..
		C2D2_LimpaTela();
		C2D2_DesenhaSprite(fundosub,0,0,0);

		switch(DB(botscredits,1))
		{
			case 0:
				fadeout=1;
				break;
		}

		
		//labels
		C2D2_DesenhaTexto(fontemenu2, 120, 100,"about", C2D2_TEXTO_ESQUERDA);

		//cretitos
		C2D2_DesenhaTexto(fontemenu, 150, 150,"Main Team:", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu2, 330, 170,"Alessandro", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu2, 330, 190,"Christian Isenberg", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu2, 330, 210,"Matheus Gobato Nunes", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu2, 330, 210,"", C2D2_TEXTO_ESQUERDA);
		
		C2D2_DesenhaTexto(fontemenu, 150, 250,"Chien2D2:", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu2, 330, 270,"P.V.", C2D2_TEXTO_ESQUERDA);


		C2D2_DesenhaTexto(fontemenu, 150, 310,"Musics:", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu2, 330, 330,"???", C2D2_TEXTO_ESQUERDA);
		
		
		C2D2_DesenhaSprite(logotipos,0,360,420);

		
		DesenhaSprite(black,0,0,0,800,600,255,255,255,alphaf);
		C2D2_DesenhaSprite(cursor,0,mouse->x,mouse->y);
/// FIM DESENHA

		C2D2_Sincroniza();
	}
	while(!encerra);
	estado=1;

}

////////////////////////////////////////////////////////////////////////////////
void mainmenu()
{

	SDL_WM_SetCaption("X85", 0);

	//c2d2...
	C2D2_Botao *teclado = C2D2_PegaTeclas();
	C2D2_Mouse *mouse = C2D2_PegaMouse();
	C2D2_TrocaCorLimpezaTela(0,0,0);
	
	//efeito fade
	int alphaf=250;
	int encerra=0;
	int fadeout=0;
	
	//efeito slide de naves
	int slidealpha=0;
	int slideindx=0;
	int slidetempo=0;

	
////posi��o dos bot�es	
	//defini��es iguais para os 4 primeiros
	for(i=0; i<4; i++)
	{
		botsmain[i].x=-20;
		botsmain[i].a=60;
		botsmain[i].l=350;
		botsmain[i].img = botmainimg;
		botsmain[i].indx=0;
	}

	
	//start	
	botsmain[0].y=130;
	//ops
	botsmain[1].y=210;
	//records
	botsmain[2].y=290;
	//credits
	botsmain[3].y=370;
	//exit
	botsmain[4].x=-120;
	botsmain[4].y=450;
	botsmain[4].a=60;
	botsmain[4].l=350;
	botsmain[4].img = botmainimg;
	botsmain[4].indx=0;
	
/// come�o do DO
	do
	{
// efeitos...
		
		//fade in...
		if(!fadeout && alphaf >=10)
			alphaf-=10;
		//fadeout...
		if(fadeout)
			if(alphaf<=225)
			{	alphaf+=25;
			}else encerra=1;
			
		// sai com esc e fechando janela
		if(teclado[C2D2_ESC].pressionado || teclado[C2D2_ENCERRA].pressionado)
		{
			estado=6;
			fadeout=1;
		}
		
		//efeito slide
		if(slidealpha<250 && slidetempo==0 && alphaf==0 )
			slidealpha+=10;
		else
			slidetempo++;
			
		if(slidetempo>=120 && slidealpha>0)
		{
			slidealpha-=5;
		}
		else if(slidealpha==0)
		{
			if(slideindx<5)
				slideindx++;
			else
				slideindx=0;
				
			slidetempo=0;
		}	
		
		
/// Desenho..
		//
		C2D2_LimpaTela();
		C2D2_DesenhaSprite(fundomain,0,0,0);
		
		//desenha testa bot�es 
		switch(DB(botsmain,5))
		{
			case 0: // play
				estado=2;
				fadeout=1;
				break;
			case 1: // ops
				estado=3;
				fadeout=1;
				break;
			case 2: // records
				estado=4;
				fadeout=1;
				break;
			case 3: // about
				estado=5;
				fadeout=1;
				break;
			case 4: //exit
				estado=6;
				fadeout=1;
				break;
		}		
		//texto dos bots
		C2D2_DesenhaTexto(fontemenu, 118, 144,"Start Game", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu, 118, 224,"Main Options", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu, 118, 304,"Records", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu, 118, 384,"About", C2D2_TEXTO_ESQUERDA);
		C2D2_DesenhaTexto(fontemenu, 118, 464,"exit", C2D2_TEXTO_ESQUERDA);
		
		DesenhaSprite(navesslide,slideindx,480,140,320,320,255,255,255,slidealpha);

		C2D2_DesenhaSprite(left,0,0,0);
		
		DesenhaSprite(black,0,0,0,800,600,255,255,255,alphaf);
		C2D2_DesenhaSprite(cursor,0,mouse->x,mouse->y);
		//
		/// FIM DESENHA
			
		C2D2_Sincroniza();
	}
	while(!encerra);
}

int inicia()
{
	
	
	if(modotela==0)
		C2D2_Inicia(800, 600, C2D2_JANELA, C2D2_DESENHO_OPENGL, "X85");
	else
		C2D2_Inicia(800, 600, C2D2_TELA_CHEIA, C2D2_DESENHO_OPENGL, "X85");
	
	// Inicia o �udio
	C2D2P_Inicia();
	C2D2M_Inicia();
	CA2_Inicia ();
	// Obt�m o teclado
	C2D2_Botao *teclado = C2D2_PegaTeclas();
	
	
	//base
	fundol = C2D2_CarregaSpriteSet("./dados/loadfundo.jpg", 0, 0);
	black = C2D2_CarregaSpriteSet("./dados/black.png", 0, 0);

	
	
	while(estado!=-1)
	{
		switch(estado)
		{   
			
			case 0:
				loading(1);
				CA2_TocaMusica(musicmenu,-1);
				break;
			case 1:
				mainmenu();
				break;
			case 2:
				play();
				break;
			case 3:
				options();
				break;
			case 4:
				records();
				break;
			case 5:
				credits();
				break;
			case 6:
				ask(1);
				break;
			case 7:
				ask(2);
				break;
			case 8:
				//recordesInsere(91000);
				ask(3);
				break;
			case 10:
				CA2_FadeMusica (1000);
				C2D2_DesenhaSprite(fundol,0,0,0);
				C2D2_Sincroniza();
				mainjogo(modnave,modfase);
				CA2_TocaMusica(musicmenu,-1);
				estado=4;
				break;


		}
	}

	// Encerra tudo
	//CA2_Encerra();
	C2D2M_Encerra ();
	C2D2_Encerra();
	return 0;
}

int main(int ac, char **av)
{
	while(!fechajogo)
	{	
		estado=0;
		inicia();
	}
	return 0;
}

