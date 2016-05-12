function createGrassClass(Agent) {
    function Grass(x, y) {
        Agent.call(this, x, y, 'grass', 'green');

    }



    Grass.prototype = Object.create(Agent.prototype);
    Grass.prototype.worth = 3;

    return Grass;
}