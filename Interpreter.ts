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
                console.log("InterpretationResult: " + stringify(result));
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
     * The core interpretation function. The code here is just a
     * template; you should rewrite this function entirely. In this
     * template, the code produces a dummy interpretation which is not
     * connected to `cmd`, but your version of the function should
     * analyse cmd in order to figure out what interpretation to
     * return.
     * @param cmd The actual command. Note that it is *not* a string, but rather an object of type `Command` (as it has been parsed by the parser).
     * @param state The current state of the world. Useful to look up objects in the world.
     * @returns A list of list of Literal, representing a formula in disjunctive normal form (disjunction of conjunctions). See the dummy interpetation returned in the code for an example, which means ontop(a,floor) AND holding(b).
     */
    function interpretCommand(cmd : Parser.Command, state : WorldState) : DNFFormula {
        // This returns a dummy interpretation involving two random objects in the world
        //Step 2.
        var mObject : Array<ObjectDefinition>;
        var mString : Array<string>;
        [mObject, mString] = initMatrix(state);

        var interpretation : DNFFormula;
        interpretation = [
            ];
        if(cmd.command == "pick up" || cmd.command == "grasp" || cmd.command == "take") {
          var potentialObjs : Array<string> = traverseParseTree(cmd.entity.object, mObject, mString, state).toArray();
          for(var i = 0; i < potentialObjs.length; i++) {
            var obj : string = potentialObjs[i];
            var lit : Literal = {polarity: true, relation: "holding", args: [obj]};
            if(isFeasible(lit, state)) {
              interpretation.push([lit]);
            }
          }

        }else if (cmd.command == "move" || cmd.command == "put" || cmd.command == "drop") {
          var potentialObjs : Array<string> = traverseParseTree(cmd.entity.object, mObject, mString, state).toArray();
          var potentialLocs : Array<string> = traverseParseTree(cmd.location.entity.object, mObject, mString, state).toArray();

          if (cmd.entity == undefined){ //does this work? should refer to the case of "it"
            for(var i = 0; i < potentialLocs.length; i++) {
              var loc : string = potentialLocs[i];
              var lit : Literal = {polarity: true, relation: cmd.location.relation, args: [state.holding,loc]}
              if(isFeasible(lit, state)) {
                interpretation.push([lit]);
              }
            }
          }else{
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
          return null;
        }

        return interpretation;
    }
    function isFeasible(lit : Literal, state : WorldState) : boolean {
      if (lit.relation == "holding" && lit.args[0] == "floor") {
        return false;
      } //otherwise there are 2 arguments


      var obj1 : Parser.Object; //special case for floor, since it doesnt exist in the worldstate
      var obj2 : Parser.Object;
      if(lit.args[0] == "floor") {
        obj1 = new Object();
        obj1.form = "floor";
      }else {
        obj1 = state.objects[lit.args[0]];
      }
      if(lit.args[1] == "floor") {
        obj2 = new Object();
        obj2.form = "floor";
      }else {
        obj2 = state.objects[lit.args[1]];
      }
      if (lit.args[1] == lit.args[0]) {
        return false;
      }

      switch (lit.relation) {
        case "ontop":
          if (obj2.form != "table" && obj2.form != "floor") {
            return false;
          }else if (obj2.form == "table" && obj1.form == "ball") {
            return false;
          }

          break;
        case "inside": //tested
          if (obj2.form != "box") {
            return false;
          }else if ((obj1.size == obj2.size && obj1.form != "ball")||(obj1.size == "large" && obj2.size == "small")) {
            return false;
          }
          break;
        case "above": //tested kind of
          if (obj2.form == "ball") { //what about when a ball is in a box which is on a table?
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
        case "leftof": //nothing
          break;
        case "rightof": //nothing
          break;
        case "beside": //nothing
          break;
        default :
          break;
        }
        return true;
    }

    function getPossibleObjsTest(obj : Parser.Object) : collections.Set<string> {
      var set : collections.Set<string> = new collections.Set<string>();
      if(obj.form == "ball") {
        set.add("e");
        set.add("f");
      }else if (obj.form == "box"){
        set.add("k");
        set.add("m");
        set.add("l");
      }else if(obj.form == "table") {
        set.add("g");
      }
      if(obj.color == "blue") {
        set.add("g");
        set.add("m");
      }
      return set;
    }


    //matrix[Parser.Object][string]

    /*function getPossibledObjs(obj: Parser.Object) : Set<string> {
      //returns a list of all world objects
    }*/

    function stringifyObject(obj : Parser.Object) : string {
      if (obj == null) {
        return "";
      }else{
        if(obj.size == null || obj.form == null || obj.size == null){
          return stringifyObject(obj.object);
        } else {
          return obj.color + obj.form + obj.size;
        }
      }
    }

    function initMatrix(state : WorldState) : [Array<ObjectDefinition>, Array<string>] {
      var mObject : Array<ObjectDefinition> = new Array<ObjectDefinition>();
      var mString : Array<string> = new Array<string>();
      // TODO implement as a class :P
      // Populate the "matrix" with data from the world
      var index : number = 0;
      for (var i = 0; i < state.stacks.length; i++) {
        for (var j = 0; j < state.stacks[i].length; j++) {
          mObject[index] = state.objects[state.stacks[i][j]];
          mString[index++] = state.stacks[i][j];
        }
      }

      return [mObject, mString];
    }



    // input set
    function matchingObjects(obj : Parser.Object, mObject : Array<ObjectDefinition>, mString : Array<string>) : collections.Set<string> {
      var result : collections.Set<string> = new collections.Set<string>();
      for (var i = 0; i < mObject.length ; i++) {
        if (obj.form != null && obj.form != "anyform" && obj.form != mObject[i].form) { continue; }
        if (obj.size != null && obj.form != "anysize" && obj.size != mObject[i].size) { continue; }
        if (obj.color != null && obj.form != "anycolor" && obj.color != mObject[i].color) { continue; }
        result.add(mString[i]);
      }

      if (obj.form == "floor") { result.add("floor"); }

      return result;
    }

    /*function findObjectsInWorld(obj : Parser.Object, state : WorldState) : Set<string> {
      var result : Set<string> = new Set<string>();

    }*/


    //var lit : Literal = {polarity: true, relation: cmd.location.relation, args: [obj,loc]}
    function traverseParseTree(obj : Parser.Object, mObject : Array<ObjectDefinition>, mString : Array<string>, state : WorldState) : collections.Set<string> {
      var result : collections.Set<string> = new collections.Set<string>();

      if (obj.form != null) {
        return matchingObjects(obj, mObject, mString);
        // we have the ball. ----what ball?
      } else {
        // the ball has a relation!
        var object = obj.object;
        var relation : string = obj.location.relation;
        var relativeObject : Parser.Object = obj.location.entity.object;

        var originalDataset : collections.Set<string> = traverseParseTree(object, mObject, mString, state);
        var relativeDataset : collections.Set<string> = traverseParseTree(relativeObject, mObject, mString, state);
        //originalDataset.intersect(relativeDataset);

        //do something about the relation and cross out infeasible objects
        return pruneList(originalDataset, relativeDataset, relation, state);
      }
    }

    function pruneList(original : collections.Set<string>, relativeData : collections.Set<string>, relation : string, state : WorldState) : collections.Set<string> {
      var matchingObjects : collections.Set<string> = new collections.Set<string>();
      var relative : Array<string> = relativeData.toArray();
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
            if (state.objects[relative[k]].form == "box") { continue; }
            for (var i = 0; i < state.stacks.length; i++) {
              for (var j = 0; j < state.stacks[i].length - 1; j++) {
                if (state.stacks[i][j] == relative[k]) {
                  matchingObjects.add(state.stacks[i][j+1]);
                }
              }
            }
          }
        break;
        case "inside":
          for (var k = 0; k < relative.length; k++) {
            if (state.objects[relative[k]].form != "box") { continue; }
            for (var i = 0; i < state.stacks.length; i++) {
              for (var j = 0; j < state.stacks[i].length - 1; j++) {
                if (state.stacks[i][j] == relative[k]) {
                  matchingObjects.add(state.stacks[i][j+1]);
                }
              }
            }
          }
        break;

        case "above":
          for (var k = 0; k < relative.length; k++) {
            if (relative[k] == "floor") {
              var orig : Array<string> = original.toArray();
              for (var l = 0; l < orig.length; l++) {
                matchingObjects.add(orig[l]);
              }
              break;
            }
            for (var i = 0; i < state.stacks.length; i++) {
              for (var j = 0; j < state.stacks[i].length - 1; j++) {
                if (state.stacks[i][j] == relative[k]) {
                  for (; j < state.stacks[i].length - 1; j++) {
                    matchingObjects.add(state.stacks[i][j+1]);
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
          var foundSomething : number = state.stacks.length;
          for (var i = state.stacks.length - 1; i >= 0; i--) {
            for (var j = 0; j < state.stacks[i].length; j++) {
              for (var k = 0; k < relative.length; k++) {
                if (state.stacks[i][j] == relative[k]) { foundSomething = i; }
                if (foundSomething > i) { matchingObjects.add(state.stacks[i][j]); }
              }
            }
          }
        break;
        case "rightof":
          var foundSomething : number = state.stacks.length;
          for (var i = 0; i < state.stacks.length - 1; i++) {
            for (var j = 0; j < state.stacks[i].length; j++) {
              for (var k = 0; k < relative.length; k++) {
                if (state.stacks[i][j] == relative[k]) { foundSomething = i; }
                if (foundSomething < i) { matchingObjects.add(state.stacks[i][j]); }
              }
            }
          }
        break;
        case "beside":
          for (var k = 0; k < relative.length; k++) {
            for (var i = 0; i < state.stacks.length; i++) {
              for (var j = 0; j < state.stacks[i].length; j++) {
                if (state.stacks[i][j] == relative[k]) {
                  for (var m = 0; i > 0 && m < state.stacks[i-1].length; m++) {
                    matchingObjects.add(state.stacks[i-1][m]);
                  }
                  for (var n = 0; i < state.stacks.length - 1 && n < state.stacks[i+1].length; n++) {
                    matchingObjects.add(state.stacks[i+1][n]);
                  }
                  break;
                }
              }
            }
          }
        break;
        default: break;
      }

      return intersectSet(original, matchingObjects);
    }

    function intersectSet(set1 : collections.Set<string>, set2 : collections.Set<string>) : collections.Set<string> {
      var result : collections.Set<string> = new collections.Set<string>();
      var arr1 : Array<string> = set1.toArray();
      var arr2 : Array<string> = set2.toArray();
      for (var i = 0; i < arr1.length; i++) {
        for (var j = 0; j < arr2.length; j++) {
          if (arr1[i] == arr2[j]) { result.add(arr1[i]); }
        }
      }


      return result;
    }
}
