// Marcação que a caverna (src/experience/main.js) espera encontrar: a mesma do index.html do app Vite.
export const SKELETON = `<div id="app"></div>

  <div id="loading">
    <div class="brand">KATTIEL <span>· o arquivo de Gabriel Caetano</span></div>
    <div class="track"><div id="bar"></div></div>
    <p id="load-label">Preparando…</p>
  </div>

  <div id="apres" class="hide">
    <header id="ap-topo">
      <button id="ap-marca" type="button" aria-label="Início"><b id="ap-nome"></b><small id="ap-papel"></small></button>
      <button id="ap-menu" type="button" aria-expanded="false" aria-controls="ap-nav">Menu</button>
      <nav id="ap-nav" aria-label="Seções"></nav>
    </header>
    <section id="ap-heroi" aria-labelledby="ap-h1">
      <p class="ap-kicker">Portfólio</p>
      <h1 id="ap-h1"></h1>
      <p id="ap-sub"></p>
      <p id="ap-resumo"></p>
      <p id="ap-metafora"></p>
      <div class="ap-acoes">
        <button id="ap-comecar" type="button" class="ap-btn prim">Conhecer a trajetória →</button>
        <button id="ap-explorar2" type="button" class="ap-btn">Explorar a caverna em 3D</button>
      </div>
      <div id="ap-pilares" aria-label="Áreas"></div>
    </section>
    <aside id="ap-painel" class="hide" aria-labelledby="ap-titulo">
      <button id="ap-fechar" type="button" aria-label="Voltar ao início">×</button>
      <div id="ap-corpo"></div>
    </aside>
    <p id="ap-indice" aria-hidden="true"></p>
    <p id="ap-dica">← → para navegar</p>
  </div>

  <div id="intro" class="hide">
    <button id="skip" type="button">Pular introdução <kbd>Espaço</kbd></button>
  </div>
  <div id="caption" aria-live="polite"></div>

  <div id="hud" class="hide">
    <div id="where"></div>
    <div id="crosshair"></div>
    <div id="prompt" role="status"></div>
    <div id="fps"></div>
    <div id="keys"><kbd>H</kbd> ajuda · <kbd>P</kbd> apresentação · <kbd>Esc</kbd> soltar o mouse</div>
  </div>
  <div id="toast" role="status" aria-live="polite"></div>
  <div id="cartao-projeto" class="hide" role="dialog" aria-modal="true" aria-label="Projeto do distrito"></div>
  <div id="fade"></div>

  <div id="pause" class="hide">
    <div class="card">
      <h1>Batcaverna</h1>
      <p>Clique para explorar.</p>
      <button id="voltar-apres" type="button" class="ap-btn prim">← Voltar à apresentação</button>
      <button id="sair-arquivo" type="button" class="ap-btn">Sair para o portfólio</button>
      <ul>
        <li><kbd>W A S D</kbd> andar · <kbd>Shift</kbd> correr · mouse olhar</li>
        <li><kbd>E</kbd> interagir · conjurar o feitiço na boca de cada túnel</li>
        <li><kbd>Q</kbd> qualidade · <kbd>M</kbd> som · <kbd>Esc</kbd> soltar o mouse</li>
      </ul>
    </div>
  </div>

  <div id="help" class="hide">
    <h2>Como explorar</h2>
    <p>Os distritos <b>7 a 12</b> ficam na galeria inferior: suba pelas escadas laterais da plataforma. Os distritos <b>1 a 6</b> ficam na galeria superior: use os elevadores nas pontas das galerias.</p>
    <p>Na frente de cada túnel, aperte <kbd>E</kbd> para conjurar o feitiço do distrito e atravessar. Lá dentro, procure o ponto focal e aperte <kbd>E</kbd> para revelar o projeto. O portal azul atrás de você traz de volta.</p>
    <p>As bocas dos túneis estão <b>barradas por grades</b>: só o feitiço do distrito as abre. O <b>Batcomputador</b> fica no topo da torre de comando (suba as escadas): marca rotas, mostra câmeras ao vivo, comanda o veículo e o modo alerta.</p>
  </div>

  <div id="computer" class="hide" role="dialog" aria-label="Batcomputador">
    <div class="panel">
      <header><b>BATCOMPUTADOR</b><span id="bc-clock"></span><button id="computer-close" type="button" aria-label="Fechar">×</button></header>
      <nav class="tabs" role="tablist">
        <button data-tab="distritos" class="on" role="tab">Distritos</button>
        <button data-tab="cameras" role="tab">Câmeras</button>
        <button data-tab="veiculo" role="tab">Veículo</button>
        <button data-tab="sistemas" role="tab">Sistemas</button>
      </nav>
      <section data-pane="distritos"><p class="hint">Escolha um distrito: a rota fica marcada no salão e a câmera ao vivo aponta para o portal.</p><ol id="district-list"></ol></section>
      <section data-pane="cameras" class="hide"><canvas id="cam-view" width="384" height="216"></canvas><div id="cam-list" class="chips"></div></section>
      <section data-pane="veiculo" class="hide">
        <div class="row"><button id="bc-turn" class="big">Girar plataforma: <b>ligado</b></button><button id="bc-ign" class="big">Ignição: <b>desligada</b></button></div>
        <dl class="stats"><dt>Blindagem</dt><dd>98%</dd><dt>Turbina</dt><dd id="st-tur">em espera</dd><dt>Pneus</dt><dd>4/4 OK</dd><dt>Combustível</dt><dd>87%</dd></dl>
      </section>
      <section data-pane="sistemas" class="hide">
        <div class="row"><button id="bc-alert" class="big">Modo alerta: <b>desligado</b></button><button id="bc-light" class="big">Iluminação: <b>normal</b></button></div>
        <p class="hint">O modo alerta tinge a caverna de vermelho e pulsa as luzes de serviço.</p>
      </section>
    </div>
  </div>

  <div id="touch" class="hide">
    <div id="stick"><div id="knob"></div></div>
    <button id="btn-e" type="button">E</button>
  </div>`;
