var world = createWorldClass();
world.init(document.getElementById('mainWindow'), 25);
var Agent  = createAgentClass(world);
var Grass  = createGrassClass(Agent);
var Hunter = createHunterClass(Agent, world, document.getElementById('fish-sprite'));

for (var i=0; i < 80; i++) {
    var x = Math.random() * world.width;
    var y = Math.random() * world.height;
    var grass = new Grass(x, y);
    console.log("grass", grass.pos);
    world.addGameObject(grass);
}


weights = [0.0, 0.0, 0.0, 0.0, 0.0];

var hunter1 = new Hunter(Math.random() * world.width, Math.random() * world.height, weights);
var hunter2 = new Hunter(Math.random() * world.width, Math.random() * world.height, weights);

world.addGameObject(hunter1);
world.addGameObject(hunter2);

function nextStep() {
    world.renderAll();
    world.updateAll();
    console.log("pos", hunter.pos, "orient", hunter.orient);
    console.log("weights", hunter.weights);
}

world.startMainLoop();