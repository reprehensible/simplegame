/* set up data */

var board = {
  id: "gameboard",
  x: 500,
  y: 500,
  background: [200,200,200]
};

var entities = [];

var scores = {
  win: 0,
  lose: 0
};

var entitiesTemplate = [
  {
    id: "blob",
    player: true,
    size: 5,
    color: [0,0,0],
    position: [10,10]
  },
  {
    id: "enemy",
    enemy: true,
    size: 10,
    color: [200,0,0],
    position: [300,300],
    ai: "runningAi"
  }
];

/* board/vector/measurement functions */

var measureDistance = function(a,b) {
  return [a.position[0] - b.position[0], a.position[1] - b.position[1]];
};

var hypotenuse = function(components) {
  return Math.sqrt(Math.pow(components[0],2) + Math.pow(components[1],2));
};

var reflect = function(v) {
  return [v[0] * -1, v[1] * -1];
};

// given a vector, return it at unit scale
var norm = function(v) {
  var mag = [Math.abs(v[0]), Math.abs(v[1])];
  var n = mag[0] > mag[1] ? [1,mag[1]/mag[0]] : [mag[0]/mag[1], 1];
  if (v[0] < 0) { n[0] = n[0] * -1; }
  if (v[1] < 0) { n[1] = n[1] * -1; }
  return n;
};

var applyVector = function(v, pos) {
  return [pos[0] + v[0], pos[1] + v[1]];
};

var box = function(entity, pos) {
  var exta = (entity.size / 2).toFixed(0);
  var extb = entity.size - exta;
  return [
    [pos[0] - exta, pos[1] - exta],
    [pos[0] + extb, pos[1] - exta],
    [pos[0] - exta, pos[1] + extb],
    [pos[0] + extb, pos[1] + extb]
  ];
};

var intersect = function(a,b) {
  var abox = box(a, a.position);
  var bbox = box(b, b.position);
  for (var i = 0; i < 3; i++) {
    if ((abox[i][0] >= bbox[0][0]) && (abox[i][0] <= bbox[1][0]) && (abox[i][1] >= bbox[0][1]) && (abox[i][1] <= bbox[3][1])) {
      return true;
    }
  }
  return false;
};

var validPosition = function(board, entity, pos) {
  var exta = (entity.size / 2).toFixed(0);
  var extb = entity.size - exta;
  var b = box(entity, pos);
  return (b[0][0] > 0) && (b[0][1] > 0) && (b[3][0] < board.x) && (b[3][1] < board.y);
};

/* AI definitions */

var newBulletAi = function(vec) {
  return function(self, board, entities) {
    var newpos = applyVector(vec, self.position);
    if (validPosition(board, self, newpos)) {
      self.position = newpos;
    }
    else {
      for (i in entities) {
        if (entities[i] === self) {
          entities.splice(i,1);
          break;
        }
      }
    }
  };
};

var ai = {};
ai["runningAi"] = function(self, board, entities) {
  // initialize
  if (!self.aiData) {
    self.aiData = {
      bias: [0,0],
      biasCount: 0,
      bulletTick: 0
    };
  }

  // set up movement jitter
  if (self.aiData.biasCount < 1) {
    self.aiData.bias[0] = Math.random();
    self.aiData.bias[1] = Math.random();
    self.aiData.biasCount = (Math.random() * 20).toFixed(0);
  }
  self.aiData.biasCount = self.aiData.biasCount - 1;

  // find player
  var player = entities.filter(function(e) { return !!e.player; })[0];
 
  // point to the player 
  var playerDistance = measureDistance(player,self);
  var playerNorm = norm(playerDistance);

  // propose movement towards the player with some randomness
  var movementcalc = function(self, board, playerNorm, bias) {
    var v = [playerNorm[0]*2 * bias[0], playerNorm[1]*2 * bias[1]];
    if (hypotenuse(playerDistance) < 100) {
      v = reflect(v);
    }
    var newpos = applyVector(v, self.position);
    var b = box(self, newpos);
    if ((b[0][0] <= 0) || (b[3][0] >= board.x)) {
      v[0] = 0;
      newpos = applyVector(v, self.position);
    }
    if ((b[0][1] <= 0) || (b[3][1] >= board.y)) {
      v[1] = 0;
      newpos = applyVector(v, self.position);
    }
    return newpos;
  };

  // actually move, if ending position is valid
  var newpos = movementcalc(self, board, playerNorm, self.aiData.bias);
  if (validPosition(board, self, newpos)) {
    self.position = newpos;
  }

  // fire bullets
  self.aiData.bulletTick = self.aiData.bulletTick + 1;
  if (self.aiData.bulletTick % 50 === 0) {
    var vec = [playerNorm[0]*3, playerNorm[1]*3];
    var bullet = newBullet("b"+self.aiData.bulletTick, self.position, vec);
    entities.push(bullet);
  }
};

/* drawing-related functions */

var draw = function(entities, board) {
  var ctx = board.elementRef.getContext("2d");
  ctx.fillStyle = cssColor([230,230,230]);
  ctx.fillRect(0, 0, board.x, board.y);
  for (i in entities) {
    ctx.fillStyle = cssColor(entities[i].color);
    var b = box(entities[i], entities[i].position);
    ctx.fillRect(b[0][0].toFixed(0), b[0][1].toFixed(0), entities[i].size, entities[i].size);
  }
};

var cssColor = function(rgb) {
  return "rgb(" + rgb.join(",") + ")";
};

var boardElement = function (board) {
  var el = document.createElement("canvas");
  el.id = board.id;
  el.width = board.x;
  el.height = board.y;
  return el;
};

var updateScoreboard = function(scores) {
  var eachclass = function(cssclass, f) {
    var r = document.getElementsByClassName(cssclass);
    Array.prototype.forEach.call(r, function(v,k) {
      f(v);
    });
  };
  eachclass("winscore", function(v) { v.innerHTML = scores["win"]; });
  eachclass("losescore", function(v) { v.innerHTML = scores["lose"]; });
};

var setPhysicalPosition = function(entity, el) {
  el.style.left = (entity.position[0].toFixed(0) - (entity.size / 2).toFixed(0)) + "px";
  el.style.top = (entity.position[1].toFixed(0) - (entity.size / 2).toFixed(0)) + "px";
};

/* game support functions */

var win = function() {
  scores["win"] = scores["win"] + 1;
  updateScoreboard(scores);
  resetGame();
};

var lose = function() {
  scores["lose"] = scores["lose"] + 1;
  updateScoreboard(scores);
  resetGame();
};

var newBullet = function(id, pos, vec) {
    return bullet = {
      id: id,
      ai: newBulletAi([vec[0], vec[1]]),
      size: 3,
      color: [100,100,255],
      position: [pos[0], pos[1]],
      shape: "round",
      hazard: true
    };
};

var inputVelocity = function(keystate) {
  var v = [0,0];
  var mult = 3;
  if (keystate["left"]) v[0] = (v[0] - 1) * mult;
  if (keystate["right"]) v[0] = (v[0] + 1) * mult;
  if (keystate["up"]) v[1] = (v[1] - 1) * mult;
  if (keystate["down"]) v[1] = (v[1] + 1) * mult;
  return v;
};

// main tick loop
var loop = function(board, entities, keystate) {
  // move
  for (i in entities) {
    var entity = entities[i];

    if (entity.player) {
      var v = inputVelocity(keystate);
      var newpos = applyVector(v, entity.position);
      if (validPosition(board, entity, newpos)) {
        entity.position = newpos;
      }
    }
    else if (entity.ai) {
      var f;
      if (typeof(entity.ai) === "string") {
        f = ai[entity.ai];
      }
      else {
        f = entity.ai;
      }
      f.call(ai, entity, board, entities);
    }

    draw(entities,board);
  }

  // collision
  for (i in entities) {
    var a = entities[i];
    for (j in entities) {
      var b = entities[j];
      if (intersect(a,b)) {
        if ((a.player || b.player) && (a.hazard || b.hazard)) {
          lose();
        }
        if ((a.player || b.player) && (a.enemy || b.enemy)) {
          win();
        }
      }
    }
  }
};

var resetGame = function() {
  var copy = function(o) {
    if (typeof(o) !== "object") {
      return o;
    }
    if (o instanceof Array) {
      return o.map(function(v) { return copy(v); });
    }
    else {
      var r = {};
      for (k in o) { r[k] = copy(o[k]); }
      return r;
    }
  };
  newEntities = copy(entitiesTemplate);
  entities.splice(0, entities.length);
  for (i in newEntities) {
    entities.push(newEntities[i]);
  }
  draw(entities, board);
};

// initialize state
var keystate = {
  up: false,
  down: false,
  left: false,
  right: false
};

board.elementRef = boardElement(board);
resetGame();
document.getElementsByTagName("body")[0].appendChild(board.elementRef);

// set up pause/start events
var interval;
board.elementRef.onclick = function() {
  if (interval) {
    window.clearInterval(interval);
    interval = null;
  }
  else {
    interval = window.setInterval(loop, 16, board, entities, keystate); // tick
  }
};

// track arrow key state
(function(keystate) {
  var checkArrowKeys = function(keyCode) {
      if (keyCode == '38') {
        return "up";
      }
      else if (keyCode == '40') {
        return "down";
      }
      else if (keyCode == '37') {
        return "left";
      }
      else if (keyCode == '39') {
        return "right";
      }
      return null;
  };

  document.onkeydown = function(e) {
    var arrow = checkArrowKeys(e.keyCode);
    if (arrow) {
      //console.log("down",arrow);
      keystate[arrow] = true;
      return false;
    }
  };
  document.onkeyup = function(e) {
    var arrow = checkArrowKeys(e.keyCode);
    if (arrow) {
      //console.log("up",arrow);
      keystate[arrow] = false;
      return false;
    }
  };
})(keystate);
