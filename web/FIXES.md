# X85 web port — intentional behaviour changes

Every intentional deviation from the original `X85-devcore 2/` behaviour is listed here (decision D3 of the
port design). Everything else is a faithful translation.

| Id | Description | Original | Before (original) | After (port) |
|---|---|---|---|---|
| F4 | Record insert with a score below all 7 records | `funcoes_M.cpp:165-201` | The loop finds no slot; `fwrite`/`fclose` then run on the read handle that was already closed (use-after-free, double `fclose`, probable glibc abort) — reachable when a low-scoring player wins a phase | Nothing is inserted and nothing is written; the board is unchanged |
| F5 | Record insert clobbers the caller's name | `funcoes_M.cpp:190-194` | `strcpy(tempnome, tempnome2)` writes the displaced names into the caller's buffer (`saveAtual.nome`); masked only by the following `menu_saves_loadslot` | The name is copied locally (`tempnome.slice(0, 14)`); the caller's string / `saveAtual.nome` is never touched |
| F6 | One record per player name | `funcoes_M.cpp:178-198`, `jogo.cpp:213-215` | Every phase win inserts the cumulative total again, so one player fills the board with copies of their own name | If a record with exactly the same `nome` (case-sensitive) exists, it is replaced only when the new score is higher (re-inserted at its sorted position, ties above), otherwise nothing changes; a new name inserts as before |
