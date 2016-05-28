///<reference path="World.ts"/>
///<reference path="Parser.ts"/>
/// <reference path="./lib/collections.ts"/>

/**
* Interpreter module
*
* The goal of the Interpreter module is to interpret a sentence
* written by the user in the context of the current world state. In
* particular, it must figure out which objects in the world,
* i.e. which elements in the `objects` field of WorldState, correspond
* to the ones referred to in the sentence.
*
* Moreover, it has to derive what the intended goal state is and
* return it as a logical formula described in terms of literals, where
* each literal represents a relation among objects that should
* hold. For example, assuming a world state where "a" is a ball and
* "b" is a table, the command "put the ball on the table" can be
* interpreted as the literal ontop(a,b). More complex goals can be
* written using conjunctions and disjunctions of these literals.
*
* In general, the module can take a list of possible parses and return
* a list of possible interpretations, but the code to handle this has
* already been written for you. The only part you need to implement is
* the core interpretation function, namely `interpretCommand`, which produces a
* single interpretation for a single command.
*/
module Interpreter {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

/**
Top-level function for the Interpreter. It calls `interpretCommand` for each possible parse of the command. No need to change this one.
* @param parses List of parses produced by the Parser.
* @param currentState The current state of the world.
* @returns Augments ParseResult with a list of interpretations. Each interpretation is represented by a list of Literals.
*/
    export function interpret(parses : Parser.ParseResult[], currentState : WorldState) : InterpretationResult[] {
        var errors : Error[] = [];
        var interpretations : InterpretationResult[] = [];
        parses.forEach((parseresult) => {
            try {
                var result : InterpretationResult = <InterpretationResult>parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                interpretations.push(result);
            } catch(err) {
                errors.push(err);
            }
        });
        if (interpretations.length) {
            return interpretations;
        } else {
            // only throw the first error found
            throw errors[0];
        }
    }

    export interface InterpretationResult extends Parser.ParseResult {
        interpretation : DNFFormula;
    }

    export type DNFFormula = Conjunction[];
    type Conjunction = Literal[];

    /**
    * A Literal represents a relation that is intended to
    * hold among some objects.
    */
    export interface Literal {
	/** Whether this literal asserts the relation should hold
	 * (true polarity) or not (false polarity). For example, we
	 * can specify that "a" should *not* be on top of "b" by the
	 * literal {polarity: false, relation: "ontop", args:
	 * ["a","b"]}.
	 */
        polarity : boolean;
	/** The name of the relation in question. */
        relation : string;
	/** The arguments to the relation. Usually these will be either objects
     * or special strings such as "floor" or "floor-N" (where N is a column) */
        args : string[];
    }

    export function stringify(result : InterpretationResult) : string {
        return result.interpretation.map((literals) => {
            return literals.map((lit) => stringifyLiteral(lit)).join(" & ");
            // return literals.map(stringifyLiteral).join(" & ");
        }).join(" | ");
    }

    export function stringifyLiteral(lit : Literal) : string {
        return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
    }

    //////////////////////////////////////////////////////////////////////
    // private functions
    /**
     * @param cmd The actual command. Note that it is *not* a string, but rather an object of type `Command` (as it has been parsed by the parser).
     * @param state The current state of the world. Useful to look up objects in the world.
     * @returns A list of list of Literal, representing a formula in disjunctive normal form (disjunction of conjunctions). See the dummy interpetation returned in the code for an example, which means ontop(a,floor) AND holding(b).
     */
    function interpretCommand(cmd : Parser.Command, state : WorldState) : DNFFormula {
        var mObject : Array<ObjectDefinition>;
        var mString : Array<string>;
        [mObject, mString] = initObjectMapping(state); //initialize a mapping between the objects in the world and their names.

        var interpretation : DNFFormula;
        interpretation = [
            ];
        if(cmd.command == "take") {
          if(cmd.entity == null && state.holding == null)
          {
            throw new Error("Cannot take 'it', be more specific!");
          }
          else{
            var potentialObjs : Array<string> = getMatchingObjects(cmd.entity.object, mObject, mString, state).toArray();
            for(var i = 0; i < potentialObjs.length; i++) {
              var obj : string = potentialObjs[i];
              var lit : Literal = {polarity: true, relation: "holding", args: [obj]};
              if(isFeasible(lit, state)) {
                interpretation.push([lit]);
              }
            }
          }

        }else if (cmd.command == "move" || cmd.command == "put") {
          if(cmd.entity == null && state.holding == null)
          {
            throw new Error("Holding nothing! Cannot move/put 'it'");
          }
          else{
            var potentialObjs : Array<string> = (cmd.entity == undefined) ? [state.holding] :
                getMatchingObjects(cmd.entity.object, mObject, mString, state).toArray();
            var potentialLocs : Array<string> = getMatchingObjects(cmd.location.entity.object, mObject, mString, state).toArray();
            for(var i = 0; i < potentialObjs.length; i++) {
              var obj : string = potentialObjs[i];
              for(var j = 0; j < potentialLocs.length; j++) {
                var loc : string = potentialLocs[j];
                var lit : Literal = {polarity: true, relation: cmd.location.relation, args: [obj,loc]};
                if(isFeasible(lit, state)) {
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
    }

    export function isFeasible(lit : Literal, state : WorldState) : boolean {
      if (lit.relation == "holding" && lit.args[0] == "floor") {
        return false;
      } //otherwise there are 2 arguments
      var obj1 : Parser.Object;
      var obj2 : Parser.Object;
      //special case for floor, since it doesnt exist in the worldstate
      if(lit.args[0] == "floor") {
        if (lit.relation != "under") {
          return false;
        } //first object floor only okay for "under"
        obj1 = new Object();
        obj1.form = "floor";
      }else {
        obj1 = state.objects[lit.args[0]];
      }
      if(lit.args[1] == "floor") {
        if(lit.relation == "under" || lit.relation == "beside" || lit.relation == "rightof" ||lit.relation == "leftof") {
          return false;
        }
        obj2 = new Object();
        obj2.form = "floor";
      }else {
        obj2 = state.objects[lit.args[1]];
      }
      if (lit.args[1] == lit.args[0]) {
        return false;
      }

      if( (lit.relation == "ontop" || lit.relation == "inside" || lit.relation == "above")
        && (obj2.size == "small" && obj1.size == "large")){
        return false;
      }

      switch (lit.relation) {
        case "ontop":
          if(obj2.form == "box" || obj2.form == "ball"){
            return false;
          }
          if(obj1 == "ball" && obj2.form != "floor"){
            return false;
          }
          if((obj1.form == "box" && obj1.size == "small") && (obj2.size == "small" && (obj2.form == "brick" || obj2.form == "pyramid"))){
            return false;
          }
          if((obj1.size == "large" && obj1.form == "box") && (obj2.form == "pyramid")){
            return false;
          }
          if (obj2.form == "table" && obj1.form == "ball") {
            return false;
          }
          break;
        case "inside":
          if (obj2.form != "box") {
            return false;
          }else if (obj1.size == obj2.size && (obj1.form != "ball" && obj1.form != "brick" && obj1.form != "table")) {
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
        default :
          break;
        }
        return true;
    }
    /**
    @returns a mapping between the objects in the world and their names
    */
    function initObjectMapping(state : WorldState) : [Array<ObjectDefinition>, Array<string>] {
      var mObject : Array<ObjectDefinition> = new Array<ObjectDefinition>();
      var mString : Array<string> = new Array<string>();

      // Populate the "list" with data from the world
      var index : number = 0;
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

    /**
    @returns The names of all objects that the given Parser.object could be refering to
    */
    function getMatchingObjects(obj : Parser.Object, mObject : Array<ObjectDefinition>, mString : Array<string>, state : WorldState) : collections.Set<string> {
      var result : collections.Set<string> = new collections.Set<string>();
      if (obj.form != null) {
        // we have the actual object
        for (var i = 0; i < mObject.length ; i++) {
          if (obj.form != null && obj.form != "anyform" && obj.form != mObject[i].form) { continue; }
          if (obj.size != null && obj.size != "anysize" && obj.size != mObject[i].size) { continue; }
          if (obj.color != null && obj.color != "anycolor" && obj.color != mObject[i].color) { continue; }
          result.add(mString[i]);
        }
        if (obj.form == "floor") { result.add("floor"); }
        return result;
      } else {
        // the object has a relation!
        var object = obj.object;
        var relation : string = obj.location.relation;
        var relativeObject : Parser.Object = obj.location.entity.object;

        var originalDataset : collections.Set<string> = getMatchingObjects(object, mObject, mString, state);
        var relativeDataset : collections.Set<string> = getMatchingObjects(relativeObject, mObject, mString, state);
        //do something about the relation and cross out infeasible objects
        return pruneList(originalDataset, relativeDataset, relation, state);
      }
    }
    /**
    @returns the intersection of given set and the set of objects that are feasible due to the given relation
    */
    function pruneList(original : collections.Set<string>, relative : collections.Set<string>, relation : string, state : WorldState) : collections.Set<string> {
      var matchingObjects : collections.Set<string> = new collections.Set<string>();
      var objects1 : Array<string> = original.toArray();
      var objects2 : Array<string> = relative.toArray();

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

    //@returns true if relation(original,relative) is true in state
    export function matchesRelation(original : string, relative : string, relation : string, state : WorldState) : boolean {
      var row1 : number; var row2 : number; var col1 : number; var col2 : number;
      [col1, row1] = findObjectInWorld(original, state);
      [col2, row2] = findObjectInWorld(relative, state);

      if (relative == "floor") {
        switch (relation) {
        case "ontop": if (row1 == 0) { return true; } break;
        case "above": return true;
        default: return false;
        }

        return false;
      }

      if (row1 < 0 || row2 < 0 || col1 < 0 || col2 < 0) { return false; }
      switch (relation) {
        case "ontop": if (col1 == col2 && row1 == row2 + 1 && state.objects[relative].form != "box") { return true; } break;
        case "inside": if (col1 == col2 && row1 == row2 + 1 && state.objects[relative].form == "box") { return true; } break;
        case "above": if (col1 == col2 && row1 > row2) { return true; } break;
        case "under": if (col1 == col2 && row1 < row2) { return true; } break;
        case "leftof": if (col1 < col2) { return true; } break;
        case "rightof": if (col1 > col2) { return true; } break;
        case "beside": if (col1 + 1 == col2 || col1 == col2 + 1) { return true; } break;
        default: break;
      }

      return false;
    }

    function findObjectInWorld(object : string, state : WorldState) : [number, number] {
      for (var i = 0; i < state.stacks.length; i++) {
        for (var j = 0; j < state.stacks[i].length; j++) {
          if (object == state.stacks[i][j]) {
            return [i, j];
          }
        }
      }

      return [-1, -1];
    }
}
