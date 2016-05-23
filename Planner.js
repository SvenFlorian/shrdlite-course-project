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
    var StateGraph = (function () {
        function StateGraph() {
        }
        StateGraph.prototype.outgoingEdges = function (node) {
            return null;
        };
        StateGraph.prototype.compareNodes = function (s1, s2) {
            return null;
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
