function createAgentClass (world) {
    var width  = world.width;
    var height = world.height;

    function Agent(x, y, kind, color, turnSpeed, size) {
        this.kind = kind;
        this.color = color;

        this.pos = new Victor(x, y); //position

        this.vel = 0;// velocity
        this.orient = 0;

        this.turnSpeed = turnSpeed || 0;
        this.size = size || 5;
    }

    //Agent.size = 16;
    //Agent.turnSpeed = Math.PI / (9 * 2);

    //static methods
    Agent.clampAngle = function (angle) {
        // remove 360 multipliers
        if (Math.abs(angle) > 2 * Math.PI) {
            angle = angle % (2 * Math.PI);
        }
        //ensure below 180
        if (angle > Math.PI) {
            angle = -(2 * Math.PI - angle);
        }
        //ensure above -180
        if (angle < -Math.PI) {
            angle = 2*Math.PI + angle;
        }
        return angle;
    };

    Agent.loopPos = function(x, dist) {
        x = x % dist;
        if (x < 0) {
            x = x + dist;
        }
        return x;
    };

    Agent.clampPos = function (pos) {
        return new Victor(
            Agent.loopPos(pos.x, width),
            Agent.loopPos(pos.y, height)
        );
        //return new Victor(
        //    Math.min(Math.max(0, pos.x), width),
        //    Math.min(Math.max(0, pos.y), height)
        //);
    };

    Agent.findClosest = function (pos, items) {
        if (items.length === 0) {
            return null;
        }
        return _.min(items, function (item) {
            return pos.distance(item.pos);
        });
    };

    Agent.calcDirDiff = function(pos, orient, otherPos) {
        var diff = otherPos.clone().subtract(pos).normalize();
        var dir = new Victor(Math.sin(orient), Math.cos(orient));
        return diff.dot(dir);
    };

    Agent.calcOrientDiff = function(orient1, orient2) {
        var dir1 = new Victor(Math.sin(orient1), Math.cos(orient1));
        var dir2 = new Victor(Math.sin(orient2), Math.cos(orient2));
        return dir1.dot(dir2);
    };


    Agent.deg = function(angle) {
        return Math.floor(angle * 180 / Math.PI);
    };

    Agent.prototype.render = function () {

        //centered rectangle
        world.ctx.beginPath();
        world.ctx.arc(this.pos.x, height - this.pos.y, this.size*0.5, 0, 2 * Math.PI, false);
        world.ctx.fillStyle = this.color;
        world.ctx.fill();
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

    Agent.prototype.turnBy = function (deltaAngle) {
        return Agent.clampAngle(this.orient + deltaAngle);
    };


    return Agent;
}

