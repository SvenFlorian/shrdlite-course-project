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
    function constructObjectNameMap(cmd, state) {
        var objectNameMap = new collections.Dictionary();
        return objectNameMap;
    }
})(Interpreter || (Interpreter = {}));
