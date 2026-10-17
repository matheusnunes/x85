objetos = jogo.o menu.o chien2d2.o chien2d2_gl.o chien2d2_sdl.o chien2d2primitivas.o chien2d2primitivas_gl.o chien2d2primitivas_sdl.o chienaudio2.o  chien2d2mapa.o

libs = -lSDL -lSDL_image -lSDL_mixer -lGL -lGLU

comp = g++

teste : $(objetos)
	$(comp) -o teste $(objetos) $(libs)



menu.o : menu.cpp
	cc -c menu.cpp

jogo.o : jogo.cpp jogo.h
	cc -c jogo.cpp 
	
chienaudio2.o : chienaudio2.cpp chienaudio2.h
	cc -c chienaudio2.cpp
chien2d2.o : chien2d2.cpp chien2d2.h
	cc -c chien2d2.cpp
chien2d2_gl.o : chien2d2_gl.cpp chien2d2_gl.h
	cc -c chien2d2_gl.cpp
chien2d2_sdl.o : chien2d2_sdl.cpp chien2d2_sdl.h
	cc -c chien2d2_sdl.cpp
chien2d2primitivas.o : chien2d2primitivas.cpp chien2d2primitivas.h
	cc -c chien2d2primitivas.cpp
chien2d2primitivas_gl.o : chien2d2primitivas_gl.cpp chien2d2primitivas_gl.h
	cc -c chien2d2primitivas_gl.cpp
chien2d2primitivas_sdl.o : chien2d2primitivas_sdl.cpp chien2d2primitivas_sdl.h
	cc -c chien2d2primitivas_sdl.cpp
chien2d2mapa.o : chien2d2mapa.cpp chien2d2mapa.h
	cc -c chien2d2mapa.cpp
clean :
	rm teste $(objetos)

