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
                return "";
            }
            if (this.identifier != null) {
                return this.identifier;
            }
            var s = "";
            for (var i = 0; i < this.state.stacks.length; i++) {
                for (var j = 0; j < this.state.stacks.length; j++) {
                    if (this.state.stacks[i][j] == undefined) {
                        continue;
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
        var temp = w1.stacks[w1.arm].pop();
        if (temp != null) {
            w1.stacks[w1.arm].push(temp);
        }
        if (w1.arm > 0) {
            result.push("l");
        }
        if (w1.arm < w1.stacks.length - 1) {
            result.push("r");
        }
        if (temp != null) {
            result.push("p");
        }
        var obj2 = w1.objects[temp];
        var obj = w1.objects[w1.holding];
        if (obj2 == null) {
            result.push("d");
        }
        if ((obj2 == null) || (obj == null)) {
            return result;
        }
        if (!(obj.form == "ball" && obj2.form != "box") ||
            (!((obj.form == "box" && obj.size == "small") && (obj2.size == "small" && (obj2.form == "brick" || obj2.form == "pyramid")))) ||
            (!((obj.size == "large" && obj.form == "box") && (obj2.form == "pyramid"))) ||
            (!(obj2.size == "small" && obj.size == "large")) ||
            (!(obj2.form == "ball")) || (w1.stacks[w1.arm].length < 5)) {
            result.push("d");
        }
        return result;
    }
    function planInterpretation(interpretation, state) {
        var stateGraph = new StateGraph();
        var heuristics = function huer(node) {
            return 0;
        };
        var goalFunction = function goalf(node) {
            var world = node.state;
            var result = false;
            for (var i = 0; i < interpretation.length; i++) {
                var l = interpretation[i][0];
                var subResult = Interpreter.matchesRelation(l.args[0], l.args[1], l.relation, world);
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
                break;
            }
            if (current.arm - 1 == next.arm) {
                plan.push("l");
                break;
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
