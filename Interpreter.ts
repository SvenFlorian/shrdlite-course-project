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
        var interpretation : DNFFormula;
        if(cmd.command == "pick up" || cmd.command == "grasp" || cmd.command == "take") {
          var a : string = objectNameMap.getValue(cmd.entity.object);
          interpretation = [[
              {polarity: true, relation: "holding", args: [a]}
          ]];
        }else if (cmd.command == "move" || cmd.command == "put" || cmd.command == "drop") {
          var objectToMove : string;

          //goal 1: cmd.object , cmd.object.location.relation , cmd.object.location.entity.object;
          //goal 2: cmd.object.object, cmd.object.object.location.relation, cmd.object.object.location.entity.object
          //goal 3: cmd.object.location.entity.object , cmd.object.location.entity.object.location.relation, cmd.object.location.entity.object.location.entity.object

          // Goal 1: Find out which object it's referring to
          // Goal 2: Find out which object it is relating to
          // Goal 3: Make the relation happen

          // aka only make the highest level relation happen, the others are for specifying

          if (cmd.entity == undefined){ //does this work? should refer to the case of "it"
            objectToMove = state.holding;
          }else{ // if not refering to "it"
            console.log("cmd entity == defined");
            objectToMove = objectNameMap.getValue(cmd.entity.object);
          }
            console.log("stringify object :" + stringifyObject(cmd.location.entity.object));
            console.log("stringify object2 :" + stringifyObject(cmd.entity.object));
            var newLocation : string = objectNameMap.getValue(cmd.location.entity.object);

            interpretation = [[
                {polarity: true, relation: cmd.location.relation, args: [objectToMove, newLocation]}
            ]];
        }

        /*
        var objects : string[] = Array.prototype.concat.apply([], state.stacks);
        var a : string = objects[Math.floor(Math.random() * objects.length)];
        var b : string = objects[Math.floor(Math.random() * objects.length)];
        var interpretation : DNFFormula = [[
            {polarity: true, relation: "ontop", args: [a, "floor"]},
            {polarity: true, relation: "holding", args: [b]}
        ]];
        */
        return interpretation;
    }
    function getPossibleObjs(obj : Parser.Object) : collections.Set<string> {
      return null;
    }

    function addValObjectMap(key : Parser.Object, value : string, objectNameMap : collections.Dictionary<Parser.Object, string>) {
      var oldString : string = objectNameMap.setValue(key,value);
      //if(oldString != undefined) {
      //  throw new Error("ambiguity between " + value + " and " + oldString);
      //}
    }
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
    function constructObjectNameMap(cmd : Parser.Command, state : WorldState) : collections.Dictionary<Parser.Object,string>
    {

      var objectNameMap : collections.Dictionary<Parser.Object,string> = new collections.Dictionary<Parser.Object,string>(stringifyObject);
      var i : number = 0;
      var obj : Parser.Object = cmd.entity.object;
      var name : string;
      var row : number;
      var position : number;

      while(i < state.stacks.length)
      {
        if(checkStack(obj, i, state, name, objectNameMap))
        {
          position = i;
          break;
        }
        else
        {
          position = -1;
        }
        i++;
      }

      row = findRow(obj, position, state, name, objectNameMap);

      var result : number = findEntity(cmd.entity, position, row, state, objectNameMap);
      if(result == -1)
      {
        console.log("Such object does not exist!");
      }

      return objectNameMap;
    }
    function findEntity( entity : Parser.Entity, position : number, row : number, state : WorldState, objectNameMap : collections.Dictionary<Parser.Object, string>) : number
    {
      name = " ";
      var i : number = 0;
      var obj :  Parser.Object = entity.object;

      //console.log("Adding: " + name + " " + obj.form + " " + obj.size + " " + obj.color);
      if((obj.object ==  null) && (obj.location == null))
      {
        while( i < state.stacks[position].length)
        {
          if(checkSingle(state.stacks[position][i], findDescription(obj, state), state))
          {
            name = state.stacks[position][i];
          }
          i++;
        }

        addValObjectMap(obj, name, objectNameMap);
        return 0;
      }
      else
      {
        if((obj.location.relation == "on top of") ||  (obj.location.relation == "above"))
        {
          console.log("ON");
          if( findRow(obj.location.entity.object, position, state, name, objectNameMap) != -1)
          {
            return findEntity(obj.location.entity, position, row + 1, state, objectNameMap);
          }
          else
          {
            return -1;
          }
        }
        else if((obj.location.relation == "inside") || (obj.location.relation == "under"))
        {
          console.log("IN ");
          if(findRow(obj.location.entity.object, position, state, name, objectNameMap) != -1)
          {
            return findEntity(obj.location.entity, position, row - 1, state, objectNameMap);
          }
          else
          {
            return -1;
          }
        }
        else if ((obj.location.relation == "left of"))
        {
          console.log("LEFT");
          if(checkStack(obj.location.entity.object, position - 1, state, name, objectNameMap))
          {
            return findEntity(obj.location.entity, position - 1, row, state, objectNameMap);
          }
          else
          {
            return -1;
          }
        }
        else if ((obj.location.relation == "right of"))
        {
          console.log("RIGHT");
          if(checkStack(obj.location.entity.object, position + 1, state, name, objectNameMap))
          {
            return findEntity(obj.location.entity, position + 1, row, state, objectNameMap);
          }
          else
          {
            return -1;
          }
        }
        else if(obj.location.relation == "beside")
        {
          console.log("BESIDE");
          if(checkStack(obj.location.entity.object, position - 1, state, name, objectNameMap))
          {
            return findEntity(obj.location.entity, position - 1, row, state, objectNameMap);
          }
          else if(checkStack(obj.location.entity.object, position + 1, state, name, objectNameMap))
          {
            return findEntity(obj.location.entity, position + 1, row, state, objectNameMap);
          }
          else
          {
            return -1;
          }
        }
        else
        {
          console.log("NO");
          return -1;
        }
      }
    }
    // Compares the name of the object in the world with the given object to check whether they are the same one.
    function checkSingle( obj1 : string, obj2 : string[], state : WorldState) : boolean
    {
      var obj : ObjectDefinition;
      obj = state.objects[obj1];
      var result : boolean = true;
      //console.log("obj: " + obj.form + " " + obj.size + " " + obj.color);
      //console.log("res: " + obj2[0] + " " + obj2[1] + " " + obj2[2]);
      //console.log();
      if((obj.form != obj2[0]) && (obj2[0] != "anyform"))
      {
        result = false;
      }
      if((obj2[1] != "0") && (obj.size != null) && (obj.size != obj2[1]))
      {
        result = false;
      }
      if((obj2[2] != "0") && (obj.color != null) && (obj.color != obj2[2]))
      {
        result = false;
      }
      return result;
    }
    // If the object refers to another object and a location, and the referred object refers to other ones
    // finding the object itself (as in the form and shape) is hard and the object cannot be compared
    // with the name of the object in the world. This function finds the definition of the object.
    function findDescription(obj : Parser.Object, state : WorldState) : string[]
    {
      var st : string = "";
      var result : string[] = ["anyform","0","0"];

      if((obj.form == null) && (obj.color == null) && (obj.size == null))
      {
        return findDescription(obj.object, state);
      }
      else
      {
        if(obj.form != null)
        {
          result[0] = obj.form;
        }
        if(obj.size != null)
        {
          result[1] = obj.size;
        }
        if(obj.color != null)
        {
          result[2] = obj.color;
        }
        return result;
      }
    }
    // Checks whether the given object is in a certain stack or not.
    function checkStack(obj : Parser.Object, position : number, state : WorldState, name : string, objectNameMap : collections.Dictionary<Parser.Object, string>) : boolean
    {
      var i : number = 0;
      var res : boolean = false;
      var st : string[];
      while( i < state.stacks[position].length)
      {
        //console.log(state.objects[state.stacks[position][i]].form);
        st = findDescription(obj, state);
        //console.log(st);
        if(checkSingle(state.stacks[position][i], findDescription(obj, state), state))
        {
          console.log("here");
          name = state.stacks[position][i];
          res = true;
        }
        i++;
      }
      return res;
    }
    // Finds the row in the stack of the given object. Returns -1 if the object is not in the stack.
    function findRow(obj : Parser.Object, position : number, state : WorldState, name : string, objectNameMap : collections.Dictionary<Parser.Object, string>) : number
    {
      var i : number = 0;
      var res : number = -1;
      while (i < state.stacks[position].length)
      {
        if(checkSingle(state.stacks[position][i], findDescription(obj, state), state))
        {
          name = state.stacks[position][i];
          res = i;
        }
        i++;
      }
      return res;
    }

}
