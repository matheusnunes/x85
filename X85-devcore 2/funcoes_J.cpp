#include "funcoes_J.h"
#include <math.h>
void jogo_atualiza_fundo(float *ypersf1,float *ypersf2)
{
	if (*ypersf1 > 0) {
		*ypersf1 = (float)-600;
	}
	if (*ypersf2 > 600) {
		*ypersf2 = 0;
	}
	*ypersf1 += 0.5;
	*ypersf2 += 0.5;
}

void jogo_cria_estrela(C2D2P_Ponto *estrelas, int max)
{
	for (int i = 0; i < max; i++) {
		estrelas[i][0] = rand() % 800;
		estrelas[i][1] = rand() % 600;
	}
}

void jogo_atualiza_estrela(C2D2P_Ponto *estrelas, int vel, int max)
{
	for(int i = 0; i < max; i++)
	{
		if((estrelas[i][1] += vel) > 599)
		{
			estrelas[i][1] = rand() % 1;
			estrelas[i][0] = rand() % 808;
		}
	}
}

void jogo_atualiza_jogador(Nave  *jogador,Explo *explos)
{
	static C2D2_Mouse *mouse = C2D2_PegaMouse();
	static C2D2_Botao *teclado = C2D2_PegaTeclas();

	static int velocidade = 15;

	//mouse
  //  jogador->yaux=mouse->y;
  //  jogador->xaux=mouse->x;

    //teclado
	if(jogador->tipo!=INVALIDO)
	{
        if((teclado[C2D2_CIMA].pressionado || teclado[C2D2_CIMA].ativo) && jogador->yaux > velocidade)
            jogador->yaux-=velocidade;
        if((teclado[C2D2_BAIXO].pressionado || teclado[C2D2_BAIXO].ativo) && jogador->yaux < 600+velocidade)
            jogador->yaux+=velocidade;
        if((teclado[C2D2_DIREITA].pressionado || teclado[C2D2_DIREITA].ativo) && jogador->xaux < 800+velocidade)
            jogador->xaux+=velocidade;
        if((teclado[C2D2_ESQUERDA].pressionado || teclado[C2D2_ESQUERDA].ativo) && jogador->xaux > velocidade)
            jogador->xaux-=velocidade;
	}
    //atualiza
    if(jogador->x < jogador->xaux && jogador->x < 720 )
    jogador->x += (jogador->xaux - jogador->x)/jogador->velocidade+1;

	else if(jogador->x > jogador->xaux )
		jogador->x -= (jogador->x - jogador->xaux)/ jogador->velocidade +1;

	if(jogador->y < jogador->yaux && jogador->y < 520 )
		jogador->y += (jogador->yaux - jogador->y)/ jogador->velocidade +1;

	else if(jogador->y > jogador->yaux)
		jogador->y -= (jogador->y - jogador->yaux)/ jogador->velocidade +1;



    if(jogador->energia <= 0 && jogador->tipo != INVALIDO)
    {
        jogador->tipo = INVALIDO;
        jogo_cria_explosao(jogador->x,jogador->y,explos);
    }

}

void jogo_atualiza_barras(int *altura_energia, Nave *jogador)
{
	if((*altura_energia) < jogador->energia)
		(*altura_energia)++;
	if((*altura_energia) > jogador->energia)
		(*altura_energia)--;
}

void jogo_inicia_jogador(Nave *jogador)
{
	jogador->x=400;
	jogador->y=400;
	jogador->xaux = jogador->x;
	jogador->yaux = jogador->y;
	jogador->intervalo_tiro=0;
	jogador->velocidade=20;
	jogador->tipo=X85;
	jogador->escudo=100;
	jogador->energia=10000;
	jogador->tiro_atual=TIRO1;
	jogador->bomba_atual=BOMBA1;
	jogador->n_bombas=50;
}

void jogo_cria_tiro(Tiro *tiro, Nave *jogador, int tipo_tiro)
{
    if(tipo_tiro==TIRO1)
    {
        for(int i=0;i<MAXTIROS;i++)
        if(tiro[i].tipo == INVALIDO)
        {
            jogador->intervalo_tiro=4;
            tiro[i].tipo=TIRO1;
            tiro[i].x = jogador->x +21 ;
            tiro[i].y = jogador->y;
            tiro[i].tamanho = 0 ;
            tiro[i].alpha=255;
            break;
        }
    }
    else if(tipo_tiro==TIRO2)
    {
        for(int i=0;i<MAXTIROS;i++)
        if(tiro[i].tipo == INVALIDO)
        {

            jogador->intervalo_tiro=6;
            tiro[i].tipo=TIRO2;
            tiro[i].x = jogador->x +14 ;
            tiro[i].y = jogador->y;
            tiro[i].tamanho = 0 ;
            tiro[i].alpha=255;
            break;
        }
    }
    else if(tipo_tiro==TIRO3)
    {
        for(int i=0;i<MAXTIROS;i++)
        if(tiro[i].tipo == INVALIDO)
        {
            jogador->intervalo_tiro=6;
            tiro[i].tipo=TIRO3;
            tiro[i].x = jogador->x +29 ;
            tiro[i].y = jogador->y;
            tiro[i].tamanho = 5;
            tiro[i].alpha=255;
            break;
        }
    }
    else if(tipo_tiro==TIRO4)
    {
        for(int n=-1;n<2;n++)
        for(int i=0;i<MAXTIROS;i++)
        if(tiro[i].tipo == INVALIDO)
        {
            jogador->intervalo_tiro=12;
            tiro[i].tipo=TIRO4;
            tiro[i].x = jogador->x +27 + n*10;
            tiro[i].y = jogador->y;
            tiro[i].tamanho = 5;
            tiro[i].alpha=255;
            tiro[i].id = n;
            break;
        }
    }
    else if(tipo_tiro==TIRO5)
    {
        for(int i=0;i<MAXTIROS;i++)
        if(tiro[i].tipo == INVALIDO)
        {
            jogador->intervalo_tiro=6;
            tiro[i].tipo=TIRO5;
            tiro[i].x = jogador->x +29;
            tiro[i].y = jogador->y-5;
            tiro[i].tamanho = 10;
            tiro[i].alpha=255;
            break;
        }
    }
    else if(tipo_tiro==TIRO6)
    {
        for(int i=0;i<MAXTIROS;i++)
        if(tiro[i].tipo == INVALIDO)
        {
            jogador->intervalo_tiro=0;
            tiro[i].tipo=TIRO6;
            tiro[i].x = jogador->x+29;
            tiro[i].y = jogador->y-2;
            tiro[i].alpha=255;
            tiro[i].tamanho=6;
            break;
        }
    }
    else if(tipo_tiro==BOMBA1)
    {
        for(int i=0;i<MAXTIROS;i++)
        if(tiro[i].tipo == INVALIDO)
        {
            jogador->intervalo_tiro=0;
            tiro[i].tipo=BOMBA1;
            tiro[i].tamanho=800;
            tiro[i].x = 0;
            tiro[i].y = 0;
            tiro[i].alpha=255;
            break;
        }
    }
}

void jogo_cria_tiro_inimigo(Tiro *tiro, Marca marca, int tipo_tiro)
{
    if(tipo_tiro==TIROINI1)
    {
        for(int i=0;i<MAXTIROS;i++)
        if(tiro[i].tipo == INVALIDO)
        {
            tiro[i].tipo=TIROINI1;
            tiro[i].x = marca.x+22 ;
            tiro[i].y = marca.y+45;
            tiro[i].tamanho = 0 ;
            tiro[i].alpha=255;
            break;
        }
    }
    else if(tipo_tiro==TIROINI2)
    {
        for(int i=0;i<MAXTIROS;i++)
        if(tiro[i].tipo == INVALIDO)
        {
            tiro[i].tipo=TIROINI2;
            tiro[i].x = marca.x+22 ;
            tiro[i].y = marca.y+45;
            tiro[i].tamanho = 0 ;
            tiro[i].alpha=255;
            break;
        }
    }
    else if(tipo_tiro==TIROINI3)
    {
        for(int i=0;i<MAXTIROS;i++)
        if(tiro[i].tipo == INVALIDO)
        {
            tiro[i].tipo=TIROINI3;
            tiro[i].x = marca.x+22 ;
            tiro[i].y = marca.y+45;
            tiro[i].tamanho = 0 ;
            tiro[i].alpha=255;
            break;
        }
    }
}

void jogo_atualiza_tiro(Tiro *tiro,Nave *jogador)
{
    for(int i=0;i<MAXTIROS;i++)
    {
        if(tiro[i].tipo!=INVALIDO)
        {
            if ((tiro[i].y < -100 || tiro[i].y > 700 || tiro[i].alpha<10) && tiro[i].tipo < BOMBA1)
                tiro[i].tipo = INVALIDO;
            else if (tiro[i].alpha<5 && tiro[i].tipo == BOMBA1)
                tiro[i].tipo = INVALIDO;

            else  if(tiro[i].tipo==TIRO1 || tiro[i].tipo==TIRO2 )
                tiro[i].y -= 6;

            else if(tiro[i].tipo==TIRO3)
            {
                if(tiro[i].tamanho<22)tiro[i].tamanho++;
//                if(tiro[i].alpha>0)
//                    tiro[i].alpha-=3;
                tiro[i].y -= tiro[i].tamanho/3;
            }

            else if(tiro[i].tipo==TIRO4)
            {
                if(tiro[i].tamanho<20)tiro[i].tamanho++;
//                if(tiro[i].alpha>0)
//                    tiro[i].alpha-=3;
                tiro[i].y -= tiro[i].tamanho/3;
                tiro[i].x += tiro[i].id*2;
            }
            else if(tiro[i].tipo==TIRO5)
            {
                if(tiro[i].tamanho<80)tiro[i].tamanho++;
                if(tiro[i].alpha>0)tiro[i].alpha-=4;
                tiro[i].y -= tiro[i].tamanho/4;
            }
            else if(tiro[i].tipo==TIRO6)
            {
                tiro[i].y -= tiro[i].tamanho/3+1;
                if(tiro[i].tamanho<30) tiro[i].tamanho++;
                if(tiro[i].alpha>0) tiro[i].alpha-=6;
            }
            else if(tiro[i].tipo == BOMBA1)
            {
                if(tiro[i].alpha>0)
                    tiro[i].alpha-=5;

            }
            else if(tiro[i].tipo == TIROINI1)
            {
                tiro[i].y += 4;
            }
            else if(tiro[i].tipo == TIROINI2)
            {
                tiro[i].y += 4;
            }
            else if(tiro[i].tipo == TIROINI3)
            {
                if(tiro[i].x < jogador->x +10) tiro[i].x += (jogador->x - tiro[i].x)/80+1;
                if(tiro[i].x > jogador->x +10) tiro[i].x -= (tiro[i].x - jogador->x)/80+1;
                tiro[i].y += 3;

            }

        }
    }
}

void jogo_procura_marca(unsigned int mapa,int marcacao,Marca *marcas,int &contadormarcas)
{
	if (C2D2M_PrimeiroBlocoMarca(mapa, marcacao, &marcas[contadormarcas].x, &marcas[contadormarcas].y))
	{
        jogo_inicia_marca(marcas,contadormarcas,marcacao);
        contadormarcas++;
		while (C2D2M_ProximoBlocoMarca(mapa, &marcas[contadormarcas].x, &marcas[contadormarcas].y))
		{
		    jogo_inicia_marca(marcas,contadormarcas,marcacao);
			contadormarcas++;
		}
    }

}

void jogo_inicia_marca(Marca *marcas,int contadormarcas, unsigned int tipo)
{
        marcas[contadormarcas].tipo = tipo;
        marcas[contadormarcas].angulo=90;
        marcas[contadormarcas].ativo=0;
        marcas[contadormarcas].estado_atual =0;
        marcas[contadormarcas].tempotiro = 0;

      switch(tipo)
      {
            case M_INIMIGO1:
                marcas[contadormarcas].tipo=INIMIGO1;
                marcas[contadormarcas].energia =200 ;
                break;
            case M_INIMIGO2:
                marcas[contadormarcas].tipo=INIMIGO2;
                marcas[contadormarcas].energia =300 ;
                break;
            case M_INIMIGO3:
                marcas[contadormarcas].tipo=INIMIGO3;
                marcas[contadormarcas].energia =400 ;
                break;
            case M_INIMIGO4:
                marcas[contadormarcas].tipo=INIMIGO4;
                marcas[contadormarcas].energia =500 ;
                break;
            case M_METEORO:
                marcas[contadormarcas].tipo=METEORO;
                marcas[contadormarcas].energia =750 ;
                break;
            case M_BOSS:
				switch(saveAtual.planeta_atual)
				{
				case 0:
					marcas[contadormarcas].tipo=BOSS1;
					marcas[contadormarcas].energia =10000;
					break;
				case 1:
					marcas[contadormarcas].tipo=BOSS2;
					marcas[contadormarcas].energia =20000;
					break;
				case 2:
					marcas[contadormarcas].tipo=BOSS3;
					marcas[contadormarcas].energia =30000;
					break;
				case 3:
					marcas[contadormarcas].tipo=BOSS4;
					marcas[contadormarcas].energia =30000;
					break;
				case 4:
					marcas[contadormarcas].tipo=BOSS5;
					marcas[contadormarcas].energia =40000;
					break;
				}
                break;
            case M_T1:
                marcas[contadormarcas].tipo=T1;
                break;
            case M_T2:
                marcas[contadormarcas].tipo=T2;
                break;
            case M_T3:
                marcas[contadormarcas].tipo=T3;
                break;
            case M_T4:
                marcas[contadormarcas].tipo=T4;
                break;
            case M_T5:
                marcas[contadormarcas].tipo=T5;
                break;
            case M_T6:
                marcas[contadormarcas].tipo=T6;
                break;
        }

}

void jogo_atualiza_marca(Marca *marcas, int ymapa, Nave *jogador, Explo *explos, unsigned int somExplo, Tiro *tiros,int *score)
{
    for(int i=0 ;i<MAXMARCAS; i++)
        if(marcas[i].tipo!=INVALIDO)
        {
            if(marcas[i].ativo && ( marcas[i].y > 700))
            {
                marcas[i].ativo=0;
                marcas[i].tipo = INVALIDO; // senão da merda ( acredite ! )
            }
            else if( !marcas[i].ativo && marcas[i].y-ymapa >=-100)
            {
                //ta criado mano !
                marcas[i].ativo=1;
                marcas[i].y -= ymapa;
                marcas[i].centroX = marcas[i].x;
                marcas[i].centroY = marcas[i].y;
            }
            else if(marcas[i].ativo == 1)
            {
                switch(marcas[i].tipo)
                {
                    case INIMIGO1:
                        marcas[i].y = (int)(marcas[i].centroY + 50*sin(marcas[i].angulo));
                        marcas[i].x = (int)(marcas[i].centroX +  100*cos(marcas[i].angulo));
                        if(marcas[i].angulo <360) marcas[i].angulo += 0.08f;
                        else marcas[i].angulo = 0;
                        marcas[i].centroY +=2;
                        if(marcas[i].energia<=0)
                        {
                            marcas[i].tipo=INVALIDO;
                            jogo_cria_explosao(marcas[i].x+35,marcas[i].y+35,explos);
                            CA2_TocaEfeitoTela(somExplo,marcas[i].x);
                            *score+=200;
                        }
                        if(marcas[i].tempotiro <=0)
                        {
                            jogo_cria_tiro_inimigo(tiros,marcas[i],TIROINI1);
                            marcas[i].tempotiro=100;
                        }
                        else marcas[i].tempotiro--;
                        break;


                    case INIMIGO2:
                        if(jogador->tipo!=INVALIDO)
                        {
                            if(marcas[i].x < jogador->x +10) marcas[i].x += (jogador->x - marcas[i].x)/80+1;
                            if(marcas[i].x > jogador->x +10) marcas[i].x -= (marcas[i].x - jogador->x)/80+1;
                            if(marcas[i].y< jogador->y -50) marcas[i].y += (jogador->y - marcas[i].y)/80+1;
                            if(marcas[i].y> jogador->y -50) marcas[i].y -= (marcas[i].y- jogador->y)/80+1;
                        }
                        else
                            marcas[i].y +=2;
                        if(marcas[i].energia<=0)
                        {
                            marcas[i].tipo=INVALIDO;
                            jogo_cria_explosao(marcas[i].x+20,marcas[i].y+20,explos);
                            CA2_TocaEfeitoTela(somExplo,marcas[i].x);
                            *score+=300;
                        }
                        if(marcas[i].tempotiro <=0)
                        {
                            jogo_cria_tiro_inimigo(tiros,marcas[i],TIROINI2);
                            marcas[i].tempotiro=50;
                        }
                        else marcas[i].tempotiro--;
                        break;

                    case INIMIGO3:
                        marcas[i].y +=2;
                        if(marcas[i].energia<=0)
                        {
                            marcas[i].tipo=INVALIDO;
                            jogo_cria_explosao(marcas[i].x+30,marcas[i].y+50,explos);
                            CA2_TocaEfeitoTela(somExplo,marcas[i].x);
                            score+=400;
                        }
                        if(marcas[i].tempotiro <=0)
                        {
                            jogo_cria_tiro_inimigo(tiros,marcas[i],TIROINI3);
                            marcas[i].tempotiro=180;
                        }
                        else marcas[i].tempotiro--;
                        break;

                    case INIMIGO4:
						marcas[i].y = (int)(marcas[i].centroY + 40*sin(marcas[i].angulo));
                        marcas[i].x = (int)(marcas[i].centroX +  40*cos(marcas[i].angulo));
                        if(marcas[i].angulo <360) marcas[i].angulo += 0.08f;
                        else marcas[i].angulo = 0;
                        //marcas[i].centroY +=2;

						if(jogador->tipo!=INVALIDO)
                        {
							if(marcas[i].centroX < jogador->x +10) marcas[i].centroX+=3;
							if(marcas[i].centroX > jogador->x +10) marcas[i].centroX-=3;
							if(marcas[i].centroY < jogador->y -200) marcas[i].centroY+=3;
							if(marcas[i].centroY > jogador->y -200) marcas[i].centroY-=3;
                        }
                        else
                            marcas[i].y +=2;

                        if(marcas[i].energia<=0)
                        {
                            marcas[i].tipo=INVALIDO;
                            jogo_cria_explosao(marcas[i].x+30,marcas[i].y+42,explos);
                            CA2_TocaEfeitoTela(somExplo,marcas[i].x);
                            *score+=500;
                        }
                        if(marcas[i].tempotiro <=0)
                        {
							jogo_cria_tiro_inimigo(tiros,marcas[i],TIROINI3);
                            marcas[i].tempotiro=80;
                        }
                        else marcas[i].tempotiro--;
                        break;

                    case METEORO:
                        marcas[i].y +=2;
                        if(marcas[i].energia<=0)
                        {
                            marcas[i].tipo=INVALIDO;
                            jogo_cria_explosao(marcas[i].x+30,marcas[i].y+30,explos);
                            CA2_TocaEfeitoTela(somExplo,marcas[i].x);
                            *score+=1000;
                        }
                        break;

                    case BOSS1:
						if(marcas[i].y<=50&&marcas[i].estado_atual==0)marcas[i].y ++;
						else if(marcas[i].estado_atual==0)
						{
							marcas[i].centroY=marcas[i].y;
							marcas[i].estado_atual=1;
						}
						else{
							marcas[i].y = (int)(marcas[i].centroY + 20*sin(marcas[i].angulo));
							marcas[i].x = (int)(marcas[i].centroX +  50*cos(marcas[i].angulo));
							if(marcas[i].angulo <360) marcas[i].angulo += 0.08f;
							else marcas[i].angulo = 0;
						}
						if(marcas[i].tempotiro <=0)
                        {
							jogo_cria_tiro_inimigo(tiros,marcas[i],TIROINI1);
                            marcas[i].tempotiro=30;
                        }
                        else marcas[i].tempotiro--;
						if(marcas[i].energia<=0)
						{
							marcas[i].tipo=INVALIDO;
							jogo_cria_explosao(marcas[i].x,marcas[i].y-25,explos);
							CA2_TocaEfeitoTela(somExplo,marcas[i].x);
							*score+=3000;
						}
                        break;
					case BOSS2:
						if(marcas[i].y<=50&&marcas[i].estado_atual==0)marcas[i].y ++;
						else if(marcas[i].estado_atual==0)
						{
							marcas[i].centroY=marcas[i].y;
							marcas[i].estado_atual=1;
						}
						else{
							marcas[i].y = (int)(marcas[i].centroY + 20*sin(marcas[i].angulo));
							marcas[i].x = (int)(marcas[i].centroX +  50*cos(marcas[i].angulo));
							if(marcas[i].angulo <360) marcas[i].angulo += 0.08f;
							else marcas[i].angulo = 0;
						}
						if(marcas[i].tempotiro <=0)
                        {
							jogo_cria_tiro_inimigo(tiros,marcas[i],TIROINI2);
                            marcas[i].tempotiro=30;
                        }
                        else marcas[i].tempotiro--;
						if(marcas[i].energia<=0)
						{
							marcas[i].tipo=INVALIDO;
							jogo_cria_explosao(marcas[i].x,marcas[i].y-25,explos);
							CA2_TocaEfeitoTela(somExplo,marcas[i].x);
							*score+=3000;
						}
						break;
					case BOSS3:
						if(marcas[i].y<=50&&marcas[i].estado_atual==0)marcas[i].y ++;
						else if(marcas[i].estado_atual==0)
						{
							marcas[i].centroY=marcas[i].y;
							marcas[i].estado_atual=1;
						}
						else{
							marcas[i].y = (int)(marcas[i].centroY + 20*sin(marcas[i].angulo));
							marcas[i].x = (int)(marcas[i].centroX +  50*cos(marcas[i].angulo));
							if(marcas[i].angulo <360) marcas[i].angulo += 0.08f;
							else marcas[i].angulo = 0;
						}
						if(marcas[i].tempotiro <=0)
                        {
							int tirob = rand()%2;
							if(tirob == 1 )
								jogo_cria_tiro_inimigo(tiros,marcas[i],TIROINI1);
							else
								jogo_cria_tiro_inimigo(tiros,marcas[i],TIROINI2);
                            marcas[i].tempotiro=45;
                        }
                        else marcas[i].tempotiro--;
						if(marcas[i].energia<=0)
						{
							marcas[i].tipo=INVALIDO;
							jogo_cria_explosao(marcas[i].x,marcas[i].y-25,explos);
							CA2_TocaEfeitoTela(somExplo,marcas[i].x);
							*score+=3000;
						}
						break;
					case BOSS4:
						if(marcas[i].y<=50&&marcas[i].estado_atual==0)marcas[i].y ++;
						else if(marcas[i].estado_atual==0)
						{
							marcas[i].centroY=marcas[i].y;
							marcas[i].estado_atual=1;
						}
						else{
							marcas[i].y = (int)(marcas[i].centroY + 20*sin(marcas[i].angulo));
							marcas[i].x = (int)(marcas[i].centroX +  50*cos(marcas[i].angulo));
							if(marcas[i].angulo <360) marcas[i].angulo += 0.08f;
							else marcas[i].angulo = 0;
						}
						if(marcas[i].tempotiro <=0)
                        {
							int tirob = rand()%2;
							if(tirob == 1 )
								jogo_cria_tiro_inimigo(tiros,marcas[i],TIROINI2);
							else
								jogo_cria_tiro_inimigo(tiros,marcas[i],TIROINI3);
                            marcas[i].tempotiro=40;
                        }
                        else marcas[i].tempotiro--;
						if(marcas[i].energia<=0)
						{
							marcas[i].tipo=INVALIDO;
							jogo_cria_explosao(marcas[i].x,marcas[i].y-25,explos);
							CA2_TocaEfeitoTela(somExplo,marcas[i].x);
							*score+=3000;
						}
						break;
					case BOSS5:
						if(marcas[i].y<=50)marcas[i].y ++;
						marcas[i].x = 800 - jogador->x;
						if(marcas[i].energia<=0)
						{
							marcas[i].tipo=INVALIDO;
							jogo_cria_explosao(marcas[i].x,marcas[i].y-25,explos);
							CA2_TocaEfeitoTela(somExplo,marcas[i].x);
							*score+=3000;
						}
                        if(marcas[i].tempotiro <=0)
                        {
							int tirob = rand()%3;
							if( tirob == 0 )
								jogo_cria_tiro_inimigo(tiros,marcas[i],TIROINI3);
							else if( tirob == 1 )
								jogo_cria_tiro_inimigo(tiros,marcas[i],TIROINI2);
							else
								jogo_cria_tiro_inimigo(tiros,marcas[i],TIROINI1);

                            marcas[i].tempotiro=25;
                        }
                        else marcas[i].tempotiro--;
                        break;

					case T2:  marcas[i].y +=1;  break;
					case T3:  marcas[i].y +=1;  break;
					case T4:  marcas[i].y +=1;  break;
					case T5:  marcas[i].y +=1;  break;
					case T6:  marcas[i].y +=1;  break;
                }
            }

        }
}

void jogo_testa_colisao(Marca *marcas, Tiro *tiros, unsigned int *spMarca, unsigned int *spTiro, Nave *jogador,int *score)
{
    for(int i=0; i<MAXTIROS; i++)
    for(int j=0 ;j<MAXMARCAS; j++)
    {
        //verifica se tiro e marca são validos e ativos
        if(marcas[j].tipo!=INVALIDO && tiros[i].tipo!=INVALIDO && marcas[j].ativo )
        {
            //testa colisões tiros do jogador com todos inimigos
            if(tiros[i].tipo <=BOMBA1 && marcas[j].tipo >= INIMIGO1 && marcas[j].tipo <= BOSS5
            && C2D2_ColidiuSprites(spTiro[tiros[i].tipo],0,tiros[i].x,tiros[i].y,spMarca[marcas[j].tipo],0,marcas[j].x,marcas[j].y))
            {
                switch(tiros[i].tipo)
                {
                    case TIRO1:
                        marcas[j].energia-=50;
                        tiros[i].tipo=INVALIDO;
                        break;
                    case TIRO2:
                        marcas[j].energia-=75;
                        tiros[i].tipo=INVALIDO;
                        break;
                    case TIRO3:
                        marcas[j].energia-=100;
                        tiros[i].tipo=INVALIDO;
                        break;
                    case TIRO4:
                        marcas[j].energia-=75;
                        tiros[i].tipo=INVALIDO;
                        break;
                    case TIRO5:
                        marcas[j].energia-=120;
                        tiros[i].tipo=INVALIDO;
                        break;
                    case TIRO6:
                        marcas[j].energia-=150;
                        tiros[i].tipo=INVALIDO;
                        break;
                    case BOMBA1:
                        if(tiros[i].alpha>=250)
                        marcas[j].energia-=1000;
                        break;

                }
                //Faz o calculo da pontuação baseado no tipo do tiro e na energia atual do jogador
                //if(marcas[j].tipo != BOSS)
                //   *score += (int)(10*tiros[i].tipo + (0.1*jogador->energia));
            }
            //testa tiros dos inimigos no jogador
            else if(tiros[i].tipo >= TIROINI1 && tiros[i].tipo <= TIROINI3 && jogador->tipo == X85
            && C2D2_ColidiuSprites(spTiro[tiros[i].tipo],0,tiros[i].x,tiros[i].y,jogador->sprite,0,jogador->x,jogador->y))
            {
                switch(tiros[i].tipo)
                {
                    case TIROINI1:
                        jogador->energia-=15;
                        tiros[i].tipo=INVALIDO;
                        break;
                    case TIROINI2:
                        jogador->energia-=5;
                        tiros[i].tipo=INVALIDO;
                        break;
                    case TIROINI3:
                        jogador->energia-=15;
                        tiros[i].tipo=INVALIDO;
                        break;
                }
            }
        }
        //o I tem que ser zero, e os tiros podem ser invalidos pra testar uma vez só a colisão dos inimigos e itens no jogador
        if(i==0 && marcas[j].tipo >= INIMIGO1 && marcas[j].tipo <= T6 && marcas[j].ativo && jogador->tipo == X85
        && C2D2_ColidiuSprites(spMarca[marcas[j].tipo],0,marcas[j].x,marcas[j].y,jogador->sprite,0,jogador->x,jogador->y))
        {
            switch(marcas[j].tipo)
            {
                case INIMIGO1:
                    jogador->energia -= 20;
                    marcas[j].energia -=9999;
                    break;
                case INIMIGO2:
                    jogador->energia -= 30;
                    marcas[j].energia -=9999;
                    break;
                case INIMIGO3:
                    jogador->energia -= 40;
                    marcas[j].energia -=9999;
                    break;
                case INIMIGO4: break;
                case METEORO:
                    jogador->energia -= 50;
                    marcas[j].energia -=9999;
                    break;

                case BOSS1: jogador->energia -= 100; break;
				case BOSS2: jogador->energia -= 100; break;
				case BOSS3: jogador->energia -= 100; break;
				case BOSS4: jogador->energia -= 100; break;
				case BOSS5: jogador->energia -= 100; break;

                case T2 :
                    saveAtual.tiro_liberado[1]= true;
                    jogador->tiro_atual = TIRO2;
                    marcas[j].tipo=INVALIDO;
                    break;
                case T3 :
                    saveAtual.tiro_liberado[2]= true;
                    jogador->tiro_atual= TIRO3;
                    marcas[j].tipo=INVALIDO;
                    break;
                case T4 :
                    saveAtual.tiro_liberado[3]= true;
                    jogador->tiro_atual= TIRO4;
                    marcas[j].tipo=INVALIDO;
                    break;
                case T5 :
                    saveAtual.tiro_liberado[4]= true;
                    jogador->tiro_atual= TIRO5;
                    marcas[j].tipo=INVALIDO;
                    break;
                case T6 :
                    saveAtual.tiro_liberado[5]= true;
                    jogador->tiro_atual= TIRO6;
                    marcas[j].tipo=INVALIDO;
                    break;
            }
        }
    }
}

void jogo_cria_explosao(int x, int y, Explo *explos)
{
    for(int i=0; i<MAXEXPLOS; i++)
            if(explos[i].tipo == INVALIDO)
            {
                explos[i].x = x;
                explos[i].y = y;
                explos[i].alpha=255;
                explos[i].tamanho=30;
                explos[i].tipo=EXPLOSAO;
                break;
            }
}
void jogo_atualiza_explosao(Explo *explos)
{
    for(int i=0; i<MAXEXPLOS; i++)
        if(explos[i].tipo != INVALIDO)
        {
            if(explos[i].alpha >0)
            {
                explos[i].tamanho+=3;
                explos[i].alpha-=5;
            }
            else
                explos[i].tipo=INVALIDO;
        }
}

