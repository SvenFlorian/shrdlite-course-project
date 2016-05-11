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
        var objectNameMap = constructObjectNameMap(cmd, state);
        var interpretation;
        if (cmd.command == "pick up" || cmd.command == "grasp" || cmd.command == "take") {
            var a = objectNameMap.getValue(cmd.entity.object);
            interpretation = [[
                    { polarity: true, relation: "pickedUp", args: [a] }
                ]];
        }
        else if (cmd.command == "move" || cmd.command == "put" || cmd.command == "drop") {
            var objectToMove;
            if (cmd.entity == undefined) {
                objectToMove = state.holding;
            }
            else {
                objectToMove = objectNameMap.getValue(cmd.entity.object);
            }
            var newLocation = objectNameMap.getValue(cmd.location.entity.object);
            interpretation = [[
                    { polarity: true, relation: cmd.location.relation, args: [objectToMove, newLocation] }
                ]];
        }
        return interpretation;
    }
    function addValObjectMap(key, value, objectNameMap) {
        var oldString = objectNameMap.setValue(key, value);
        if (oldString != undefined) {
            throw new Error("ambiguity between " + value + " and " + oldString);
        }
    }
    function constructObjectNameMap(cmd, state) {
        var objectNameMap = new collections.Dictionary();
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
        findEntity(cmd.entity, position, row, state, objectNameMap);
        return objectNameMap;
    }
    function findEntity(entity, position, row, state, objectNameMap) {
        var obj = entity.object;
        if ((obj.object == null) || (obj.location == null)) {
            findRow(obj.location.entity.object, position, state, name, objectNameMap);
            return 0;
        }
        else {
            if ((obj.location.relation == "on top of") || (obj.location.relation == "above")) {
                if (findRow(obj.location.entity.object, position, state, name, objectNameMap) != -1) {
                    return findEntity(obj.location.entity, position, row + 1, state, objectNameMap);
                }
                else {
                    return -1;
                }
            }
            else if ((obj.location.relation == "inside") || (obj.location.relation == "under")) {
                if (findRow(obj.location.entity.object, position, state, name, objectNameMap) != -1) {
                    return findEntity(obj.location.entity, position, row - 1, state, objectNameMap);
                }
                else {
                    return -1;
                }
            }
            else if ((obj.location.relation == "left of")) {
                if (checkStack(obj.object, position - 1, state, name, objectNameMap)) {
                    return findEntity(obj.location.entity, position - 1, row, state, objectNameMap);
                }
                else {
                    return -1;
                }
            }
            else if ((obj.location.relation == "right of")) {
                if (checkStack(obj.object, position + 1, state, name, objectNameMap)) {
                    return findEntity(obj.location.entity, position + 1, row, state, objectNameMap);
                }
                else {
                    return -1;
                }
            }
            else if (obj.location.relation == "beside") {
                if (checkStack(obj.object, position - 1, state, name, objectNameMap)) {
                    return findEntity(obj.location.entity, position - 1, row, state, objectNameMap);
                }
                else if (checkStack(obj.object, position + 1, state, name, objectNameMap)) {
                    return findEntity(obj.location.entity, position + 1, row, state, objectNameMap);
                }
                else {
                    return -1;
                }
            }
            else {
                return -1;
            }
        }
    }
    function checkSingle(obj1, obj2, state) {
        var obj;
        obj = state.objects[obj1];
        var result = true;
        if (obj.form != obj2[0]) {
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
        var result = ["0", "0", "0"];
        if (obj.form == null) {
            return findDescription(obj.object, state);
        }
        else {
            result[0] = obj.form;
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
        while (i < state.stacks[position].length) {
            if (checkSingle(state.stacks[position][i], findDescription(obj, state), state)) {
                name = state.stacks[position][i];
                addValObjectMap(obj, name, objectNameMap);
                return true;
            }
            i++;
        }
        name = "";
        return false;
    }
    function findRow(obj, position, state, name, objectNameMap) {
        var i = 0;
        while (i < state.stacks[position].length) {
            if (checkSingle(state.stacks[position][i], findDescription(obj, state), state)) {
                name = state.stacks[position][i];
                addValObjectMap(obj, name, objectNameMap);
                return i;
            }
            i++;
        }
        name = "";
        return -1;
    }
})(Interpreter || (Interpreter = {}));
