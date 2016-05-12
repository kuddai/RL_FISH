
function createWorldClass() {
    var world = {
        init: function (canvas, fps) {
            this.ctx = canvas.getContext('2d');
            this.width = canvas.width;
            this.height = canvas.height;
            this.fps = fps;
            this.gameObjects = [];
            this.deltaT = 0.0;
            this._lastT = new Date().getTime();
        },

        renderAll: function () {
            //clear canvas before redrawing
            this.ctx.fillStyle = "white";
            this.ctx.clearRect(0, 0, this.width, this.height);
            //clone game objects to be resilient to their
            //deletion or adding during update
            var clonedGOs = this._cloneGOs();

            clonedGOs = this._getExisting(clonedGOs);
            clonedGOs = clonedGOs.filter(function (go) {
                return !!go.render;
            });
            _.each(clonedGOs, function (go) {
                go.render();
            });
        },

        updateAll: function () {
            //clone game objects to be resilient to their
            //deletion or adding during update
            var clonedGOs = this._cloneGOs();
            world._updateDeltaT();
            _.each(clonedGOs, function (go) {
                //update delta time
                if (!go.isGarbage && go.update) {
                    go.update();
                }
            });

            this._cleanUp();
        },

        addGameObject: function (gameObject) {
            gameObject.isGarbage = false;
            this.gameObjects.push(gameObject);
        },

        removeGameObject: function (gameObject) {
            var index = this.gameObjects.indexOf(gameObject);
            if (index !== -1) {
                var go = this.gameObjects[index];
                go.isGarbage = true;
            }
        },

        startMainLoop: function () {
            //1000/25 -> 25 updates in one second
            var fps = this.fps;
            setInterval(function () {
                world.renderAll();
                world.updateAll();
            }, 1000 / fps);
        },

        _cleanUp: function (gameObject) {
            //leave only objects which is not garbage
            this.gameObjects = this._getExisting(this.gameObjects);
        },

        _getExisting: function (gameObjects) {
            return gameObjects.filter(function (go) {
                return !go.isGarbage;
            });
        },

        _cloneGOs: function () {
            return this.gameObjects.slice(0);
        },

        _updateDeltaT: function () {
            var t = new Date().getTime();
            this.deltaT = 1.0 / this.fps;
            this._lastT = t;
        }
    };

    return world;
}

function createAgentClass (world) {
    var width  = world.width;
    var height = world.height;

    function Agent(x, y, kind, color) {
        this.kind = kind;
        this.color = color;

        this.pos = new Victor(x, y);
        this.vel = 0;
        this.orient = 0;
    }

    Agent.size = 16;
    Agent.half = Agent.size * 0.5;
    Agent.turnSpeed = Math.PI / (9 * 2);

    Agent.clampAngle = function (angle) {
        if (Math.abs(angle) > 2 * Math.PI) {
            angle = angle % (2 * Math.PI);
        }
        if (angle > Math.PI) {
            angle = -(2 * Math.PI - angle);
        }
        if (angle < -Math.PI) {
            angle = 2*Math.PI + angle;
        }
        return angle;
    };

    Agent.clampPos = function (pos) {
        return new Victor(
            Math.min(Math.max(0, pos.x), width),
            Math.min(Math.max(0, pos.y), height)
        );
    };

    Agent.findClosest = function (pos, items) {
        return _.min(items, function (item) {
            return pos.distance(item.pos);
        });
    };

    Agent.calcAngleBetween = function(pos, orient, otherPos) {
        var diff = otherPos.clone().subtract(pos).normalize();
        var dir = new Victor(Math.cos(orient), Math.sin(orient));
        var prod = 1 - diff.dot(dir);
        return prod;
        var angleBetween = diff.horizontalAngle();
        var clockAngle = Math.abs(Agent.clampAngle(angleBetween - orient));
        var antiClockAngle = Math.abs(Agent.clampAngle(-angleBetween + orient));
        return Math.min(clockAngle, antiClockAngle);
    };

    Agent.deg = function(angle) {
        return Math.floor(angle * 180 / Math.PI);
    };

    Agent.prototype.render = function () {
        world.ctx.fillStyle = this.color;
        //centered rectangle
        world.ctx.fillRect(
            this.pos.x - Agent.half,
            width - (this.pos.y - Agent.half),
            Agent.size, Agent.size
        );
    };

    Agent.prototype.forwardStep = function (orient) {
        if (!orient) {
            orient = this.orient;
        }
        var dPos = new Victor(
            this.vel * Math.sin(orient) * world.deltaT,
            this.vel * Math.cos(orient) * world.deltaT
        );

        var newPos = this.pos.clone().add(dPos);
        newPos = Agent.clampPos(newPos);
        return newPos;
    };

    Agent.prototype.turnBy = function (dAngle) {
        return Agent.clampAngle(this.orient + dAngle);
    };



    return Agent;
}



function createGrassClass(Agent) {
    function Grass(x, y) {
        Agent.call(this, x, y, 'grass', 'green');
    }

    Grass.prototype = Object.create(Agent.prototype);

    return Grass;
}


function createHunterClass(Agent, world) {

    function Hunter(x, y, weights) {
        Agent.call(this, x, y, 'hunter', 'red');
        this.vel = 15;
        this.kind = "hunter";
        this.numFoodEaten = 0;
        this.weights = weights;
        this.allFood = [];
        this.nearestFood = null;
    }

    Hunter.prototype = Object.create(Agent.prototype);

    Hunter.eps = 0.1;
    Hunter.yr = 0.9;
    Hunter.ar = 0.1;

    Hunter.dot = function (ar1, ar2) {
        var sum = 0;
        for(var i = 0; i < ar1.length; i++) {
            sum += ar1[i] * ar2[i];
        }
        return sum;
    };

    Hunter.norm = function (ar) {
        var leng = Math.sqrt(Hunter.dot(ar, ar))+0.000001;
        for(var i = 0; i < ar.length; i++) {
            ar[i] /= leng;
        }
    };

    Hunter.prototype.greedy = function () {
        var maxAction = 2;
        var maxQ = -Infinity;
        var maxFeatures = null;

        for (var action = 2; action <= 3; action++) {
            var features = this.calcFeatures(action);
            var Q = Hunter.dot(features, this.weights);
            if (Q > maxQ) {
                maxQ = Q;
                maxAction = action;
                maxFeatures = features;
            }
        }
        return [maxAction, maxQ, maxFeatures];
    };

    Hunter.prototype.epsGreedy = function () {
        if (Math.random() < Hunter.eps) {
            var action = Math.round((Math.random()) + 2);
            var features = this.calcFeatures(action);
            var Q = Hunter.dot(features, this.weights);
            return [action, Q, features];
        }
        return this.greedy();
    };

    Hunter.prototype.perform = function (action) {
        var reward = -1;
        //if (action == 1) {
        //    this.pos = this.forwardStep();
        this.pos = this.forwardStep();
        if (action == 2) {
            //turn by +5 c
            var angle = this.turnBy(Agent.turnSpeed);
            this.orient = angle;
        } else if (action == 3) {
            //turn by -5 c
            var angle = this.turnBy(-Agent.turnSpeed);
            this.orient = angle;
        }

        if (this.pos.distance(this.nearestFood.pos) < Agent.size) {
            this.numFoodEaten += 1;
            this.nearestFood.isGarbage = true;
            reward = 10;
        }

        return reward;
    };

    Hunter.prototype.getAllFood = function() {
        return world.gameObjects.filter(function (go) {
            return go.kind === "grass";
        });
    };

    Hunter.prototype.updateFood = function() {
        this.allFood = this.getAllFood();
        if (this.allFood.length == 0) {
            this.nearestFood = null;
            return;
        }
        this.nearestFood = Agent.findClosest(this.pos, this.allFood);
    };

    Hunter.prototype.update = function () {
        console.log("weights", this.weights);
        console.log("orient", this.orient);
        this.updateFood();
        if (!this.nearestFood) {
            return;
        }

        var result = this.epsGreedy();
        var action = result[0];
        console.log("action", action);
        var Q = result[1];
        var features = result[2];

        var reward = this.perform(action);

        this.updateFood();
        if (!this.nearestFood) {
            return;
        }

        var nextResult = this.greedy();
        var nextV = nextResult[1];

        var TD = (reward + Hunter.yr * nextV - Q);
        for (var i = 0; i < features.length; i++) {
            this.weights[i] += Hunter.ar *(TD * (features[i]));
        }
        //Hunter.norm(this.weights);
    };

    Hunter.prototype.calcFeatures = function (action) {
        var a = action;
        var features = [0, 0, 0];
        if (this.allFood.length == 0) {
            Hunter.norm(features);
            return features;
        }

        //default values
        var pos = this.pos;
        var nearestFood = this.nearestFood;
        //features[0] = pos.distance(nearestFood.pos);

        //if (a == 1) {
        //    //virtually move forward
        //    //distance to closest food
        //    pos = this.forwardStep();
        //    nearestFood = Agent.findClosest(pos, this.allFood);
        //    features[0] = pos.distance(nearestFood.pos);
        //    features[1] = Agent.calcAngleBetween(pos, this.orient, nearestFood.pos);
        //    if (features[0] < Agent.size) {
        //        features[2] = this.numFoodEaten + 1;
        //    }
        if (a == 2) {
            //turn by +5 c
            var orient = this.turnBy(Agent.turnSpeed);
            pos = this.forwardStep(orient);
            nearestFood = Agent.findClosest(pos, this.allFood);
            features[1] = -pos.distance(nearestFood.pos);//-Agent.calcAngleBetween(pos, orient, nearestFood.pos);
            //if (features[1] < Agent.size) {
            //    features[2] = this.numFoodEaten + 1;
            //}
        } else if (a == 3) {
            //turn by -5 c
            var orient = this.turnBy(-Agent.turnSpeed);
            pos = this.forwardStep(orient);
            nearestFood = Agent.findClosest(pos, this.allFood);
            features[1] = -pos.distance(nearestFood.pos);//-Agent.calcAngleBetween(pos, orient, nearestFood.pos);
            //if (features[1] < Agent.size) {
            //    features[2] = this.numFoodEaten + 1;
            //}
        }

        Hunter.norm(features);
        return features;
    };

    return Hunter;
}

var world = createWorldClass();
world.init(document.getElementById('mainWindow'), 25);
var Agent  = createAgentClass(world);
var Grass  = createGrassClass(Agent);
var Hunter = createHunterClass(Agent, world);

for (var i=0; i < 80; i++) {
    var x = Math.random() * world.width;
    var y = Math.random() * world.height;
    var grass = new Grass(x, y);
    console.log("grass", grass.pos);
    world.addGameObject(grass);
}

var x = Math.random() * world.width;
var y = Math.random() * world.height;

var hunter = new Hunter(x, y, [0.0, 0.0, 0.0]);

world.addGameObject(hunter);

function nextStep() {
    world.renderAll();
    world.updateAll();
    console.log("pos", hunter.pos, "orient", hunter.orient);
    console.log("weights", hunter.weights);
}

world.startMainLoop();