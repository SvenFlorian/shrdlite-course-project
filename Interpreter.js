var Interpreter;
(function (Interpreter) {
    function interpret(parses, currentState) {
        var errors = [];
        var interpretations = [];
        parses.forEach(function (parseresult) {
            try {
                var result = parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                interpretations.push(result);
            }
            catch (err) {
                errors.push(err);
            }
        });
        if (interpretations.length) {
            return interpretations;
        }
        else {
            throw errors[0];
        }
    }
    Interpreter.interpret = interpret;
    function stringify(result) {
        return result.interpretation.map(function (literals) {
            return literals.map(function (lit) { return stringifyLiteral(lit); }).join(" & ");
        }).join(" | ");
    }
    Interpreter.stringify = stringify;
    function stringifyLiteral(lit) {
        return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
    }
    Interpreter.stringifyLiteral = stringifyLiteral;
    function interpretCommand(cmd, state) {
        var mObject;
        var mString;
        _a = initObjectMapping(state), mObject = _a[0], mString = _a[1];
        var interpretation;
        interpretation = [];
        if (cmd.command == "pick up" || cmd.command == "grasp" || cmd.command == "take") {
            var potentialObjs = getMatchingObjects(cmd.entity.object, mObject, mString, state).toArray();
            for (var i = 0; i < potentialObjs.length; i++) {
                var obj = potentialObjs[i];
                var lit = { polarity: true, relation: "holding", args: [obj] };
                if (isFeasible(lit, state)) {
                    interpretation.push([lit]);
                }
            }
        }
        else if (cmd.command == "move" || cmd.command == "put" || cmd.command == "drop") {
            var potentialObjs = getMatchingObjects(cmd.entity.object, mObject, mString, state).toArray();
            var potentialLocs = getMatchingObjects(cmd.location.entity.object, mObject, mString, state).toArray();
            for (var i = 0; i < potentialObjs.length; i++) {
                var obj = potentialObjs[i];
                for (var j = 0; j < potentialLocs.length; j++) {
                    var loc = potentialLocs[j];
                    var lit = { polarity: true, relation: cmd.location.relation, args: [obj, loc] };
                    if (isFeasible(lit, state)) {
                        interpretation.push([lit]);
                    }
                }
            }
        }
        if (interpretation.length == 0) {
            throw new Error("No interpretation found");
        }
        return interpretation;
        var _a;
    }
    function isFeasible(lit, state) {
        if (lit.relation == "holding" && lit.args[0] == "floor") {
            return false;
        }
        var obj1;
        var obj2;
        if (lit.args[0] == "floor") {
            obj1 = new Object();
            obj1.form = "floor";
        }
        else {
            obj1 = state.objects[lit.args[0]];
        }
        if (lit.args[1] == "floor") {
            obj2 = new Object();
            obj2.form = "floor";
        }
        else {
            obj2 = state.objects[lit.args[1]];
        }
        if (lit.args[1] == lit.args[0]) {
            return false;
        }
        switch (lit.relation) {
            case "ontop":
                if (obj2.form != "table" && obj2.form != "floor") {
                    return false;
                }
                else if (obj2.form == "table" && obj1.form == "ball") {
                    return false;
                }
                break;
            case "inside":
                if (obj2.form != "box") {
                    return false;
                }
                else if ((obj1.size == obj2.size && obj1.form != "ball") || (obj1.size == "large" && obj2.size == "small")) {
                    return false;
                }
                break;
            case "above":
                if (obj2.form == "ball") {
                    return false;
                }
                if (obj1.size == "large" && obj2.size == "small") {
                    return false;
                }
                if (lit.args[0] == "floor") {
                    return false;
                }
                break;
            case "under":
                if (obj1.form == "ball") {
                    return false;
                }
                if (obj1.size == "small" && obj2.size == "large") {
                    return false;
                }
                if (lit.args[1] == "floor") {
                    return false;
                }
                break;
            default:
                break;
        }
        return true;
    }
    function initObjectMapping(state) {
        var mObject = new Array();
        var mString = new Array();
        var index = 0;
        for (var i = 0; i < state.stacks.length; i++) {
            for (var j = 0; j < state.stacks[i].length; j++) {
                mObject[index] = state.objects[state.stacks[i][j]];
                mString[index++] = state.stacks[i][j];
            }
        }
        return [mObject, mString];
    }
    function getMatchingObjects(obj, mObject, mString, state) {
        var result = new collections.Set();
        if (obj.form != null) {
            for (var i = 0; i < mObject.length; i++) {
                if (obj.form != null && obj.form != "anyform" && obj.form != mObject[i].form) {
                    continue;
                }
                if (obj.size != null && obj.size != "anysize" && obj.size != mObject[i].size) {
                    continue;
                }
                if (obj.color != null && obj.color != "anycolor" && obj.color != mObject[i].color) {
                    continue;
                }
                result.add(mString[i]);
            }
            if (obj.form == "floor") {
                result.add("floor");
            }
            return result;
        }
        else {
            var object = obj.object;
            var relation = obj.location.relation;
            var relativeObject = obj.location.entity.object;
            var originalDataset = getMatchingObjects(object, mObject, mString, state);
            var relativeDataset = getMatchingObjects(relativeObject, mObject, mString, state);
            return pruneList(originalDataset, relativeDataset, relation, state);
        }
    }
    function pruneList(original, relativeData, relation, state) {
        var matchingObjects = new collections.Set();
        var relative = relativeData.toArray();
        switch (relation) {
            case "ontop":
                for (var k = 0; k < relative.length; k++) {
                    if (relative[k] == "floor") {
                        for (var l = 0; l < state.stacks.length; l++) {
                            if (state.stacks[l].length > 0) {
                                matchingObjects.add(state.stacks[l][0]);
                            }
                        }
                        break;
                    }
                    if (state.objects[relative[k]].form == "box") {
                        continue;
                    }
                    for (var i = 0; i < state.stacks.length; i++) {
                        for (var j = 0; j < state.stacks[i].length - 1; j++) {
                            if (state.stacks[i][j] == relative[k]) {
                                matchingObjects.add(state.stacks[i][j + 1]);
                            }
                        }
                    }
                }
                break;
            case "inside":
                for (var k = 0; k < relative.length; k++) {
                    if (state.objects[relative[k]].form != "box") {
                        continue;
                    }
                    for (var i = 0; i < state.stacks.length; i++) {
                        for (var j = 0; j < state.stacks[i].length - 1; j++) {
                            if (state.stacks[i][j] == relative[k]) {
                                matchingObjects.add(state.stacks[i][j + 1]);
                            }
                        }
                    }
                }
                break;
            case "above":
                for (var k = 0; k < relative.length; k++) {
                    if (relative[k] == "floor") {
                        var orig = original.toArray();
                        for (var l = 0; l < orig.length; l++) {
                            matchingObjects.add(orig[l]);
                        }
                        break;
                    }
                    for (var i = 0; i < state.stacks.length; i++) {
                        for (var j = 0; j < state.stacks[i].length - 1; j++) {
                            if (state.stacks[i][j] == relative[k]) {
                                for (; j < state.stacks[i].length - 1; j++) {
                                    matchingObjects.add(state.stacks[i][j + 1]);
                                }
                                break;
                            }
                        }
                    }
                }
                break;
            case "under":
                for (var k = 0; k < relative.length; k++) {
                    for (var i = 0; i < state.stacks.length; i++) {
                        for (var j = 1; j < state.stacks[i].length; j++) {
                            if (state.stacks[i][j] == relative[k]) {
                                for (var m = 0; m < j; m++) {
                                    matchingObjects.add(state.stacks[i][m]);
                                }
                                break;
                            }
                        }
                    }
                }
                break;
            case "leftof":
                var foundSomething = state.stacks.length;
                for (var i = state.stacks.length - 1; i >= 0; i--) {
                    for (var j = 0; j < state.stacks[i].length; j++) {
                        for (var k = 0; k < relative.length; k++) {
                            if (state.stacks[i][j] == relative[k]) {
                                foundSomething = i;
                            }
                            if (foundSomething > i) {
                                matchingObjects.add(state.stacks[i][j]);
                            }
                        }
                    }
                }
                break;
            case "rightof":
                var foundSomething = state.stacks.length;
                for (var i = 0; i < state.stacks.length - 1; i++) {
                    for (var j = 0; j < state.stacks[i].length; j++) {
                        for (var k = 0; k < relative.length; k++) {
                            if (state.stacks[i][j] == relative[k]) {
                                foundSomething = i;
                            }
                            if (foundSomething < i) {
                                matchingObjects.add(state.stacks[i][j]);
                            }
                        }
                    }
                }
                break;
            case "beside":
                for (var k = 0; k < relative.length; k++) {
                    for (var i = 0; i < state.stacks.length; i++) {
                        for (var j = 0; j < state.stacks[i].length; j++) {
                            if (state.stacks[i][j] == relative[k]) {
                                for (var m = 0; i > 0 && m < state.stacks[i - 1].length; m++) {
                                    matchingObjects.add(state.stacks[i - 1][m]);
                                }
                                for (var n = 0; i < state.stacks.length - 1 && n < state.stacks[i + 1].length; n++) {
                                    matchingObjects.add(state.stacks[i + 1][n]);
                                }
                                break;
                            }
                        }
                    }
                }
                break;
            default: break;
        }
        original.intersection(matchingObjects);
        return original;
    }
})(Interpreter || (Interpreter = {}));
