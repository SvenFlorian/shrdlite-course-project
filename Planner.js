var Planner;
(function (Planner) {
    function plan(interpretations, currentState) {
        var errors = [];
        var plans = [];
        interpretations.forEach(function (interpretation) {
            try {
                var result = interpretation;
                result.plan = planInterpretation(result.interpretation, currentState);
                if (result.plan.length == 0) {
                    result.plan.push("That is already true!");
                }
                plans.push(result);
            }
            catch (err) {
                errors.push(err);
            }
        });
        if (plans.length) {
            return plans;
        }
        else {
            throw errors[0];
        }
    }
    Planner.plan = plan;
    function stringify(result) {
        return result.plan.join(", ");
    }
    Planner.stringify = stringify;
    function cloneStacks(s) {
        var newStackList = new Array();
        for (var i = 0; i < s.length; i++) {
            var newStack = new Array();
            for (var j = 0; j < s[i].length; j++) {
                newStack.push(s[i][j]);
            }
            newStackList.push(newStack);
        }
        return newStackList;
    }
    function moveArm(state, n) {
        state.arm += n;
    }
    function drop(state) {
        state.stacks[state.arm].push(state.holding);
        state.holding = undefined;
    }
    function pickup(state) {
        state.holding = state.stacks[state.arm].pop();
    }
    var WorldStateNode = (function () {
        function WorldStateNode(state) {
            this.identifier = null;
            this.state = state;
        }
        WorldStateNode.prototype.toString = function () {
            if (this.state == null) {
                throw new Error("this state is null!");
            }
            if (this.identifier != null) {
                return this.identifier;
            }
            var s = "";
            for (var i = 0; i < this.state.stacks.length; i++) {
                for (var j = 0; j < this.state.stacks[i].length; j++) {
                    if (this.state.stacks[i][j] == undefined) {
                        break;
                    }
                    s += this.state.stacks[i][j];
                }
                s += "+";
            }
            s += this.state.arm;
            s += this.state.holding;
            return s;
        };
        return WorldStateNode;
    }());
    var StateGraph = (function () {
        function StateGraph() {
        }
        StateGraph.prototype.outgoingEdges = function (node) {
            var edgeList = new Array();
            if (node == undefined) {
                return edgeList;
            }
            var actions = getPossibleActions(node.state);
            for (var i = 0; i < actions.length; i++) {
                var newState = { arm: node.state.arm, stacks: cloneStacks(node.state.stacks),
                    holding: node.state.holding, objects: node.state.objects, examples: node.state.examples };
                switch (actions[i]) {
                    case "r":
                        moveArm(newState, 1);
                        break;
                    case "l":
                        moveArm(newState, -1);
                        break;
                    case "d":
                        drop(newState);
                        break;
                    case "p":
                        pickup(newState);
                        break;
                }
                var newEdge = new Edge();
                newEdge.from = node;
                newEdge.to = new WorldStateNode(newState);
                newEdge.cost = 1;
                edgeList.push(newEdge);
            }
            console.log(actions.toString());
            console.log(node.toString());
            return edgeList;
        };
        StateGraph.prototype.compareNodes = function (n1, n2) {
            var s1 = n1.state;
            var s2 = n2.state;
            if (s1 == null || s2 == null) {
                return 0;
            }
            if (s1.arm != s2.arm || s1.holding != s2.holding) {
                return 1;
            }
            for (var i = 0; i < s1.stacks.length; i++) {
                for (var j = 0; j < s1.stacks.length; j++) {
                    if (s1.stacks[i][j] != s2.stacks[i][j]) {
                        return 1;
                    }
                }
            }
            return 0;
        };
        return StateGraph;
    }());
    function getPossibleActions(w1) {
        var result = new Array();
        if (w1 == null) {
            return result;
        }
        if (w1.arm > 0) {
            result.push("l");
        }
        if (w1.arm < w1.stacks.length - 1) {
            result.push("r");
        }
        if (w1.holding == undefined) {
            result.push("p");
            return result;
        }
        if (w1.stacks[w1.arm].length == 0) {
            result.push("d");
            return result;
        }
        var temp = w1.stacks[w1.arm][w1.stacks[w1.arm].length - 1];
        var obj2 = w1.objects[temp];
        var obj = w1.objects[w1.holding];
        if ((obj2 == null) || (obj == null)) {
            return result;
        }
        if (!(obj.form == "ball" && obj2.form != "box") &&
            (!((obj.form == "box" && obj.size == "small") && (obj2.size == "small" && (obj2.form == "brick" || obj2.form == "pyramid")))) &&
            (!((obj.size == "large" && obj.form == "box") && (obj2.form == "pyramid"))) &&
            (!(obj2.size == "small" && obj.size == "large")) &&
            (!(obj2.form == "ball")) && (w1.stacks[w1.arm].length < 5)) {
            result.push("d");
        }
        return result;
    }
    function heur(ws, lit) {
        var cost = 0;
        switch (lit.relation) {
            case "holding":
                var pos = posOf(lit.args[0], ws);
                cost += pickupCost(lit.args[0], ws, pos);
                cost += moveCost(pos, ws);
                return cost;
            case "ontop":
                return onTopCost(ws, lit);
            case "inside":
                return onTopCost(ws, lit);
            case "above":
                break;
            case "under":
                break;
            case "beside":
                var obj = lit.args[0];
                var locPos = posOf(lit.args[1], ws);
                var costLeft = Infinity;
                var costRight = Infinity;
                if (locPos < ws.stacks.length - 1) {
                    costRight = moveCost(locPos + 1, ws);
                }
                if (locPos > 0) {
                    costLeft = moveCost(locPos - 1, ws);
                }
                return Math.min(costLeft, costRight);
            case "leftof":
                var objPos = posOf(lit.args[0], ws);
                return moveCost(objPos, ws);
            case "rightof":
                var objPos = posOf(lit.args[0], ws);
                return moveCost(objPos, ws);
        }
        return cost;
    }
    function onTopCost(ws, lit) {
        var obj = lit.args[0];
        var loc = lit.args[1];
        var pos1 = posOf(obj, ws);
        var pos2 = posOf(loc, ws);
        console.log(moveCost(pos1, ws));
        console.log(moveCost(pos2, ws));
        console.log(pickupCost(obj, ws, pos1));
        return pickupCost(obj, ws, pos1) + dropCost(loc, ws, pos2) + Math.max(moveCost(pos1, ws), moveCost(pos2, ws));
    }
    function moveCost(pos, state) {
        if (pos == Infinity || pos == -1) {
            return 0;
        }
        else {
            return Math.abs(state.arm - pos);
        }
    }
    function dropCost(loc, ws, pos) {
        var cost = 0;
        if (loc == "floor") {
            var smallestStack = ws.stacks[0];
            for (var i = 1; i < ws.stacks.length; i++) {
                if (ws.stacks[i].length < smallestStack.length) {
                    smallestStack = ws.stacks[i];
                }
            }
            return smallestStack.length * 4;
        }
        if (ws.holding == loc) {
            return 1;
        }
        cost += nrOfItemsOnTopOf(loc, ws, pos) + Math.abs(ws.arm - pos);
        return cost;
    }
    function pickupCost(desiredObject, ws, pos) {
        var cost = 0;
        if (ws.holding == desiredObject) {
            return 0;
        }
        cost += Math.abs(ws.arm - pos);
        cost += nrOfItemsOnTopOf(desiredObject, ws, pos) * 4;
        if (ws.holding != undefined) {
            cost += 2;
        }
        return cost;
    }
    function nrOfItemsOnTopOf(s, ws, pos) {
        if (ws.holding == s) {
            return 0;
        }
        var result = 0;
        for (var i = 0; i < ws.stacks[pos].length; i++) {
            if (ws.stacks[pos][i] == s) {
                break;
            }
            result++;
        }
        return result;
    }
    function posOf(s, ws) {
        var result = -1;
        if (s == "floor") {
            return Infinity;
        }
        for (var i = 0; i < ws.stacks.length; i++) {
            result = ws.stacks[i].indexOf(s);
            if (result != -1) {
                return result;
            }
        }
        return result;
    }
    function planInterpretation2(interpretation, state) {
        var testNode = new WorldStateNode(state);
        var heuristics = function heuristicsf(node) {
            var minhcost = Infinity;
            for (var i = 0; i < interpretation.length; i++) {
                minhcost = Math.min(minhcost, heur(node.state, interpretation[i][0]));
            }
            console.log(minhcost);
            return minhcost;
        };
        console.log(" " + testNode.toString() + " - cost: " + heuristics(testNode));
        return null;
    }
    function planInterpretation(interpretation, state) {
        var stateGraph = new StateGraph();
        var heuristics = function heuristicsf(node) {
            var minhcost = Infinity;
            for (var i = 0; i < interpretation.length; i++) {
                minhcost = Math.min(minhcost, heur(node.state, interpretation[i][0]));
            }
            console.log(minhcost);
            return minhcost;
        };
        var goalFunction = function goalf(node) {
            var world = node.state;
            var result = false;
            for (var i = 0; i < interpretation.length; i++) {
                var l = interpretation[i][0];
                var subResult;
                if (l.relation == "holding") {
                    subResult = world.holding == l.args[0];
                }
                else {
                    subResult = Interpreter.matchesRelation(l.args[0], l.args[1], l.relation, world);
                }
                if (!l.polarity) {
                    subResult = !subResult;
                }
                result = result || subResult;
            }
            return result;
        };
        var result = aStarSearch(stateGraph, new WorldStateNode(state), goalFunction, heuristics, 1);
        var plan = new Array();
        for (var i = 0; i < result.path.length - 1; i++) {
            var current = result.path[i].state;
            var next = result.path[i + 1].state;
            if (current.arm + 1 == next.arm) {
                plan.push("r");
                continue;
            }
            if (current.arm - 1 == next.arm) {
                plan.push("l");
                continue;
            }
            if (current.holding == undefined) {
                plan.push("p");
            }
            else {
                plan.push("d");
            }
        }
        return plan;
    }
})(Planner || (Planner = {}));
