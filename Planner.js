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
    function StringifyState(state) {
        var s = "";
        for (var i = 0; i < state.stacks.length; i++) {
            for (var j = 0; j < state.stacks.length; j++) {
                if (state.stacks[i][j] == undefined) {
                    continue;
                }
                s += state.stacks[i][j];
            }
            s += "+";
        }
        s += state.arm;
        s += state.holding;
        return s;
    }
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
    var StateGraph = (function () {
        function StateGraph() {
        }
        StateGraph.prototype.outgoingEdges = function (node) {
            var edgeList = new Array();
            var actions = getPossibleActions(node);
            for (var i = 0; i < actions.length; i++) {
                var newState = { arm: node.arm, stacks: cloneStacks(node.stacks),
                    holding: node.holding, objects: node.objects, examples: node.examples };
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
                newEdge.to = newState;
                newEdge.cost = 1;
                edgeList.push(newEdge);
            }
            return edgeList;
        };
        StateGraph.prototype.compareNodes = function (s1, s2) {
            if (s1.arm != s2.arm || s1.holding != s2.holding) {
                return 1;
            }
            for (var i = 0; i < s1.stacks.length; i++) {
                for (var j = 0; j < s1.stacks.length; j++) {
                    if (s1.stacks[i][j] != s1.stacks[i][j]) {
                        return 1;
                    }
                }
            }
            return 0;
        };
        return StateGraph;
    }());
    function getPossibleActions(w1) {
        var result;
        var temp = w1.stacks[w1.arm].pop();
        w1.stacks[w1.arm].push(temp);
        var obj2 = w1.objects[temp];
        var obj = w1.objects[w1.holding];
        if (w1.arm != 0) {
            result.push("l");
        }
        if (w1.arm < w1.stacks.length) {
            result.push("r");
        }
        if (temp != null) {
            result.push("p");
        }
        if (!(obj.form == "ball" && obj2.form != null) ||
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
            var world = node;
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
        var result = aStarSearch(stateGraph, state, goalFunction, heuristics, 10);
        var plan = new Array();
        for (var i = 0; i < result.path.length - 1; i++) {
            var current = result.path[i];
            var next = result.path[i + 1];
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
