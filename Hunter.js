function createHunterClass(Agent, world, sprite) {

    var maxDist  = Math.hypot(world.width, world.height);

    function Hunter(x, y, weights) {
        Agent.call(this, x, y, 'hunter', 'red', Math.PI / (1.5), 16);
        this.satiety = 0;
        this.vel = 15;
        this.kind = "hunter";
        this.weights = weights;
        this.allFood = [];
        this.nearestFood = null;
    }

    Hunter.prototype = Object.create(Agent.prototype);

    Hunter.eps = 0.1;
    Hunter.yr = 0.9;
    Hunter.ar = 0.1;

    Hunter.minVel = 8;
    Hunter.maxVel = 40;

    Hunter.hungerRate = 0.3;

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

    Hunter.prototype.render = function () {
        var half = this.size*0.5;

        world.ctx.save(); // save current state

        world.ctx.translate(this.pos.x, world.height - this.pos.y);
        world.ctx.rotate(this.orient); // rotate
        world.ctx.drawImage(sprite, -half , -half, this.size, this.size); // draws a chain link or dagger
        world.ctx.restore();
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
        this.satiety = Math.min(Math.max(0, this.satiety - Hunter.hungerRate * world.deltaT), Hunter.maxVel);
        this.vel = Math.min(Hunter.minVel + this.satiety, Hunter.maxVel);
        //if (action == 1) {
        //    this.pos = this.forwardStep();

        if (action == 2) {
            //turn by +5 c
            var angle = this.turnBy(this.turnSpeed * world.deltaT);
            this.orient = angle;
        } else if (action == 3) {
            //turn by -5 c
            var angle = this.turnBy(-this.turnSpeed * world.deltaT);
            this.orient = angle;
        }

        this.pos = this.forwardStep();
        var nearestFood = Agent.findClosest(this.pos, this.allFood);
        if (!nearestFood) {
            return reward;
        }
        var contactDist = (nearestFood.size + this.size) * 0.5;
        if (this.pos.distance(nearestFood.pos) < contactDist) {
            this.satiety += nearestFood.worth;
            nearestFood.isGarbage = true;
            reward = 10;
        }

        return reward;
    };

    Hunter.prototype.updateFood = function() {
        this.allFood = world.getKind("grass");
        this.nearestFood = Agent.findClosest(this.pos, this.allFood);
    };

    Hunter.prototype.update = function () {
        console.log("weights", this.weights);
        //console.log("orient", this.orient);
        this.updateFood();
        this.allHunters = world.getKind("hunter", this);
        this.nearestHunter = Agent.findClosest(this.pos, this.allHunters);

        var result = this.epsGreedy();
        var action = result[0];
        //console.log("action", action);
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

    Hunter.prototype.calcBasisFun = function(pos, orient) {
        var funcs = [0, 0, 0, 0, 0];
        var nearestFood = Agent.findClosest(pos, this.allFood) || {pos: pos};
        var deltaSatiety = -1;
        if (this.allFood.length !== 0) {
            var averageFoodPos = _.reduce(this.allFood, function (memo, f) {
                return memo.add(f.pos);
            }, new Victor(0, 0));
            averageFoodPos.divideScalar(this.allFood.length);
            var contactDist = (nearestFood.size + this.size) * 0.5;
            if (pos.distance(nearestFood.pos) < contactDist) {
                deltaSatiety = 1;
            }
        } else {
            var averageFoodPos = pos;
        }
        var nearestHunter = Agent.findClosest(pos, this.allHunters) || {pos: pos, orient: orient};



        var contactDist = (nearestFood.size + this.size) * 0.5;
        if (this.pos.distance(nearestFood.pos) < contactDist ) {
            this.satiety += nearestFood.worth;
            nearestFood.isGarbage = true;
            reward = 10;
        }


        //funs[0] = -pos.distance(averageFoodPos)/maxDist;
        funcs[0] = -pos.distance(nearestFood.pos)/maxDist;
        funcs[1] = -(1 - Agent.calcDirDiff(pos, orient, nearestFood.pos))/2.0;

        funcs[2] = pos.distance(nearestHunter.pos)/maxDist;
        funcs[3] = (1 - Agent.calcOrientDiff(orient, nearestHunter.orient))/2.0;

        funcs[4] = deltaSatiety;

        Hunter.norm(funcs);
        return funcs;
    };

    Hunter.prototype.calcFeatures = function (action) {
        //default values
        if (action == 2) {
            var orient = this.turnBy(this.turnSpeed * world.deltaT);
            var pos = this.forwardStep(orient);
        } else if (action == 3) {
            var orient = this.turnBy(-this.turnSpeed * world.deltaT);
            var pos = this.forwardStep(orient);
        }

        return this.calcBasisFun(pos, orient);;
    };

    return Hunter;
}