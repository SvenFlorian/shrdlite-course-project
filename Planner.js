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
    function huer(ws, lit) {
        var cost = 0;
        if (lit.relation == "holding") {
            var desiredObject = lit.args[0];
            if (ws.holding == desiredObject) {
                return 0;
            }
            cost += Math.abs(ws.arm - posOf(desiredObject, ws));
        }
        return cost;
    }
    function posOf(s, ws) {
        var result = -1;
        for (var i = 0; i < ws.stacks.length; i++) {
            result = ws.stacks[i].indexOf(s);
            if (result != -1) {
                return result;
            }
        }
        return -1;
    }
    function planInterpretation2(interpretation, state) {
        var testNode = new WorldStateNode(state);
        var stateGraph = new StateGraph();
        var edges = stateGraph.outgoingEdges(testNode);
        var testNode2 = edges[0].to;
        var edges = stateGraph.outgoingEdges(testNode2);
        var testNode3 = edges[0].to;
        console.log(" " + testNode.toString() + " - actions: " + getPossibleActions(testNode.state));
        console.log(" " + testNode2.toString() + " - actions: " + getPossibleActions(testNode2.state));
        console.log(" " + edges[0].to.toString() + " - actions: " + getPossibleActions(edges[0].to.state));
        console.log(" " + edges[1].to.toString() + " - actions: " + getPossibleActions(edges[1].to.state));
        console.log(" " + edges[2].to.toString() + " - actions: " + getPossibleActions(edges[2].to.state));
        return null;
    }
    function planInterpretation(interpretation, state) {
        var stateGraph = new StateGraph();
        var heuristics = function heuristics(node) {
            var minhcost = Infinity;
            for (var i = 0; i < interpretation.length; i++) {
                minhcost = Math.min(minhcost, huer(node.state, interpretation[i][0]));
            }
            return 0;
        };
        var goalFunction = function goalf(node) {
            var world = node.state;
            var result = false;
            for (var i = 0; i < interpretation.length; i++) {
                var l = interpretation[i][0];
                var subResult;
                if (l.relation == "holding") {
                    subResult = node.state.holding == l.args[0];
                }
                else {
                    Interpreter.matchesRelation(l.args[0], l.args[1], l.relation, world);
                }
                if (!l.polarity) {
                    subResult = !subResult;
                }
                result = result || subResult;
            }
            return result;
        };
        var result = aStarSearch(stateGraph, new WorldStateNode(state), goalFunction, heuristics, 100);
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
