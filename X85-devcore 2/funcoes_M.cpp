#include "funcoes_M.h"

//variaveis globais do menu e jogo
int estado_atual;
int planeta_max=5;

tiposave saveAtual;
int slotAtual;

int volume_effects=30, volume_music=30;

int encerra=0;
int fadealpha=0;
bool fadecontrol=false;

void XDesenhaSprite(unsigned int id,unsigned int indice,int posx, int posy,int largura,int altura,int alpha)
{
	//quando vai desenhar com o tamanho que foi carregado
	if(largura==0 || altura==0)
	{
		largura=sprites[id-1].spLargura; //olhar chien2d2 para referencia :P
		altura=sprites[id-1].spAltura;
	}

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

	C2D2_DesenhaSpriteEfeito(id, indice, x, y, 255,255,255,alpha);
}

int XDesenhaBotao(unsigned int idbot,int indx, int x,int y, unsigned int idcursor,int &alpha )
{
	C2D2_Mouse *mouse = C2D2_PegaMouse();
	//botão normal
	C2D2_DesenhaSprite(idbot,indx,x,y);
    //botão selecionado
	XDesenhaSprite(idbot,indx+1,x,y,0,0,alpha);

	if(C2D2_ColidiuSprites(idcursor, 1, mouse->x, mouse->y, idbot, indx, x, y))
	{
		if(alpha<250)
			alpha+=25;
		if(mouse->botoes[C2D2_MESQUERDO].pressionado)
			return 1;
		else if(mouse->botoes[C2D2_MESQUERDO].ativo)
			return 2;
		else if(mouse->botoes[C2D2_MESQUERDO].liberado)
			return 3;
	}else
	{
		if(alpha>0)
			alpha-=25;
		return false;
	}
	return NULL;
}

void planetas_atualiza(planeta **planetas, int atual,int max)
{
    int pos_x = 325;
    int pos_y = 225;
    int tamanho_centro = 150;
    int smooth=10;

	// ATUAL... o do meio
	if(planetas[atual]->tamanho < tamanho_centro)
		planetas[atual]->tamanho += (tamanho_centro - planetas[atual]->tamanho) /smooth +1;
	else if(planetas[atual]->tamanho > tamanho_centro)
		planetas[atual]->tamanho -= (planetas[atual]->tamanho - tamanho_centro) /smooth +1;

	if(planetas[atual]->x < pos_x)
		planetas[atual]->x += (pos_x - planetas[atual]->x) /smooth +1;
	else if(planetas[atual]->x > pos_x)
		planetas[atual]->x -= (planetas[atual]->x - pos_x) /smooth +1;

	if(planetas[atual]->y < pos_y)
		planetas[atual]->y += (pos_y - planetas[atual]->y) /smooth +1;
	else if(planetas[atual]->y > pos_y)
		planetas[atual]->y -= (planetas[atual]->y - pos_y) /smooth +1;

	planetas[atual]->alpha = 255;

	// DA DIREITA
	for(int i=atual+1;i<max;i++)
	{
//	    if(planetas[i]->tamanho < (planetas[i-1]->tamanho / 2))
//            planetas[i]->tamanho += ((planetas[i-1]->tamanho / 2) - planetas[i]->tamanho) /smooth +1;
//        else if(planetas[i]->tamanho > (planetas[i-1]->tamanho / 2))
//            planetas[i]->tamanho -= (planetas[i]->tamanho - (planetas[i-1]->tamanho / 2)) /smooth +1;

		planetas[i]->tamanho = planetas[i-1]->tamanho / 2 ;
//		planetas[i]->x = planetas[i-1]->x + ((planetas[i-1]->tamanho - planetas[i]->tamanho)/2);
//		planetas[i]->y = (planetas[i-1]->y+ planetas[i-1]->tamanho) + 20 ;
		planetas[i]->x = (planetas[i-1]->x + planetas[i-1]->tamanho) + 20 ;
		planetas[i]->y = planetas[i-1]->y+((planetas[i-1]->tamanho - planetas[i]->tamanho)/2);
		planetas[i]->alpha = planetas[i-1]->alpha - 50;
	}

	// DA Esquerda
	for(int i=atual-1;i>=0;i--)
	{
//        if(planetas[i]->tamanho < (planetas[i+1]->tamanho / 2))
//            planetas[i]->tamanho += ((planetas[i+1]->tamanho / 2) - planetas[i]->tamanho) /smooth +1;
//        else if(planetas[i]->tamanho > (planetas[i+1]->tamanho / 2))
//            planetas[i]->tamanho -= (planetas[i]->tamanho - (planetas[i+1]->tamanho / 2)) /smooth +1;


		planetas[i]->tamanho = planetas[i+1]->tamanho * 2 ;
//		planetas[i]->x = planetas[i+1]->x +((planetas[i+1]->tamanho - planetas[i]->tamanho)/2);
//		planetas[i]->y = (planetas[i+1]->y - planetas[i]->tamanho) - 20;
		planetas[i]->x = (planetas[i+1]->x - planetas[i]->tamanho) - 20;
		planetas[i]->y = planetas[i+1]->y+((planetas[i+1]->tamanho - planetas[i]->tamanho)/2);
		planetas[i]->alpha = planetas[i+1]->alpha /2;
	}

}

int atualiza_barra(int &yatual, int ymax, int ymin, C2D2_Mouse *mouse)
{
	int tamanho = ymax-ymin;
	if( ((ymax-mouse->y)*100)/tamanho >= 100)
		yatual=ymin;
	else if(((ymax-mouse->y)*100)/tamanho <=0 )
		yatual=ymax;
	else
		yatual=mouse->y;
	//retorna porcentagem da barra
	return ((ymax-yatual)*100)/tamanho;
}

void menu_recordes_default()
{
		//arquivo
		tiporecorde vetrecs[7];
		FILE *recordes;

		recordes=fopen("./dados/recs.x85" ,"wb");

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
        sprintf(vetrecs[5].nome,"bill");
		vetrecs[5].pts=600;
		sprintf(vetrecs[6].nome,"noob");
		vetrecs[6].pts=500;
		fwrite(&vetrecs,sizeof(tiporecorde),7,recordes);
		fclose(recordes);
}

void menu_recordes_insere(int pontos, char *tempnome)
{
	tiporecorde vetrecs[7];
	FILE *recordes;

	recordes=fopen("./dados/recs.x85" ,"rb");
	fread(&vetrecs,sizeof(tiporecorde),7,recordes);
	fclose(recordes);

	int i;
	int temp, temp2;
	char tempnome2[15];

	for(i=0; i<7; i++ )
	{

		if(pontos>=vetrecs[i].pts )
		{
			temp=pontos;

			recordes=fopen("./dados/recs.x85" ,"wb");

			for(; i<7; i++)
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
	fwrite(&vetrecs,sizeof(tiporecorde),7,recordes);
	fclose(recordes);
}

void menu_saves_default()
{
    FILE *saves = fopen("./dados/saves.x85" ,"wb");
    fclose(saves);
    char nome[15]="new";
    for(int i=0 ; i<3; menu_saves_edit(i++, nome, EASY, true));
}

void menu_saves_carregavetor(tiposave *vetsaves)
{
    FILE *saves;
    saves=fopen("./dados/saves.x85" ,"rb");
    fread(vetsaves,sizeof(tiposave),3,saves);
    fclose(saves);
}

void menu_saves_saveslot(int slot)
{
    tiposave vetsaves[3];
	FILE *saves;
    //carrega saves atuais
    menu_saves_carregavetor(vetsaves);
    //abre para escrita
    saves=fopen("./dados/saves.x85" ,"wb");
    //seta o slot com o nome e zera o resto
    vetsaves[slot].planeta_liberado=saveAtual.planeta_liberado;
    vetsaves[slot].pts=saveAtual.pts;
    vetsaves[slot].planeta_atual=saveAtual.planeta_atual;
    memcpy(vetsaves[slot].tiro_liberado, saveAtual.tiro_liberado, sizeof(bool)*6);
    //grava e fecha esse trem !
	fwrite(&vetsaves,sizeof(tiposave),3,saves);
	fclose(saves);
}

void menu_saves_loadslot(int slot)
{
    tiposave vetsaves[3];
    //carrega saves atuais
    menu_saves_carregavetor(vetsaves);
    saveAtual.planeta_liberado=vetsaves[slot].planeta_liberado;
    saveAtual.pts=vetsaves[slot].pts;
    saveAtual.planeta_atual=vetsaves[slot].planeta_atual;
    memcpy(saveAtual.tiro_liberado,vetsaves[slot].tiro_liberado, sizeof(bool)*6);
    memcpy(saveAtual.nome,vetsaves[slot].nome, sizeof(char)*15);
}

void menu_saves_edit(int slot, char nome[15], int level, bool empty)
{
    tiposave vetsaves[3];
	FILE *saves;
    //carrega saves atuais
    menu_saves_carregavetor(vetsaves);
    //abre para escrita
    saves=fopen("./dados/saves.x85" ,"wb");
    //seta o slot com o nome e zera o resto
    sprintf(vetsaves[slot].nome,nome);
    vetsaves[slot].level = level;
    vetsaves[slot].planeta_liberado=0;
    vetsaves[slot].planeta_atual=0;
    vetsaves[slot].pts=0;
    //vetsaves[slot].tiro_liberado={1,0,0,0,0,0};
    vetsaves[slot].tiro_liberado[0]=1;
    memset(vetsaves[slot].tiro_liberado+1,0,sizeof(bool)*5);

    vetsaves[slot].empty=empty;
    //grava e fecha esse trem !
	fwrite(&vetsaves,sizeof(tiposave),3,saves);
	fclose(saves);
}

