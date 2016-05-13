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
        var interpretation;
        interpretation = [];
        if (cmd.command == "pick up" || cmd.command == "grasp" || cmd.command == "take") {
            var potentialObjs = getPossibleObjs(cmd.entity.object).toArray();
            for (var i = 0; i < potentialObjs.length; i++) {
                console.log("1");
                var obj = potentialObjs[i];
                var lit = { polarity: true, relation: "holding", args: [obj] };
                interpretation.push([lit]);
            }
        }
        else if (cmd.command == "move" || cmd.command == "put" || cmd.command == "drop") {
            var potentialObjs = getPossibleObjs(cmd.entity.object).toArray();
            var potentialLocs = getPossibleObjs(cmd.location.entity.object).toArray();
            if (cmd.entity == undefined) {
                for (var i = 0; i < potentialLocs.length; i++) {
                    console.log("2");
                    var loc = potentialLocs[i];
                    var lit = { polarity: true, relation: cmd.location.relation, args: [state.holding, loc] };
                    interpretation.push([lit]);
                }
            }
            else {
                for (var i = 0; i < potentialObjs.length; i++) {
                    console.log("3");
                    var obj = potentialObjs[i];
                    for (var j = 0; j < potentialLocs.length; j++) {
                        console.log("4");
                        var loc = potentialLocs[j];
                        var lit = { polarity: true, relation: cmd.location.relation, args: [obj, loc] };
                        interpretation.push([lit]);
                    }
                }
            }
        }
        if (interpretation.length == 0) {
            return null;
        }
        return interpretation;
    }
    function getPossibleObjs(obj) {
        var set = new collections.Set();
        if (obj.form == "ball") {
            set.add("e");
            set.add("f");
        }
        else if (obj.form == "box") {
            set.add("k");
            set.add("m");
            set.add("l");
        }
        return set;
    }
    function addValObjectMap(key, value, objectNameMap) {
        var oldString = objectNameMap.setValue(key, value);
    }
    function stringifyObject(obj) {
        if (obj == null) {
            return "";
        }
        else {
            if (obj.size == null || obj.form == null || obj.size == null) {
                return stringifyObject(obj.object);
            }
            else {
                return obj.color + obj.form + obj.size;
            }
        }
    }
    function constructObjectNameMap(cmd, state) {
        var objectNameMap = new collections.Dictionary(stringifyObject);
        var i = 0;
        var obj = cmd.entity.object;
        var name;
        var row;
        var position;
        while (i < state.stacks.length) {
            if (checkStack(obj, i, state, name, objectNameMap)) {
                position = i;
                break;
            }
            else {
                position = -1;
            }
            i++;
        }
        row = findRow(obj, position, state, name, objectNameMap);
        var result = findEntity(cmd.entity, position, row, state, objectNameMap);
        if (result == -1) {
            console.log("Such object does not exist!");
        }
        return objectNameMap;
    }
    function findEntity(entity, position, row, state, objectNameMap) {
        name = " ";
        var i = 0;
        var obj = entity.object;
        if ((obj.object == null) && (obj.location == null)) {
            while (i < state.stacks[position].length) {
                if (checkSingle(state.stacks[position][i], findDescription(obj, state), state)) {
                    name = state.stacks[position][i];
                }
                i++;
            }
            addValObjectMap(obj, name, objectNameMap);
            return 0;
        }
        else {
            if ((obj.location.relation == "on top of") || (obj.location.relation == "above")) {
                console.log("ON");
                if (findRow(obj.location.entity.object, position, state, name, objectNameMap) != -1) {
                    return findEntity(obj.location.entity, position, row + 1, state, objectNameMap);
                }
                else {
                    return -1;
                }
            }
            else if ((obj.location.relation == "inside") || (obj.location.relation == "under")) {
                console.log("IN ");
                if (findRow(obj.location.entity.object, position, state, name, objectNameMap) != -1) {
                    return findEntity(obj.location.entity, position, row - 1, state, objectNameMap);
                }
                else {
                    return -1;
                }
            }
            else if ((obj.location.relation == "left of")) {
                console.log("LEFT");
                if (checkStack(obj.location.entity.object, position - 1, state, name, objectNameMap)) {
                    return findEntity(obj.location.entity, position - 1, row, state, objectNameMap);
                }
                else {
                    return -1;
                }
            }
            else if ((obj.location.relation == "right of")) {
                console.log("RIGHT");
                if (checkStack(obj.location.entity.object, position + 1, state, name, objectNameMap)) {
                    return findEntity(obj.location.entity, position + 1, row, state, objectNameMap);
                }
                else {
                    return -1;
                }
            }
            else if (obj.location.relation == "beside") {
                console.log("BESIDE");
                if (checkStack(obj.location.entity.object, position - 1, state, name, objectNameMap)) {
                    return findEntity(obj.location.entity, position - 1, row, state, objectNameMap);
                }
                else if (checkStack(obj.location.entity.object, position + 1, state, name, objectNameMap)) {
                    return findEntity(obj.location.entity, position + 1, row, state, objectNameMap);
                }
                else {
                    return -1;
                }
            }
            else {
                console.log("NO");
                return -1;
            }
        }
    }
    function checkSingle(obj1, obj2, state) {
        var obj;
        obj = state.objects[obj1];
        var result = true;
        if ((obj.form != obj2[0]) && (obj2[0] != "anyform")) {
            result = false;
        }
        if ((obj2[1] != "0") && (obj.size != null) && (obj.size != obj2[1])) {
            result = false;
        }
        if ((obj2[2] != "0") && (obj.color != null) && (obj.color != obj2[2])) {
            result = false;
        }
        return result;
    }
    function findDescription(obj, state) {
        var st = "";
        var result = ["anyform", "0", "0"];
        if ((obj.form == null) && (obj.color == null) && (obj.size == null)) {
            return findDescription(obj.object, state);
        }
        else {
            if (obj.form != null) {
                result[0] = obj.form;
            }
            if (obj.size != null) {
                result[1] = obj.size;
            }
            if (obj.color != null) {
                result[2] = obj.color;
            }
            return result;
        }
    }
    function checkStack(obj, position, state, name, objectNameMap) {
        var i = 0;
        var res = false;
        var st;
        while (i < state.stacks[position].length) {
            st = findDescription(obj, state);
            if (checkSingle(state.stacks[position][i], findDescription(obj, state), state)) {
                console.log("here");
                name = state.stacks[position][i];
                res = true;
            }
            i++;
        }
        return res;
    }
    function findRow(obj, position, state, name, objectNameMap) {
        var i = 0;
        var res = -1;
        while (i < state.stacks[position].length) {
            if (checkSingle(state.stacks[position][i], findDescription(obj, state), state)) {
                name = state.stacks[position][i];
                res = i;
            }
            i++;
        }
        return res;
    }
})(Interpreter || (Interpreter = {}));
