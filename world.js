
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

        getKind: function (kind, exclusion) {
            return this.gameObjects.filter(function (go) {
                return go.kind === kind && go !== exclusion;
            });
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

