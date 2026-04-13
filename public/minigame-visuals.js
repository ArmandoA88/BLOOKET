(function initMiniGameVisuals(global) {
  const visibleMiniGameOrder = [
    "foosball_frenzy",
    "soccer_shootout",
    "goalie_rush",
    "tower_stacker",
    "space_invaders",
    "snake",
    "tap_rush",
    "reaction_duel",
    "sequence_memory",
    "obstacle_dodge",
    "precision_stop",
    "word_scramble",
    "hallway_dash",
    "dino_dig",
    "shadow_match",
    "classroom_cleanup",
    "battle_royale"
  ];

  const miniGameVisuals = {
    foosball_frenzy: {
      label: "Foosball Frenzy",
      title: "Foosball Frenzy",
      description: "Foosball bars stay in formation. Slide laterally, score fast, and race the class leaderboard.",
      tagline: "Fast classroom table soccer with clear student action.",
      difficulty: "Simple",
      skills: "Timing",
      idealTime: "5 min",
      questions: "Fast rounds",
      players: "2 - 300",
      image: "/assets/minigames/soccer_shootout/soccer.svg",
      heroImage: "/assets/minigames/foosball_demo/stadium-pitch-cc0.png",
      heroAlt: "Foosball Frenzy stadium art for the mini-game preview.",
      accentClass: "theme-foosball",
      hud: "GOALS",
      previewNote: "Click inside the player frame first, then use Left and Right to slide your row and Space to kick.",
      previewDurationSec: 14
    },
    soccer_shootout: {
      label: "Soccer Shootout",
      title: "Soccer Shootout",
      description: "Quick penalty kicks where students compete to score the most goals.",
      tagline: "Quick penalty rounds where the class races to score the most goals.",
      difficulty: "Simple",
      skills: "Timing",
      idealTime: "5 min",
      questions: "Goal races",
      players: "2 - 300",
      image: "/assets/minigames/soccer_shootout/fussball-field.svg",
      heroImage: "/assets/minigames/soccer_shootout/soccer.svg",
      heroAlt: "Soccer Shootout field and player art for the mini-game preview.",
      accentClass: "theme-soccer",
      hud: "SHOTS",
      previewNote: "Click inside the player frame first, then use Left and Right to move and Space to kick.",
      previewDurationSec: 14
    },
    goalie_rush: {
      label: "Goalie Rush",
      title: "Goalie Rush",
      description: "Guard the goal, block faster shots each round, and survive boss rounds for extra coins.",
      tagline: "Students guard the goal, block faster shots each round, and chase boss-save coin bonuses.",
      difficulty: "Simple",
      skills: "Reflexes",
      idealTime: "4 min",
      questions: "Mini-game only",
      players: "2 - 300",
      image: "/assets/minigames/goalie_rush/goalie-rush.svg",
      heroImage: "/assets/minigames/goalie_rush/goalie-rush.svg",
      heroAlt: "Goalie Rush keeper art for the mini-game preview.",
      accentClass: "theme-cloud",
      hud: "SAVE",
      previewNote: "Click inside the player frame first, then use Left and Right to block shots.",
      previewDurationSec: 14
    },
    tower_stacker: {
      label: "Tower Stacker",
      title: "Tower Stacker",
      description: "Stack themed critters into the tallest tower you can keep standing.",
      tagline: "Cute classroom stacking with one rewarded drop at a time.",
      difficulty: "Simple",
      skills: "Timing",
      idealTime: "5 min",
      questions: "Reward drops",
      players: "2 - 300",
      image: "/assets/minigames/tower_stacker/tower.svg",
      heroImage: "/assets/minigames/tower_stacker/tower.svg",
      heroAlt: "Tower Stacker block tower art for the mini-game preview.",
      accentClass: "theme-stacker",
      hud: "HEIGHT",
      previewNote: "Click inside the player frame first, then time each drop to stack the tower cleanly.",
      previewDurationSec: 14
    },
    space_invaders: {
      label: "Space Invaders",
      title: "Space Invaders",
      description: "Arcade survival shooter with classroom-friendly pacing.",
      tagline: "Arcade shooting with live classroom pressure.",
      difficulty: "Medium",
      skills: "Focus",
      idealTime: "6 min",
      questions: "Wave-based",
      players: "2 - 300",
      image: "/assets/minigames/asteroids/asteroids.svg",
      heroImage: "/assets/minigames/asteroids/asteroids.svg",
      heroAlt: "Space Invaders themed space art for the mini-game preview.",
      accentClass: "theme-space",
      hud: "WAVE",
      previewNote: "Click inside the player frame first, then move and fire through the wave.",
      previewDurationSec: 14
    },
    snake: {
      label: "Snake Strategy",
      title: "Snake Strategy",
      description: "Simple controls, careful turns, and growing path strategy.",
      tagline: "Clean controls, careful route planning, and class competition for the highest score.",
      difficulty: "Medium",
      skills: "Planning",
      idealTime: "5 min",
      questions: "Score races",
      players: "2 - 300",
      image: "/assets/minigames/snake/snake.svg",
      heroImage: "/assets/minigames/snake/snake.svg",
      heroAlt: "Snake Strategy board art for the mini-game preview.",
      accentClass: "theme-snake",
      hud: "SCORE",
      previewNote: "Click inside the player frame first, then use Arrow Keys or WASD to collect snacks and avoid walls.",
      previewDurationSec: 14
    },
    tap_rush: {
      label: "Tap Rush",
      title: "Tap Rush",
      description: "Tap fast for bonus points.",
      tagline: "Fast classroom tapping where everyone races the leaderboard together.",
      difficulty: "Simple",
      skills: "Speed",
      idealTime: "3 min",
      questions: "Mini-game only",
      players: "2 - 300",
      image: "/assets/minigames/tap_rush/tap.svg",
      heroImage: "/assets/minigames/tap_rush/tap.svg",
      heroAlt: "Tap Rush action art for the mini-game preview.",
      accentClass: "theme-space",
      hud: "TAPS",
      previewNote: "Click inside the player frame first, then tap or click rapidly to build score.",
      previewDurationSec: 12
    },
    reaction_duel: {
      label: "Reaction Duel",
      title: "Reaction Duel",
      description: "Wait for GO and react fast.",
      tagline: "Wait for the signal, then react faster than the rest of the class.",
      difficulty: "Simple",
      skills: "Reflexes",
      idealTime: "3 min",
      questions: "Mini-game only",
      players: "2 - 300",
      image: "/assets/minigames/reaction_duel/tap.svg",
      heroImage: "/assets/minigames/reaction_duel/tap.svg",
      heroAlt: "Reaction Duel signal art for the mini-game preview.",
      accentClass: "theme-cloud",
      hud: "GO",
      previewNote: "Click inside the player frame first, then wait for GO and react immediately.",
      previewDurationSec: 12
    },
    sequence_memory: {
      label: "Sequence Memory",
      title: "Sequence Memory",
      description: "Repeat the color order to score.",
      tagline: "Students memorize a pattern and race to finish it cleanly.",
      difficulty: "Medium",
      skills: "Memory",
      idealTime: "4 min",
      questions: "Mini-game only",
      players: "2 - 300",
      image: "/assets/minigames/sequence_memory/sequence.svg",
      heroImage: "/assets/minigames/sequence_memory/sequence.svg",
      heroAlt: "Sequence Memory pattern art for the mini-game preview.",
      accentClass: "theme-stacker",
      hud: "MEM",
      previewNote: "Click inside the player frame first, then repeat the shown pattern in order.",
      previewDurationSec: 14
    },
    obstacle_dodge: {
      label: "Obstacle Dodge",
      title: "Obstacle Dodge",
      description: "Pick safe lanes across turns.",
      tagline: "Pick safe lanes fast and survive more turns than the class.",
      difficulty: "Simple",
      skills: "Timing",
      idealTime: "4 min",
      questions: "Mini-game only",
      players: "2 - 300",
      image: "/assets/minigames/obstacle_dodge/sequence.svg",
      heroImage: "/assets/minigames/obstacle_dodge/sequence.svg",
      heroAlt: "Obstacle Dodge lane art for the mini-game preview.",
      accentClass: "theme-soccer",
      hud: "SAFE",
      previewNote: "Click inside the player frame first, then switch lanes to stay safe.",
      previewDurationSec: 14
    },
    precision_stop: {
      label: "Precision Stop",
      title: "Precision Stop",
      description: "Stop the marker near the target zone.",
      tagline: "A short accuracy challenge where the closest stop wins.",
      difficulty: "Simple",
      skills: "Precision",
      idealTime: "3 min",
      questions: "Mini-game only",
      players: "2 - 300",
      image: "/assets/minigames/precision_stop/precision.svg",
      heroImage: "/assets/minigames/precision_stop/precision.svg",
      heroAlt: "Precision Stop target art for the mini-game preview.",
      accentClass: "theme-cloud",
      hud: "STOP",
      previewNote: "Click inside the player frame first, then stop as close to the target as possible.",
      previewDurationSec: 12
    },
    word_scramble: {
      label: "Word Scramble",
      title: "Word Scramble",
      description: "Unscramble words before attempts run out.",
      tagline: "Solve the scrambled word before your classmates do.",
      difficulty: "Medium",
      skills: "Wordplay",
      idealTime: "4 min",
      questions: "Mini-game only",
      players: "2 - 300",
      image: "/assets/minigames/word_scramble/question.svg",
      heroImage: "/assets/minigames/word_scramble/question.svg",
      heroAlt: "Word Scramble letter art for the mini-game preview.",
      accentClass: "theme-foosball",
      hud: "WORD",
      previewNote: "Click inside the player frame first, then solve the word before attempts run out.",
      previewDurationSec: 14
    },
    hallway_dash: {
      label: "Hallway Dash",
      title: "Hallway Dash",
      description: "Race down the school hallway, dodge clutter, jump hazards, and collect coins.",
      tagline: "A school-themed runner with hallway clutter, jumping, lane swaps, and coin pickups.",
      difficulty: "Simple",
      skills: "Timing",
      idealTime: "4 min",
      questions: "Mini-game only",
      players: "2 - 300",
      image: "/assets/minigames/hallway_dash/hallway-hero.svg",
      heroImage: "/assets/minigames/hallway_dash/hallway-hero.svg",
      heroAlt: "Hallway Dash hero art showing a student runner, coins, and school hallway hazards.",
      accentClass: "theme-hallway",
      hud: "DASH",
      previewNote: "Click inside the player frame first, then use Left and Right to move and Space to jump.",
      previewDurationSec: 14
    },
    dino_dig: {
      label: "Dino Dig",
      title: "Dino Dig",
      description: "Dig tiles to uncover fossils, bones, coin caches, and a rare dinosaur blook.",
      tagline: "Fast classroom digging with fossils, coin finds, and a shot at a rare dinosaur blook.",
      difficulty: "Simple",
      skills: "Discovery",
      idealTime: "4 min",
      questions: "Mini-game only",
      players: "2 - 300",
      image: "/assets/dinos/dino-tyrannosaurus.png",
      heroImage: "/assets/dinos/dino-tyrannosaurus.png",
      heroAlt: "Dino Dig dinosaur art for the mini-game preview.",
      accentClass: "theme-stacker",
      hud: "DIG",
      previewNote: "Click inside the frame and dig tiles directly from the player board.",
      previewDurationSec: 14
    },
    shadow_match: {
      label: "Shadow Match",
      title: "Shadow Match",
      description: "Flip hidden blooks, match the pairs, and unlock better reward packs with streaks.",
      tagline: "A fast classroom memory game where matching streaks unlock better bonus packs.",
      difficulty: "Medium",
      skills: "Memory",
      idealTime: "4 min",
      questions: "Mini-game only",
      players: "2 - 300",
      image: "/assets/minigames/shadow_match/shadow-match.svg",
      heroImage: "/assets/minigames/shadow_match/shadow-match.svg",
      heroAlt: "Shadow Match card art for the mini-game preview.",
      accentClass: "theme-pink",
      hud: "MATCH",
      previewNote: "Click inside the player frame and flip matching pairs before time runs out.",
      previewDurationSec: 16
    },
    classroom_cleanup: {
      label: "Classroom Cleanup",
      title: "Classroom Cleanup",
      description: "Move between classroom rows and sort books, pencils, and trash before time runs out.",
      tagline: "Students race around a messy classroom sorting books, pencils, and trash before the floor piles up.",
      difficulty: "Simple",
      skills: "Sorting",
      idealTime: "4 min",
      questions: "Mini-game only",
      players: "2 - 300",
      image: "/assets/minigames/classroom_cleanup/classroom-cleanup.svg",
      heroImage: "/assets/minigames/classroom_cleanup/classroom-cleanup.svg",
      heroAlt: "Classroom Cleanup sorting art for the mini-game preview.",
      accentClass: "theme-cloud",
      hud: "SORT",
      previewNote: "Click inside the player frame, move across rows, and use the matching sort keys.",
      previewDurationSec: 14
    },
    battle_royale: {
      label: "Battle Royale",
      title: "Battle Royale",
      description: "Simple 1v1 blook battles where every selected blook gets a small power.",
      tagline: "Quick 1v1 blook battles where each selected blook brings its own special power.",
      difficulty: "Simple",
      skills: "Strategy",
      idealTime: "4 min",
      questions: "Mini-game only",
      players: "2 - 300",
      image: "/assets/minigames/battle_royale/battle-royale.svg",
      heroImage: "/assets/minigames/battle_royale/battle-royale.svg",
      heroAlt: "Battle Royale duel art for the mini-game preview.",
      accentClass: "theme-pink",
      hud: "DUEL",
      previewNote: "Click inside the player frame and choose battle actions when the duel starts.",
      previewDurationSec: 16
    }
  };

  const previewModeConfigs = {
    asteroids: {
      id: "asteroids",
      label: "Asteroids",
      type: "mode",
      mode: "asteroids",
      description: "Answer fast to blast asteroid waves and build streak coins in a quick classroom preview.",
      note: "Click inside the player frame, answer questions, and blast asteroids. This preview uses a short guest room with no student login required.",
      heroImage: "/assets/minigames/asteroids/asteroids.svg",
      heroAlt: "Asteroids classroom mode art for the preview screen.",
      questionCount: 5,
      timerSeconds: 12
    }
  };

  function createFallbackCatalog() {
    return visibleMiniGameOrder.map((id) => {
      const visual = miniGameVisuals[id] || {};
      return {
        id,
        name: String(visual.label || visual.title || id),
        description: String(visual.description || visual.tagline || visual.label || id)
      };
    });
  }

  function createImageMap() {
    const map = {
      question: "/assets/minigames/shared/question.svg",
      asteroids: "/assets/minigames/asteroids/asteroids.svg"
    };
    for (const id of visibleMiniGameOrder) {
      const visual = miniGameVisuals[id] || {};
      const image = String(visual.heroImage || visual.image || "").trim();
      if (image) {
        map[id] = image;
      }
    }
    return map;
  }

  function createArcadePreviewConfigs() {
    const configs = { ...previewModeConfigs };
    for (const id of visibleMiniGameOrder) {
      const visual = miniGameVisuals[id] || {};
      const label = String(visual.label || visual.title || id);
      configs[id] = {
        id,
        label,
        type: "minigame",
        description: String(visual.description || visual.tagline || label),
        note: String(visual.previewNote || `Click inside the player frame first, then use the ${label} controls.`),
        heroImage: String(visual.heroImage || visual.image || ""),
        heroAlt: String(visual.heroAlt || `${label} preview art.`),
        miniGameDurationSec: Math.max(8, Number(visual.previewDurationSec || 14))
      };
    }
    return configs;
  }

  global.MINI_GAME_VISUAL_ORDER = visibleMiniGameOrder.slice();
  global.MINI_GAME_VISUALS = miniGameVisuals;
  global.MINI_GAME_FALLBACK_CATALOG = createFallbackCatalog();
  global.MINI_GAME_IMAGE_MAP = createImageMap();
  global.ARCADE_PREVIEW_CONFIGS = createArcadePreviewConfigs();
})(window);
