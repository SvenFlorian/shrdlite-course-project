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
        if (cmd.command == "take") {
            if (cmd.entity == null && state.holding == null) {
                throw new Error("Cannot take 'it', be more specific!");
            }
            else {
                var potentialObjs = getMatchingObjects(cmd.entity.object, mObject, mString, state).toArray();
                for (var i = 0; i < potentialObjs.length; i++) {
                    var obj = potentialObjs[i];
                    var lit = { polarity: true, relation: "holding", args: [obj] };
                    if (isFeasible(lit, state)) {
                        interpretation.push([lit]);
                    }
                }
            }
        }
        else if (cmd.command == "move" || cmd.command == "put") {
            if (cmd.entity == null && state.holding == null) {
                throw new Error("Holding nothing! Cannot move/put 'it'");
            }
            else {
                var potentialObjs = (cmd.entity == undefined) ? [state.holding] :
                    getMatchingObjects(cmd.entity.object, mObject, mString, state).toArray();
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
            if (lit.relation != "under") {
                return false;
            }
            obj1 = new Object();
            obj1.form = "floor";
        }
        else {
            obj1 = state.objects[lit.args[0]];
        }
        if (lit.args[1] == "floor") {
            if (lit.relation == "under" || lit.relation == "beside" || lit.relation == "rightof" || lit.relation == "leftof") {
                return false;
            }
            obj2 = new Object();
            obj2.form = "floor";
        }
        else {
            obj2 = state.objects[lit.args[1]];
        }
        if (lit.args[1] == lit.args[0]) {
            return false;
        }
        if ((lit.relation == "ontop" || lit.relation == "inside" || lit.relation == "above")
            && (obj2.size == "small" && obj1.size == "large")) {
            return false;
        }
        switch (lit.relation) {
            case "ontop":
                if (obj2.form == "box" || obj2.form == "ball") {
                    return false;
                }
                if (obj1 == "ball" && obj2.form != "floor") {
                    return false;
                }
                if ((obj1.form == "box" && obj1.size == "small") && (obj2.size == "small" && (obj2.form == "brick" || obj2.form == "pyramid"))) {
                    return false;
                }
                if ((obj1.size == "large" && obj1.form == "box") && (obj2.form == "pyramid")) {
                    return false;
                }
                if (obj2.form == "table" && obj1.form == "ball") {
                    return false;
                }
                break;
            case "inside":
                if (obj2.form != "box") {
                    return false;
                }
                else if (obj1.size == obj2.size && (obj1.form != "ball" && obj1.form != "brick" && obj1.form != "table")) {
                    return false;
                }
                break;
            case "leftof":
                break;
            case "rightof":
                break;
            case "beside":
                break;
            case "above":
                if (obj2.form == "ball") {
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
        if (state.holding != null) {
            mObject[index] = state.objects[state.holding];
            mString[index++] = state.holding;
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
    function pruneList(original, relative, relation, state) {
        var matchingObjects = new collections.Set();
        var objects1 = original.toArray();
        var objects2 = relative.toArray();
        for (var i = 0; i < objects1.length; i++) {
            for (var j = 0; j < objects2.length; j++) {
                if (matchesRelation(objects1[i], objects2[j], relation, state)) {
                    matchingObjects.add(objects1[i]);
                    break;
                }
            }
        }
        return matchingObjects;
    }
    function matchesRelation(original, relative, relation, state) {
        var row1;
        var row2;
        var col1;
        var col2;
        _a = findObjectInWorld(original, state), col1 = _a[0], row1 = _a[1];
        _b = findObjectInWorld(relative, state), col2 = _b[0], row2 = _b[1];
        if (relative == "floor") {
            switch (relation) {
                case "ontop":
                    if (row1 == 0) {
                        return true;
                    }
                    break;
                case "above": return true;
                default: return false;
            }
            return false;
        }
        if (row1 < 0 || row2 < 0 || col1 < 0 || col2 < 0) {
            return false;
        }
        switch (relation) {
            case "ontop":
                if (col1 == col2 && row1 == row2 + 1 && state.objects[relative].form != "box") {
                    return true;
                }
                break;
            case "inside":
                if (col1 == col2 && row1 == row2 + 1 && state.objects[relative].form == "box") {
                    return true;
                }
                break;
            case "above":
                if (col1 == col2 && row1 > row2) {
                    return true;
                }
                break;
            case "under":
                if (col1 == col2 && row1 < row2) {
                    return true;
                }
                break;
            case "leftof":
                if (col1 < col2) {
                    return true;
                }
                break;
            case "rightof":
                if (col1 > col2) {
                    return true;
                }
                break;
            case "beside":
                if (col1 + 1 == col2 || col1 == col2 + 1) {
                    return true;
                }
                break;
            default: break;
        }
        return false;
        var _a, _b;
    }
    Interpreter.matchesRelation = matchesRelation;
    function findObjectInWorld(object, state) {
        for (var i = 0; i < state.stacks.length; i++) {
            for (var j = 0; j < state.stacks[i].length; j++) {
                if (object == state.stacks[i][j]) {
                    return [i, j];
                }
            }
        }
        return [-1, -1];
    }
})(Interpreter || (Interpreter = {}));
