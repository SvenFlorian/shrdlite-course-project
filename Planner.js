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
                        newState.arm += 1;
                        break;
                    case "l":
                        newState.arm -= 1;
                        break;
                    case "d":
                        newState.stacks[newState.arm].push(newState.holding);
                        newState.holding = undefined;
                        break;
                    case "p":
                        newState.holding = newState.stacks[newState.arm].pop();
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
        return null;
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
        aStarSearch(stateGraph, state, goalFunction, heuristics, 10);
        do {
            var pickstack = Math.floor(Math.random() * state.stacks.length);
        } while (state.stacks[pickstack].length == 0);
        var plan = [];
        if (pickstack < state.arm) {
            plan.push("Moving left");
            for (var i = state.arm; i > pickstack; i--) {
                plan.push("l");
            }
        }
        else if (pickstack > state.arm) {
            plan.push("Moving right");
            for (var i = state.arm; i < pickstack; i++) {
                plan.push("r");
            }
        }
        var obj = state.stacks[pickstack][state.stacks[pickstack].length - 1];
        plan.push("Picking up the " + state.objects[obj].form, "p");
        if (pickstack < state.stacks.length - 1) {
            plan.push("Moving as far right as possible");
            for (var i = pickstack; i < state.stacks.length - 1; i++) {
                plan.push("r");
            }
            plan.push("Moving back");
            for (var i = state.stacks.length - 1; i > pickstack; i--) {
                plan.push("l");
            }
        }
        plan.push("Dropping the " + state.objects[obj].form, "d");
        return plan;
    }
})(Planner || (Planner = {}));
