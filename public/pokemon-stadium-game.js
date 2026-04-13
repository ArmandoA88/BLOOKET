window.createPokemonStadiumGameModule = function createPokemonStadiumGameModule(env) {
  const {
    sprites,
    clamp,
    randInt,
    escapeHtml,
    startGame,
    renderStats,
    renderActions,
    renderBoard
  } = env || {};

  if (!sprites || typeof clamp !== "function" || typeof randInt !== "function") {
    return null;
  }

  injectPokemonStadiumStyles();

  const typeColors = {
    Electric: "#ffd447",
    Fire: "#ff9b68",
    Water: "#72d1ff",
    Grass: "#83e8a8",
    Psychic: "#ffb7ec",
    Dark: "#a1a9de",
    Dragon: "#78e4cb",
    Ghost: "#bb9cff",
    Fighting: "#ff9e7d",
    Normal: "#e5dab4",
    Fairy: "#ffc9e4",
    Ice: "#c5f7ff",
    Flying: "#d8eeff",
    Steel: "#d3ddf4",
    Poison: "#dc97ff"
  };
  const typeChart = {
    Electric: { Water: 2, Flying: 2, Electric: 0.5, Grass: 0.5, Dragon: 0.5 },
    Fire: { Grass: 2, Ice: 2, Steel: 2, Water: 0.5, Fire: 0.5, Dragon: 0.5 },
    Water: { Fire: 2, Water: 0.5, Grass: 0.5, Dragon: 0.5 },
    Grass: { Water: 2, Fire: 0.5, Grass: 0.5, Flying: 0.5, Dragon: 0.5, Poison: 0.5 },
    Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Steel: 0.5, Dark: 0.5 },
    Dark: { Psychic: 2, Ghost: 2, Dark: 0.5, Fighting: 0.5, Fairy: 0.5 },
    Ghost: { Ghost: 2, Psychic: 2, Dark: 0.5, Normal: 0.5 },
    Fighting: { Normal: 2, Dark: 2, Steel: 2, Ice: 2, Flying: 0.5, Poison: 0.5, Psychic: 0.5, Fairy: 0.5 },
    Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0.5 },
    Flying: { Grass: 2, Fighting: 2, Electric: 0.5, Steel: 0.5 },
    Ice: { Dragon: 2, Flying: 2, Grass: 2, Fire: 0.5, Water: 0.5, Steel: 0.5, Ice: 0.5 },
    Steel: { Fairy: 2, Ice: 2, Water: 0.5, Fire: 0.5, Steel: 0.5 },
    Poison: { Grass: 2, Fairy: 2, Poison: 0.5, Ghost: 0.5, Steel: 0.5 },
    Fairy: { Dark: 2, Dragon: 2, Fire: 0.5, Poison: 0.5, Steel: 0.5 },
    Normal: { Ghost: 0.5, Steel: 0.5 }
  };
  const TEAM_KEY = "solo-arcade-pokemon-stadium-team";
  const CUSTOM_TEAM_KEY = "solo-arcade-pokemon-stadium-custom";
  const CUSTOM_TEAM_ID = "custom-draft";
  const roster = [
    makePokemon("pikachu", "Pikachu", sprites.pokemonPikachu, "#ffd447", ["Electric"], 110, 112, [
      move("Quick Spark", "Electric", 24, 0.98, 1),
      move("Thunderbolt", "Electric", 34, 0.94),
      move("Iron Tail", "Steel", 40, 0.84)
    ]),
    makePokemon("charizard", "Charizard", sprites.pokemonCharizard, "#ff8f5c", ["Fire", "Flying"], 126, 102, [
      move("Flare Wing", "Fire", 30, 0.96),
      move("Air Slash", "Flying", 28, 0.97, 1),
      move("Blaze Crash", "Fire", 44, 0.82)
    ]),
    makePokemon("bulbasaur", "Bulbasaur", sprites.pokemonBulbasaur, "#7ce6a3", ["Grass", "Poison"], 120, 70, [
      move("Vine Whip", "Grass", 25, 0.98, 1),
      move("Razor Leaf", "Grass", 34, 0.93),
      move("Sludge Seed", "Poison", 38, 0.9)
    ]),
    makePokemon("charmander", "Charmander", sprites.pokemonCharmander, "#ffb06a", ["Fire"], 114, 84, [
      move("Ember Dash", "Fire", 26, 0.98, 1),
      move("Flame Burst", "Fire", 34, 0.93),
      move("Scratch Rush", "Normal", 38, 0.9)
    ]),
    makePokemon("squirtle", "Squirtle", sprites.pokemonSquirtle, "#6dd0ff", ["Water"], 118, 72, [
      move("Bubble Jet", "Water", 24, 0.98, 1),
      move("Water Pulse", "Water", 34, 0.93),
      move("Shell Bash", "Normal", 38, 0.88)
    ]),
    makePokemon("eevee", "Eevee", sprites.pokemonEevee, "#d7ab84", ["Normal"], 112, 96, [
      move("Quick Attack", "Normal", 24, 0.99, 1),
      move("Swift Burst", "Normal", 32, 0.97),
      move("Last Dash", "Normal", 40, 0.86)
    ]),
    makePokemon("snorlax", "Snorlax", sprites.pokemonSnorlax, "#88c5a3", ["Normal"], 152, 38, [
      move("Body Slam", "Normal", 30, 0.96),
      move("Heavy Roll", "Normal", 36, 0.92),
      move("Mega Tackle", "Normal", 44, 0.82)
    ]),
    makePokemon("psyduck", "Psyduck", sprites.pokemonPsyduck, "#ffe07d", ["Water"], 110, 78, [
      move("Splash Jab", "Water", 24, 0.99, 1),
      move("Wave Bonk", "Water", 32, 0.95),
      move("Headache Beam", "Psychic", 40, 0.86)
    ]),
    makePokemon("meowth", "Meowth", sprites.pokemonMeowth, "#ffd27a", ["Normal"], 108, 104, [
      move("Coin Swipe", "Normal", 24, 0.99, 1),
      move("Fury Claw", "Normal", 32, 0.95),
      move("Sharp Payday", "Steel", 38, 0.88)
    ]),
    makePokemon("jigglypuff", "Jigglypuff", sprites.pokemonJigglypuff, "#ffbfe4", ["Normal", "Fairy"], 122, 52, [
      move("Puff Slap", "Normal", 24, 0.99, 1),
      move("Fairy Gleam", "Fairy", 34, 0.93),
      move("Moon Burst", "Fairy", 40, 0.86)
    ]),
    makePokemon("gengar", "Gengar", sprites.pokemonGengar, "#b592ff", ["Ghost", "Poison"], 118, 112, [
      move("Shadow Sneak", "Ghost", 24, 0.99, 1),
      move("Sludge Bomb", "Poison", 34, 0.93),
      move("Phantom Burst", "Ghost", 42, 0.84)
    ]),
    makePokemon("umbreon", "Umbreon", sprites.pokemonUmbreon, "#97a7ff", ["Dark"], 128, 80, [
      move("Dark Pounce", "Dark", 24, 0.99, 1),
      move("Night Pulse", "Dark", 34, 0.94),
      move("Moon Fang", "Dark", 40, 0.88)
    ]),
    makePokemon("greninja", "Greninja", sprites.pokemonGreninja, "#68d9ff", ["Water", "Dark"], 118, 124, [
      move("Water Shuriken", "Water", 24, 0.99, 2),
      move("Night Slash", "Dark", 34, 0.94),
      move("Hydro Pulse", "Water", 40, 0.9)
    ]),
    makePokemon("gyarados", "Gyarados", sprites.pokemonGyarados, "#79b3ff", ["Water", "Flying"], 136, 86, [
      move("Aqua Fang", "Water", 28, 0.96),
      move("Dragon Surge", "Dragon", 36, 0.9),
      move("Sky Crash", "Flying", 42, 0.84)
    ]),
    makePokemon("lapras", "Lapras", sprites.pokemonLapras, "#a9f0ff", ["Water", "Ice"], 138, 66, [
      move("Surf Burst", "Water", 30, 0.95),
      move("Ice Beam", "Ice", 34, 0.93),
      move("Frost Crest", "Ice", 42, 0.88)
    ]),
    makePokemon("lucario", "Lucario", sprites.pokemonLucario, "#95b6ff", ["Fighting", "Steel"], 124, 100, [
      move("Quick Jab", "Fighting", 24, 0.99, 1),
      move("Aura Sphere", "Fighting", 36, 0.93),
      move("Meteor Mash", "Steel", 40, 0.87)
    ]),
    makePokemon("dragonite", "Dragonite", sprites.pokemonDragonite, "#ffbc73", ["Dragon", "Flying"], 140, 90, [
      move("Wing Rush", "Flying", 28, 0.97, 1),
      move("Dragon Claw", "Dragon", 36, 0.92),
      move("Hyper Beam", "Normal", 46, 0.8)
    ]),
    makePokemon("mew", "Mew", sprites.pokemonMew, "#ffcaef", ["Psychic"], 126, 106, [
      move("Psywave", "Psychic", 28, 0.97),
      move("Aura Spark", "Psychic", 34, 0.94),
      move("Mythic Burst", "Psychic", 40, 0.88)
    ]),
    makePokemon("mewtwo", "Mewtwo", sprites.pokemonMewtwo, "#d9caff", ["Psychic"], 140, 118, [
      move("Psystrike", "Psychic", 34, 0.95),
      move("Shadow Ball", "Ghost", 36, 0.92),
      move("Omega Burst", "Psychic", 46, 0.84)
    ]),
    makePokemon("rayquaza", "Rayquaza", sprites.pokemonRayquaza, "#7be9a2", ["Dragon", "Flying"], 148, 106, [
      move("Air Cut", "Flying", 30, 0.96),
      move("Dragon Pulse", "Dragon", 38, 0.91),
      move("Sky Breaker", "Flying", 46, 0.84)
    ])
  ];
  const teams = [
    makeTeam("starter-squad", "Starter Squad", "#7ce6a3", "Classic grass, fire, and water balance.", ["bulbasaur", "charmander", "squirtle"]),
    makeTeam("stadium-stars", "Stadium Stars", "#ffd447", "Fast fan favorites ready for center stage.", ["pikachu", "eevee", "snorlax"]),
    makeTeam("trickster-crew", "Trickster Crew", "#ffd27a", "Funny faces, quick hits, and surprise specials.", ["psyduck", "meowth", "jigglypuff"]),
    makeTeam("night-shift", "Night Shift", "#b592ff", "Dark, spooky, and hard to read.", ["gengar", "umbreon", "mew"]),
    makeTeam("wave-riders", "Wave Riders", "#72d1ff", "Water pressure and icy finishers.", ["greninja", "gyarados", "lapras"]),
    makeTeam("power-league", "Power League", "#95b6ff", "Heavy hitters with a steel edge.", ["lucario", "dragonite", "charizard"]),
    makeTeam("mythic-masters", "Mythic Masters", "#d9caff", "Legendary power for the late cup rounds.", ["mew", "mewtwo", "rayquaza"])
  ];
  const rosterById = new Map(roster.map((pokemon) => [pokemon.id, pokemon]));
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  return {
    id: "pokemon_stadium",
    type: "board",
    name: "Pokemon Stadium",
    description: "A colorful 3v3 stadium cup where players draft or quick-pick Pokemon, trade type-based attacks, switch bench members, and race for cup wins.",
    controls: "Draft any three Pokemon or quick-pick a preset team, then use the command deck for moves and potions. During your turn, click one of your bench Pokemon to switch it into the active slot.",
    note: "This local Pokemon Stadium run uses the project sprite pack, adds a bright retro stadium backdrop, and keeps the full 3v3 battle solo with no room code or second player required.",
    stageTitle: "Pokemon Stadium Cup",
    stageHelp: "Pick a preset squad or build a custom trio from the roster, then use the in-board command deck to battle through a turn-based 3v3 cup with switching, potions, and type matchups.",
    createState() {
      return createState(getStoredTeamId(), null, getStoredDraftLineup());
    },
    getActions(state) {
      return getBattleActions(state);
    },
    act(state, id) {
      if (id === "restart") {
        startGame("pokemon_stadium");
        return;
      }
      if (state.done || state.turn !== "player") {
        return;
      }
      if (id === "potion") {
        if (!usePotion(state, state.playerTeam, "player")) {
          return;
        }
        queueCpuTurn(state, 560);
        return;
      }
      const moveIndex = Number(String(id).split(":")[1]);
      const moveEntry = activePokemon(state.playerTeam)?.moves?.[moveIndex];
      if (!moveEntry) {
        return;
      }
      const result = runAttack(state, state.playerTeam, state.enemyTeam, moveEntry);
      if (result.knockedOut) {
        handleFaint(state, "enemy");
        return;
      }
      queueCpuTurn(state, 650);
    },
    update(state) {
      if (state.pendingCpuAt && performance.now() >= state.pendingCpuAt) {
        cpuTurn(state);
      }
    },
    render(state, container) {
      const selectedTeam = getSelectedTeamSummary(state);
      const playerLead = activePokemon(state.playerTeam);
      const enemyLead = activePokemon(state.enemyTeam);
      const battleActions = getBattleActions(state);
      container.innerHTML = `
        <div class="battle-stage pokemon-stadium-stage">
          <div class="pokemon-hero">
            <img class="pokemon-hero-image" src="${sprites.pokemonStadiumBowl.src}" alt="Pokemon stadium" />
            <div class="pokemon-hero-copy">
              <div class="eyebrow">Pick Your Squad</div>
              <h3>Retro 3v3 Stadium Cup</h3>
              <p>Draft any three Pokemon or use a preset trio, then trade attacks with the rival coach and tap your bench whenever you want to switch.</p>
            </div>
            <div class="pokemon-hero-pills">
              <div class="solo-pill">Team: ${escapeHtml(selectedTeam.name)}</div>
              <div class="solo-pill">Rival: ${escapeHtml(state.enemyTeam.name)}</div>
              <div class="solo-pill">Draft: ${escapeHtml(getDraftLabel(state.draftLineup))}</div>
            </div>
          </div>
          <div class="pokemon-team-select">${teams.map((team) => renderTeamCard(team, state.selectedTeamId)).join("")}</div>
          ${renderDraftPanel(state)}
          <div class="solo-board-head">
            <div class="solo-pill">Cup Wins: ${state.score}</div>
            <div class="solo-pill">Round: ${state.round}</div>
            <div class="solo-pill">Potions: ${state.playerPotions}</div>
            <div class="solo-pill">Turn: ${state.turn === "cpu" ? "Rival Coach" : state.done ? "Match Over" : "Player Coach"}</div>
          </div>
          <div class="pokemon-arena">
            <div class="pokemon-team-strip enemy">${state.enemyTeam.roster.map((pokemon, index) => renderBenchCard(state.enemyTeam, pokemon, index, "enemy", state)).join("")}</div>
            <div class="pokemon-battlefield">
              ${renderActiveCard(state.enemyTeam, "enemy")}
              <div class="pokemon-vs-panel">
                <div class="eyebrow">Battle Feed</div>
                <h3>${escapeHtml(playerLead.name)} VS ${escapeHtml(enemyLead.name)}</h3>
                <p>${escapeHtml(state.message)}</p>
                <div class="pokemon-vs-stats">
                  <span>Usable: ${livingCount(state.playerTeam)}</span>
                  <span>Rival: ${livingCount(state.enemyTeam)}</span>
                </div>
                ${renderCommandPanel(state, battleActions)}
              </div>
              ${renderActiveCard(state.playerTeam, "player")}
            </div>
            <div class="pokemon-team-strip player">${state.playerTeam.roster.map((pokemon, index) => renderBenchCard(state.playerTeam, pokemon, index, "player", state)).join("")}</div>
          </div>
          <div class="battle-log pokemon-log"><strong>Stadium Announcer</strong><br />${state.log.map((line) => escapeHtml(line)).join("<br />")}</div>
        </div>
      `;

      container.querySelectorAll("[data-team-pick]").forEach((button) => {
        button.addEventListener("click", () => {
          resetState(state, button.getAttribute("data-team-pick"));
          refresh();
        });
      });
      container.querySelectorAll("[data-draft-pick]").forEach((button) => {
        button.addEventListener("click", () => {
          toggleDraftPokemon(state, button.getAttribute("data-draft-pick"));
          refresh();
        });
      });
      container.querySelectorAll("[data-draft-action]").forEach((button) => {
        button.addEventListener("click", () => {
          const action = button.getAttribute("data-draft-action");
          if (action === "random") {
            randomizeDraft(state);
          } else if (action === "clear") {
            clearDraft(state);
          } else if (action === "start") {
            if (state.draftLineup.length === 3) {
              resetState(state, CUSTOM_TEAM_ID, state.draftLineup, state.draftLineup);
            }
          }
          refresh();
        });
      });
      container.querySelectorAll("[data-command-action]").forEach((button) => {
        button.addEventListener("click", () => {
          const actionId = button.getAttribute("data-command-action");
          if (!actionId) {
            return;
          }
          this.act(state, actionId);
          refresh();
        });
      });
      container.querySelectorAll("[data-poke-switch]").forEach((button) => {
        button.addEventListener("click", () => {
          switchPlayer(state, Number(button.getAttribute("data-poke-switch")));
          refresh();
        });
      });
    },
    getStats(state) {
      return {
        primaryLabel: "Cup Wins",
        primaryValue: state.score,
        secondaryLabel: "Team HP",
        secondaryValue: teamHp(state.playerTeam),
        status: state.done ? `Final cup wins ${state.score}` : `${state.enemyTeam.name} | ${activePokemon(state.enemyTeam).name} ready`
      };
    },
    getBestValue(state) {
      return state.score * 1000 + teamHp(state.playerTeam);
    }
  };

  function refresh() {
    renderStats();
    renderActions();
    renderBoard(true);
  }

  function move(name, type, power, accuracy = 1, priority = 0) {
    return { name, type, power, accuracy, priority };
  }

  function makePokemon(id, name, sprite, accent, types, hp, speed, moveset) {
    return { id, name, sprite, accent, types, hp, speed, moves: moveset };
  }

  function makeTeam(id, name, accent, tagline, lineup) {
    return { id, name, accent, tagline, lineup };
  }

  function getStoredTeamId() {
    try {
      return window.localStorage.getItem(TEAM_KEY) || teams[0].id;
    } catch {
      return teams[0].id;
    }
  }

  function setStoredTeamId(id) {
    try {
      window.localStorage.setItem(TEAM_KEY, id);
    } catch {
      // Ignore storage failures.
    }
  }

  function getStoredDraftLineup() {
    try {
      return normalizeLineup(JSON.parse(window.localStorage.getItem(CUSTOM_TEAM_KEY) || "[]"));
    } catch {
      return [];
    }
  }

  function setStoredDraftLineup(lineup) {
    try {
      window.localStorage.setItem(CUSTOM_TEAM_KEY, JSON.stringify(normalizeLineup(lineup)));
    } catch {
      // Ignore storage failures.
    }
  }

  function getTeam(id) {
    return teamsById.get(id) || teams[0];
  }

  function getPokemon(id) {
    return rosterById.get(id) || roster[0];
  }

  function normalizeLineup(lineup) {
    const normalized = [];
    for (const rawId of Array.isArray(lineup) ? lineup : []) {
      const id = String(rawId || "");
      if (!rosterById.has(id) || normalized.includes(id)) {
        continue;
      }
      normalized.push(id);
      if (normalized.length >= 3) {
        break;
      }
    }
    return normalized;
  }

  function defaultDraftLineup() {
    return teams[0].lineup.slice(0, 3);
  }

  function createCustomTeam(lineup) {
    const normalized = normalizeLineup(lineup);
    const accent = normalized.length ? getPokemon(normalized[0]).accent : "#ffd447";
    const names = normalized.map((id) => getPokemon(id).name);
    return {
      id: CUSTOM_TEAM_ID,
      name: "Custom Squad",
      accent,
      tagline: names.length === 3 ? `${names.join(", ")} ready for the arena.` : "Pick three Pokemon for a custom trio.",
      lineup: normalized
    };
  }

  function resolveSelectedTeam(teamId, lineup) {
    const normalized = normalizeLineup(lineup);
    if (teamId === CUSTOM_TEAM_ID && normalized.length === 3) {
      return createCustomTeam(normalized);
    }
    const preset = getTeam(teamId === CUSTOM_TEAM_ID ? teams[0].id : teamId);
    return {
      ...preset,
      lineup: preset.lineup.slice()
    };
  }

  function getSelectedTeamSummary(state) {
    return resolveSelectedTeam(state.selectedTeamId, state.selectedLineup);
  }

  function getDraftLabel(lineup) {
    const normalized = normalizeLineup(lineup);
    if (!normalized.length) {
      return "Choose 3 Pokemon";
    }
    return normalized.map((id) => getPokemon(id).name).join(", ");
  }

  function sameLineup(left, right) {
    const a = normalizeLineup(left);
    const b = normalizeLineup(right);
    return a.length === b.length && a.every((id, index) => id === b[index]);
  }

  function createPokemonState(id, boost = 0) {
    const template = getPokemon(id);
    return {
      id: template.id,
      name: template.name,
      sprite: template.sprite,
      accent: template.accent,
      types: template.types.slice(),
      moves: template.moves.map((entry) => ({ ...entry })),
      speed: template.speed + Math.min(10, boost * 2),
      hp: template.hp + boost * 8,
      maxHp: template.hp + boost * 8,
      fainted: false
    };
  }

  function buildTeam(team, round, side) {
    const boost = side === "enemy" ? round - 1 : 0;
    return {
      id: team.id,
      name: team.name,
      accent: team.accent,
      tagline: team.tagline,
      roster: team.lineup.map((id) => createPokemonState(id, boost)),
      activeIndex: 0
    };
  }

  function createState(teamId, lineup, draftLineup) {
    const normalizedDraft = normalizeLineup(draftLineup);
    const storedDraft = normalizedDraft.length === 3 ? normalizedDraft : getStoredDraftLineup();
    const safeDraft = storedDraft.length === 3 ? storedDraft : defaultDraftLineup();
    const selectedTeam = resolveSelectedTeam(teamId, teamId === CUSTOM_TEAM_ID ? lineup || safeDraft : null);
    const playerTeam = buildTeam(selectedTeam, 1, "player");
    const enemyTeam = nextEnemyTeam(1, selectedTeam.id);
    const lead = activePokemon(playerTeam);
    setStoredTeamId(selectedTeam.id);
    setStoredDraftLineup(teamId === CUSTOM_TEAM_ID ? selectedTeam.lineup : safeDraft);
    return {
      selectedTeamId: selectedTeam.id,
      selectedLineup: selectedTeam.lineup.slice(),
      draftLineup: (teamId === CUSTOM_TEAM_ID ? selectedTeam.lineup : safeDraft).slice(),
      playerTeam,
      enemyTeam,
      round: 1,
      score: 0,
      playerPotions: 2,
      enemyPotions: 1,
      turn: "player",
      pendingCpuAt: 0,
      message: `${lead.name}, I choose you!`,
      log: [`${lead.name}, I choose you!`, `${selectedTeam.name} rolled into the stadium.`],
      done: false,
      dirty: true
    };
  }

  function resetState(state, teamId, lineup, draftLineup = state.draftLineup) {
    Object.assign(state, createState(teamId, lineup, draftLineup));
  }

  function nextEnemyTeam(round, selectedTeamId) {
    const options = teams.filter((team) => team.id !== selectedTeamId);
    return buildTeam(options[(round - 1) % options.length] || teams[0], round, "enemy");
  }

  function activePokemon(team) {
    return team?.roster?.[team.activeIndex] || null;
  }

  function getBattleActions(state) {
    if (state.done) {
      return [{ id: "restart", label: "Battle Again", className: "good" }];
    }
    const attacker = activePokemon(state.playerTeam);
    const defender = activePokemon(state.enemyTeam);
    if (!attacker || !defender) {
      return [];
    }
    return [
      ...attacker.moves.map((entry, index) => ({
        id: `move:${index}`,
        label: `${entry.name}${effectiveness(entry.type, defender.types) >= 1.75 ? " x2" : ""}`,
        className: effectiveness(entry.type, defender.types) >= 1.75 ? "good" : "",
        disabled: state.turn !== "player"
      })),
      {
        id: "potion",
        label: `Potion (${state.playerPotions})`,
        className: state.playerPotions > 0 ? "good" : "",
        disabled: state.turn !== "player" || state.playerPotions <= 0
      }
    ];
  }

  function livingCount(team) {
    return team.roster.filter((pokemon) => !pokemon.fainted).length;
  }

  function teamHp(team) {
    return team.roster.reduce((sum, pokemon) => sum + Math.max(0, Number(pokemon.hp || 0)), 0);
  }

  function firstAliveIndex(team) {
    return team.roster.findIndex((pokemon) => !pokemon.fainted);
  }

  function benchOptions(team) {
    return team.roster
      .map((pokemon, index) => ({ pokemon, index }))
      .filter(({ pokemon, index }) => !pokemon.fainted && index !== team.activeIndex);
  }

  function teamDefeated(team) {
    return team.roster.every((pokemon) => pokemon.fainted);
  }

  function ensureActive(team) {
    const current = activePokemon(team);
    if (current && !current.fainted) {
      return team.activeIndex;
    }
    const nextIndex = firstAliveIndex(team);
    if (nextIndex >= 0) {
      team.activeIndex = nextIndex;
    }
    return nextIndex;
  }

  function effectiveness(moveType, defenderTypes) {
    const row = typeChart[moveType] || null;
    let multiplier = 1;
    for (const type of defenderTypes) {
      if (row && Object.prototype.hasOwnProperty.call(row, type)) {
        multiplier *= row[type];
      }
    }
    return multiplier;
  }

  function effectivenessText(multiplier) {
    if (multiplier >= 1.75) {
      return "Super effective";
    }
    if (multiplier <= 0.55) {
      return "Not very effective";
    }
    return "";
  }

  function moveScore(attacker, defender, entry) {
    const stab = attacker.types.includes(entry.type) ? 1.2 : 1;
    return entry.power * effectiveness(entry.type, defender.types) * stab * Number(entry.accuracy || 1) + Number(entry.priority || 0) * 8;
  }

  function hpPercent(pokemon) {
    return clamp((pokemon.hp / pokemon.maxHp) * 100, 0, 100);
  }

  function pushLog(state, line) {
    state.log.unshift(line);
    state.log = state.log.slice(0, 6);
    state.message = line;
    state.dirty = true;
  }

  function usePotion(state, team, side) {
    const potionKey = side === "player" ? "playerPotions" : "enemyPotions";
    if (state[potionKey] <= 0) {
      return false;
    }
    const target = activePokemon(team);
    if (!target || target.fainted || target.hp >= target.maxHp) {
      if (side === "player") {
        pushLog(state, `${target ? target.name : "Your team"} does not need a potion right now.`);
      }
      return false;
    }
    const heal = randInt(26, 38);
    state[potionKey] -= 1;
    target.hp = Math.min(target.maxHp, target.hp + heal);
    pushLog(state, `${target.name} recovered ${heal} HP with a potion.`);
    return true;
  }

  function runAttack(state, attackerTeam, defenderTeam, entry) {
    const attacker = activePokemon(attackerTeam);
    const defender = activePokemon(defenderTeam);
    if (!attacker || !defender || attacker.fainted || defender.fainted) {
      return { hit: false, knockedOut: false };
    }
    const accuracy = Number.isFinite(Number(entry.accuracy)) ? Number(entry.accuracy) : 1;
    if (Math.random() > accuracy) {
      pushLog(state, `${attacker.name}'s ${entry.name} missed.`);
      return { hit: false, knockedOut: false };
    }

    const stab = attacker.types.includes(entry.type) ? 1.2 : 1;
    const multiplier = effectiveness(entry.type, defender.types);
    const crit = Math.random() < 0.12;
    const base = entry.power + Math.floor(attacker.speed / 18) + state.round * 2 + randInt(-4, 7);
    let dealt = Math.round(base * stab * multiplier * (crit ? 1.35 : 1));
    dealt = clamp(dealt, 8, 88);

    defender.hp = Math.max(0, defender.hp - dealt);
    defender.fainted = defender.hp <= 0;

    const notes = [];
    const note = effectivenessText(multiplier);
    if (note) {
      notes.push(note);
    }
    if (crit) {
      notes.push("Critical hit");
    }
    pushLog(state, `${attacker.name} used ${entry.name} for ${dealt}.${notes.length ? ` ${notes.join("! ")}!` : ""}`);
    if (defender.fainted) {
      pushLog(state, `${defender.name} fainted!`);
    }
    return { hit: true, knockedOut: defender.fainted };
  }

  function queueCpuTurn(state, delay) {
    state.turn = "cpu";
    state.pendingCpuAt = performance.now() + delay;
    state.dirty = true;
  }

  function startNextCup(state) {
    state.score += 1;
    state.round += 1;
    state.playerTeam = buildTeam(resolveSelectedTeam(state.selectedTeamId, state.selectedLineup), 1, "player");
    state.enemyTeam = nextEnemyTeam(state.round, state.selectedTeamId);
    state.playerPotions = 2;
    state.enemyPotions = Math.min(2, 1 + Math.floor((state.round - 1) / 2));
    state.turn = "player";
    state.pendingCpuAt = 0;
    pushLog(state, `Cup ${state.score} cleared! ${state.enemyTeam.name} entered next.`);
  }

  function handleFaint(state, side) {
    const team = side === "player" ? state.playerTeam : state.enemyTeam;
    if (teamDefeated(team)) {
      if (side === "enemy") {
        startNextCup(state);
      } else {
        state.done = true;
        state.turn = "ended";
        pushLog(state, `${state.enemyTeam.name} won the stadium match.`);
      }
      return;
    }
    ensureActive(team);
    pushLog(state, `${activePokemon(team).name} jumped in for ${team.name}.`);
    state.turn = "player";
  }

  function bestEnemySwitch(state) {
    const enemy = state.enemyTeam;
    const defender = activePokemon(state.playerTeam);
    return benchOptions(enemy)
      .map(({ pokemon, index }) => ({
        index,
        score: Math.max(...pokemon.moves.map((entry) => moveScore(pokemon, defender, entry))) + hpPercent(pokemon) * 0.24
      }))
      .sort((left, right) => right.score - left.score)[0] || { index: enemy.activeIndex, score: -Infinity };
  }

  function chooseCpuAction(state) {
    const enemy = activePokemon(state.enemyTeam);
    const player = activePokemon(state.playerTeam);
    if (!enemy || !player) {
      return { type: "move", index: 0 };
    }
    if (state.enemyPotions > 0 && enemy.hp <= enemy.maxHp * 0.36 && Math.random() < 0.55) {
      return { type: "potion" };
    }
    const currentBest = Math.max(...enemy.moves.map((entry) => moveScore(enemy, player, entry)));
    if (benchOptions(state.enemyTeam).length > 0 && enemy.hp <= enemy.maxHp * 0.42) {
      const switchChoice = bestEnemySwitch(state);
      if (switchChoice.index !== state.enemyTeam.activeIndex && switchChoice.score > currentBest * 1.08) {
        return { type: "switch", index: switchChoice.index };
      }
    }
    return enemy.moves
      .map((entry, index) => ({ type: "move", index, score: moveScore(enemy, player, entry) + Math.random() * 4 }))
      .sort((left, right) => right.score - left.score)[0];
  }

  function cpuTurn(state) {
    if (state.done || state.turn !== "cpu") {
      return;
    }
    state.pendingCpuAt = 0;
    const action = chooseCpuAction(state);
    if (action.type === "switch") {
      state.enemyTeam.activeIndex = action.index;
      pushLog(state, `${activePokemon(state.enemyTeam).name} switched in for the rival coach.`);
      state.turn = "player";
      return;
    }
    if (action.type === "potion") {
      usePotion(state, state.enemyTeam, "enemy");
      state.turn = "player";
      return;
    }
    const result = runAttack(state, state.enemyTeam, state.playerTeam, activePokemon(state.enemyTeam).moves[action.index]);
    if (result.knockedOut) {
      handleFaint(state, "player");
      return;
    }
    state.turn = "player";
    state.dirty = true;
  }

  function switchPlayer(state, index) {
    const pokemon = state.playerTeam.roster[index];
    if (state.done || state.turn !== "player" || !pokemon || pokemon.fainted || index === state.playerTeam.activeIndex) {
      return;
    }
    state.playerTeam.activeIndex = index;
    pushLog(state, `${pokemon.name}, take the spotlight!`);
    queueCpuTurn(state, 520);
  }

  function toggleDraftPokemon(state, id) {
    const normalized = normalizeLineup(state.draftLineup);
    const targetId = String(id || "");
    if (!rosterById.has(targetId)) {
      return;
    }
    const existingIndex = normalized.indexOf(targetId);
    if (existingIndex >= 0) {
      normalized.splice(existingIndex, 1);
    } else if (normalized.length < 3) {
      normalized.push(targetId);
    } else {
      return;
    }
    state.draftLineup = normalized;
    setStoredDraftLineup(state.draftLineup);
    state.dirty = true;
  }

  function randomizeDraft(state) {
    const pool = roster.map((pokemon) => pokemon.id);
    for (let index = pool.length - 1; index > 0; index -= 1) {
      const swapIndex = randInt(0, index);
      [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
    }
    state.draftLineup = pool.slice(0, 3);
    setStoredDraftLineup(state.draftLineup);
    state.dirty = true;
  }

  function clearDraft(state) {
    state.draftLineup = [];
    setStoredDraftLineup(state.draftLineup);
    state.dirty = true;
  }

  function renderTypeChips(types) {
    return types
      .map((type) => `<span class="pokemon-type-chip" style="--type-accent:${typeColors[type] || "#d7e8ff"};">${escapeHtml(type)}</span>`)
      .join("");
  }

  function renderMovePreview(moves) {
    return moves
      .map((entry) => `<span class="pokemon-move-chip" style="--type-accent:${typeColors[entry.type] || "#d7e8ff"};">${escapeHtml(entry.name)}</span>`)
      .join("");
  }

  function renderDraftPanel(state) {
    const customTeamActive = state.selectedTeamId === CUSTOM_TEAM_ID && sameLineup(state.selectedLineup, state.draftLineup);
    return `
      <section class="pokemon-draft-panel">
        <div class="pokemon-draft-head">
          <div>
            <div class="eyebrow">Custom Draft</div>
            <h3>Build Your Own Trio</h3>
            <p>Pick any three Pokemon from the roster, then start a fresh stadium cup with your custom squad.</p>
          </div>
          <div class="pokemon-draft-actions">
            <button type="button" class="pokemon-draft-btn" data-draft-action="random">Random Trio</button>
            <button type="button" class="pokemon-draft-btn" data-draft-action="clear">Clear</button>
            <button type="button" class="pokemon-draft-btn primary ${customTeamActive ? "live" : ""}" data-draft-action="start"${state.draftLineup.length === 3 ? "" : " disabled"}>${customTeamActive ? "Custom Squad Live" : "Start Custom Cup"}</button>
          </div>
        </div>
        <div class="pokemon-draft-slots">
          ${Array.from({ length: 3 }, (_, index) => renderDraftSlot(state.draftLineup[index], index)).join("")}
        </div>
        <div class="pokemon-roster-grid">
          ${roster.map((pokemon) => renderRosterPick(pokemon, state.draftLineup)).join("")}
        </div>
      </section>
    `;
  }

  function renderDraftSlot(id, index) {
    if (!id) {
      return `
        <div class="pokemon-draft-slot empty">
          <span class="pokemon-draft-slot-index">${index + 1}</span>
          <strong>Open Slot</strong>
          <span>Pick any Pokemon below.</span>
        </div>
      `;
    }
    const pokemon = getPokemon(id);
    return `
      <div class="pokemon-draft-slot" style="--slot-accent:${pokemon.accent};">
        <span class="pokemon-draft-slot-index">${index + 1}</span>
        <img src="${pokemon.sprite.src}" alt="${escapeHtml(pokemon.name)}" />
        <strong>${escapeHtml(pokemon.name)}</strong>
        <span>${renderTypeText(pokemon.types)}</span>
      </div>
    `;
  }

  function renderRosterPick(pokemon, draftLineup) {
    const selected = normalizeLineup(draftLineup);
    const isSelected = selected.includes(pokemon.id);
    const locked = selected.length >= 3 && !isSelected;
    return `
      <button type="button" class="pokemon-roster-pick ${isSelected ? "selected" : ""} ${locked ? "locked" : ""}" data-draft-pick="${pokemon.id}"${locked ? " disabled" : ""} style="--pick-accent:${pokemon.accent};">
        <img src="${pokemon.sprite.src}" alt="${escapeHtml(pokemon.name)}" />
        <strong>${escapeHtml(pokemon.name)}</strong>
        <span>${renderTypeText(pokemon.types)}</span>
      </button>
    `;
  }

  function renderCommandPanel(state, actions) {
    const note = state.done
      ? "Restart the cup or build a new trio."
      : state.turn === "cpu"
        ? "Rival coach is choosing a response."
        : "Pick a move below or tap one of your bench Pokemon to switch.";
    return `
      <div class="pokemon-command-panel">
        <div class="pokemon-command-head">
          <strong>Command Deck</strong>
          <span>${escapeHtml(note)}</span>
        </div>
        <div class="pokemon-command-grid">
          ${actions.map((action) => `<button type="button" class="pokemon-command-btn ${action.className || ""}" data-command-action="${action.id}"${action.disabled ? " disabled" : ""}>${escapeHtml(action.label)}</button>`).join("")}
        </div>
      </div>
    `;
  }

  function renderTypeText(types) {
    return types.map((type) => escapeHtml(type)).join(" / ");
  }

  function renderTeamCard(team, selectedId) {
    return `
      <button type="button" class="pokemon-team-card ${team.id === selectedId ? "active" : ""}" data-team-pick="${team.id}" style="--team-accent:${team.accent};">
        <div class="pokemon-team-card-top">
          <strong>${escapeHtml(team.name)}</strong>
          <span>${escapeHtml(team.tagline)}</span>
        </div>
        <div class="pokemon-team-lineup">${team.lineup.map((id) => `<img src="${getPokemon(id).sprite.src}" alt="${escapeHtml(getPokemon(id).name)}" />`).join("")}</div>
      </button>
    `;
  }

  function renderBenchCard(team, pokemon, index, side, state) {
    const isPlayer = side === "player";
    const isActive = index === team.activeIndex;
    const canSwitch = isPlayer && !state.done && state.turn === "player" && !pokemon.fainted && !isActive;
    const tag = canSwitch ? "button" : "div";
    const attrs = canSwitch ? ` type="button" data-poke-switch="${index}"` : "";
    const classes = ["pokemon-bench-card", isActive ? "active" : "", pokemon.fainted ? "fainted" : "", canSwitch ? "switchable" : ""].filter(Boolean).join(" ");
    return `
      <${tag} class="${classes}"${attrs} style="--card-accent:${team.accent};">
        <img src="${pokemon.sprite.src}" alt="${escapeHtml(pokemon.name)}" />
        <div class="pokemon-bench-meta">
          <strong>${escapeHtml(pokemon.name)}</strong>
          <div class="pokemon-mini-bar"><span style="width:${hpPercent(pokemon)}%;"></span></div>
          <span>${pokemon.fainted ? "Fainted" : canSwitch ? `${pokemon.hp}/${pokemon.maxHp} HP | Tap to switch` : `${pokemon.hp}/${pokemon.maxHp} HP`}</span>
        </div>
      </${tag}>
    `;
  }

  function renderActiveCard(team, side) {
    const pokemon = activePokemon(team);
    return `
      <article class="pokemon-active-card ${side}" style="--card-accent:${team.accent};">
        <div class="pokemon-active-top">
          <div>
            <div class="pokemon-active-role">${side === "player" ? "Your Active Pokemon" : "Rival Active Pokemon"}</div>
            <h3>${escapeHtml(pokemon.name)}</h3>
            <div class="pokemon-type-row">${renderTypeChips(pokemon.types)}</div>
          </div>
          <div class="pokemon-hp-copy">${pokemon.hp}/${pokemon.maxHp} HP</div>
        </div>
        <div class="hp-bar pokemon-hp-bar"><div class="hp-fill" style="width:${hpPercent(pokemon)}%;"></div></div>
        <div class="pokemon-active-scene">
          <div class="pokemon-active-platform"></div>
          <img class="pokemon-active-sprite ${side === "enemy" ? "enemy" : ""}" src="${pokemon.sprite.src}" alt="${escapeHtml(pokemon.name)}" />
        </div>
        <div class="pokemon-move-strip">${renderMovePreview(pokemon.moves)}</div>
      </article>
    `;
  }
};

function injectPokemonStadiumStyles() {
  if (document.getElementById("pokemonStadiumStyles")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "pokemonStadiumStyles";
  style.textContent = `
    .pokemon-stadium-stage{padding:12px;border-radius:30px;background:radial-gradient(circle at 16% 8%,rgba(255,212,71,.18),transparent 18%),radial-gradient(circle at 84% 10%,rgba(114,209,255,.16),transparent 22%),linear-gradient(180deg,rgba(18,15,35,.94),rgba(7,11,21,.98));border:1px solid rgba(255,255,255,.08);overflow:hidden}
    .pokemon-hero{position:relative;min-height:224px;border-radius:28px;overflow:hidden;display:flex;justify-content:space-between;align-items:flex-end;gap:18px;padding:20px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.18));border:1px solid rgba(255,255,255,.08)}
    .pokemon-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,13,22,.02),rgba(5,13,22,.56));pointer-events:none}
    .pokemon-hero-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .pokemon-hero-copy,.pokemon-hero-pills,.pokemon-team-select,.pokemon-arena,.pokemon-log{position:relative;z-index:1}
    .pokemon-hero-copy{max-width:600px;display:grid;gap:8px}
    .pokemon-hero-copy h3{font-size:clamp(1.5rem,3vw,2.25rem);line-height:.96}
    .pokemon-hero-copy p{margin:0;color:rgba(244,251,255,.86);line-height:1.45}
    .pokemon-hero-pills{display:grid;gap:10px;justify-items:end}
    .pokemon-team-select{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}
    .pokemon-draft-panel{display:grid;gap:14px;margin-top:14px;padding:16px;border-radius:26px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(9,14,24,.78));border:1px solid rgba(255,255,255,.08)}
    .pokemon-draft-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
    .pokemon-draft-head h3{font-size:1.08rem}
    .pokemon-draft-head p{margin:6px 0 0;color:rgba(244,251,255,.78);line-height:1.45}
    .pokemon-draft-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
    .pokemon-draft-btn,.pokemon-command-btn{padding:11px 12px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);color:var(--text);font-family:"Orbitron",monospace;font-size:.72rem}
    .pokemon-draft-btn.primary,.pokemon-command-btn.good{border-color:rgba(125,237,176,.28);background:rgba(125,237,176,.14)}
    .pokemon-draft-btn.live{border-color:rgba(255,212,71,.28);background:rgba(255,212,71,.14);color:#ffe692}
    .pokemon-draft-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .pokemon-draft-slot{position:relative;min-height:118px;padding:14px;border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(7,11,19,.74));border:1px solid color-mix(in srgb,var(--slot-accent,#ffd447) 35%, rgba(255,255,255,.08));display:grid;justify-items:center;align-content:center;gap:6px;text-align:center}
    .pokemon-draft-slot.empty{border-style:dashed;border-color:rgba(255,255,255,.12);background:rgba(255,255,255,.04)}
    .pokemon-draft-slot img{width:64px;height:64px;object-fit:contain;image-rendering:pixelated;image-rendering:crisp-edges;filter:drop-shadow(0 12px 18px rgba(0,0,0,.3))}
    .pokemon-draft-slot strong{font-family:"Orbitron",monospace;font-size:.8rem}
    .pokemon-draft-slot span{color:rgba(244,251,255,.7);font-size:.78rem}
    .pokemon-draft-slot-index{position:absolute;left:10px;top:10px;width:28px;height:28px;border-radius:999px;display:grid;place-items:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08);font-family:"Orbitron",monospace;font-size:.72rem}
    .pokemon-roster-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
    .pokemon-roster-pick{padding:12px;border-radius:20px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);display:grid;justify-items:center;gap:8px;color:var(--text);text-align:center}
    .pokemon-roster-pick.selected{border-color:var(--pick-accent);background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(10,16,27,.82));box-shadow:0 0 0 2px rgba(255,255,255,.03)}
    .pokemon-roster-pick.locked{opacity:.5}
    .pokemon-roster-pick img{width:60px;height:60px;object-fit:contain;image-rendering:pixelated;image-rendering:crisp-edges;filter:drop-shadow(0 12px 18px rgba(0,0,0,.3))}
    .pokemon-roster-pick strong{font-family:"Orbitron",monospace;font-size:.76rem}
    .pokemon-roster-pick span{color:rgba(244,251,255,.68);font-size:.76rem}
    .pokemon-team-card{padding:12px 12px 14px;border-radius:22px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);color:var(--text);display:grid;gap:10px;text-align:left}
    .pokemon-team-card.active{border-color:var(--team-accent);box-shadow:0 0 0 2px rgba(255,255,255,.04);background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(12,18,28,.78))}
    .pokemon-team-card-top strong{display:block;font-family:"Orbitron",monospace;font-size:.86rem;margin-bottom:4px}
    .pokemon-team-card-top span{display:block;color:rgba(244,251,255,.74);font-size:.9rem;line-height:1.35}
    .pokemon-team-lineup{display:flex;gap:8px;align-items:center}
    .pokemon-team-lineup img,.pokemon-bench-card img,.pokemon-active-sprite{image-rendering:pixelated;image-rendering:crisp-edges;filter:drop-shadow(0 14px 18px rgba(0,0,0,.26))}
    .pokemon-team-lineup img{width:48px;height:48px}
    .pokemon-arena{display:grid;gap:14px;margin-top:10px}
    .pokemon-team-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .pokemon-bench-card{padding:10px;border-radius:20px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);display:grid;grid-template-columns:58px minmax(0,1fr);gap:10px;align-items:center;color:var(--text)}
    .pokemon-bench-card.switchable{cursor:pointer;border-color:rgba(255,212,71,.28);background:rgba(255,212,71,.08)}
    .pokemon-bench-card.active{border-color:var(--card-accent);background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(12,18,28,.78))}
    .pokemon-bench-card.fainted{opacity:.48;filter:grayscale(.18)}
    .pokemon-bench-card img{width:54px;height:54px;object-fit:contain}
    .pokemon-bench-meta{display:grid;gap:5px;min-width:0}
    .pokemon-bench-meta strong{font-family:"Orbitron",monospace;font-size:.76rem}
    .pokemon-bench-meta span{color:rgba(244,251,255,.72);font-size:.78rem}
    .pokemon-mini-bar{height:8px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.08)}
    .pokemon-mini-bar span{display:block;height:100%;background:linear-gradient(90deg,#6ce0b1,#ffd447)}
    .pokemon-battlefield{display:grid;grid-template-columns:minmax(0,1fr) 240px minmax(0,1fr);gap:14px;align-items:stretch}
    .pokemon-vs-panel{padding:16px;border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(10,16,28,.76));border:1px solid rgba(255,255,255,.08);display:grid;place-content:center;gap:10px;text-align:center}
    .pokemon-vs-panel h3{font-size:1.18rem}
    .pokemon-vs-panel p{margin:0;color:rgba(244,251,255,.82);line-height:1.45}
    .pokemon-vs-stats{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;color:#ffd447;font-family:"Orbitron",monospace;font-size:.76rem}
    .pokemon-command-panel{display:grid;gap:10px;margin-top:4px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}
    .pokemon-command-head{display:grid;gap:4px}
    .pokemon-command-head strong{font-family:"Orbitron",monospace;font-size:.78rem}
    .pokemon-command-head span{color:rgba(244,251,255,.7);font-size:.84rem;line-height:1.35}
    .pokemon-command-grid{display:grid;gap:10px}
    .pokemon-command-btn{width:100%}
    .pokemon-active-card{padding:18px;border-radius:26px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(7,11,19,.44));border:1px solid rgba(255,255,255,.08);display:grid;gap:12px}
    .pokemon-active-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
    .pokemon-active-role{color:var(--card-accent);font-family:"Orbitron",monospace;font-size:.74rem;letter-spacing:.08em;text-transform:uppercase}
    .pokemon-hp-copy{font-family:"Orbitron",monospace;font-size:.78rem;color:#ffd447}
    .pokemon-type-row,.pokemon-move-strip{display:flex;gap:8px;flex-wrap:wrap}
    .pokemon-type-chip,.pokemon-move-chip{padding:6px 9px;border-radius:999px;background:color-mix(in srgb,var(--type-accent) 18%, rgba(255,255,255,.06));border:1px solid color-mix(in srgb,var(--type-accent) 42%, rgba(255,255,255,.08));font-family:"Orbitron",monospace;font-size:.7rem;color:#f7fcff}
    .pokemon-active-scene{position:relative;min-height:220px;border-radius:24px;overflow:hidden;background:linear-gradient(180deg,rgba(20,31,48,.96),rgba(9,13,22,.98));border:1px solid rgba(255,255,255,.06)}
    .pokemon-active-scene::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 16%,var(--card-accent) 0%,transparent 42%);opacity:.18}
    .pokemon-active-platform{position:absolute;left:50%;bottom:22px;width:68%;height:18px;transform:translateX(-50%);border-radius:999px;background:var(--card-accent);opacity:.24;box-shadow:0 0 30px var(--card-accent)}
    .pokemon-active-sprite{position:relative;z-index:1;width:min(78%,210px);height:188px;object-fit:contain;margin:24px auto 0}
    .pokemon-active-sprite.enemy{transform:scaleX(-1)}
    .pokemon-hp-bar{height:14px}
    .pokemon-log{background:rgba(12,17,27,.78);border-color:rgba(255,255,255,.08)}
    @media (max-width:920px){.pokemon-roster-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.pokemon-draft-head{flex-direction:column}.pokemon-draft-actions{justify-content:flex-start}}
    @media (max-width:720px){.pokemon-hero{min-height:260px;align-items:flex-start;flex-direction:column}.pokemon-hero-pills{width:100%;justify-items:stretch}.pokemon-team-select,.pokemon-draft-slots{grid-template-columns:repeat(2,minmax(0,1fr))}.pokemon-roster-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.pokemon-battlefield{grid-template-columns:1fr}.pokemon-team-strip{grid-template-columns:1fr}}
    @media (max-width:560px){.pokemon-team-select,.pokemon-draft-slots,.pokemon-roster-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}
