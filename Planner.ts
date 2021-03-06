///<reference path="World.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="Graph.ts"/>
///<reference path="World.ts"/>

/**
* Planner module
*
* The goal of the Planner module is to take the interpetation(s)
* produced by the Interpreter module and to plan a sequence of actions
* for the robot to put the world into a state compatible with the
* user's command, i.e. to achieve what the user wanted.
*
* The planner should use your A* search implementation to find a plan.
*/
module Planner {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    /**
     * Top-level driver for the Planner. Calls `planInterpretation` for each given interpretation generated by the Interpreter.
     * @param interpretations List of possible interpretations.
     * @param currentState The current state of the world.
     * @returns Augments Interpreter.InterpretationResult with a plan represented by a list of strings.
     */
    export function plan(interpretations : Interpreter.InterpretationResult[], currentState : WorldState) : PlannerResult[] {
        var errors : Error[] = [];
        var plans : PlannerResult[] = [];
        interpretations.forEach((interpretation) => {
            try {
                var result : PlannerResult = <PlannerResult>interpretation;
                result.plan = planInterpretation(result.interpretation, currentState);
                if (result.plan.length == 0) {
                    result.plan.push("That is already true!");
                }
                plans.push(result);
            } catch(err) {
                errors.push(err);
            }
        });
        if (plans.length) {
            return plans;
        } else {
            // only throw the first error found
            throw errors[0];
        }
    }

    export interface PlannerResult extends Interpreter.InterpretationResult {
        plan : string[];
    }

    export function stringify(result : PlannerResult) : string {
        return result.plan.join(", ");
    }

    function cloneStacks(s : Stack[]) : Stack[] {
      var newStackList : Stack[] = new Array<Array<string>>();
      for(var i : number = 0; i < s.length ; i++) {
        var newStack : Stack = new Array<string>();
        for(var j : number = 0; j < s[i].length ; j++) {
          newStack.push(s[i][j]);
        }
        newStackList.push(newStack);
      }
      return newStackList;
    }
    function moveArm(state : WorldState, n :number) {
      state.arm += n;
    }
    function drop(state : WorldState) {
      state.stacks[state.arm].push(state.holding);
      state.holding = undefined;
    }
    function pickup(state : WorldState) {
      state.holding = state.stacks[state.arm].pop();
    }
    class WorldStateNode {
      state : WorldState ;
      private identifier : string = null;
      constructor(state : WorldState) {
       this.state = state;
      }
      toString(): string {
        if(this.identifier != null) {
          //some dynamic programming for performance
          return this.identifier;
        }
        var s :string = "";
        for(var i : number = 0; i < this.state.stacks.length; i++) {
          for(var j : number = 0; j < this.state.stacks[i].length; j++) {
            if(this.state.stacks[i][j] == undefined){
              break;
            }
            s+=this.state.stacks[i][j];
          }
          s+="+";
        }
        s+=this.state.arm;
        s+=this.state.holding;
        this.identifier=s;
        return s;
      }
    }
    class StateGraph implements Graph<WorldStateNode> {
      /** Computes the edges that leave from a node. */
      outgoingEdges(node : WorldStateNode) : Edge<WorldStateNode>[] {

        var edgeList : Edge<WorldStateNode>[] = new Array<Edge<WorldStateNode>>();
        if(node == undefined) {
          return edgeList;
        }
        var actions : String[] = getPossibleActions(node.state);

        for(var i :number = 0; i < actions.length; i++) {
          var newState : WorldState = {arm: node.state.arm, stacks: cloneStacks(node.state.stacks),
                holding: node.state.holding, objects : node.state.objects, examples : node.state.examples}
          switch (actions[i]) {
            case "r":
              moveArm(newState,1);
              break;
            case "l":
              moveArm(newState,-1);
              break;
            case "d":
              drop(newState);
              break;
            case "p":
              pickup(newState);
              break;
          }
          var newEdge : Edge<WorldStateNode> = new Edge<WorldStateNode>();
          newEdge.from = node;
          newEdge.to = new WorldStateNode(newState);
          newEdge.cost = 1;
          edgeList.push(newEdge);
        }
        return edgeList;
      }
      /** A function that compares nodes. Returns 0 if they are equal and 1 otherwise */
      compareNodes(n1 : WorldStateNode, n2 : WorldStateNode) : number {
        var s1 : WorldState = n1.state;
        var s2 : WorldState = n2.state;
        if(s1 == null || s2 == null) {
          return 0;
        }
        if (s1.arm != s2.arm || s1.holding != s2.holding) {
          return 1;
        }
        for(var i : number = 0; i < s1.stacks.length; i++) {
          for(var j : number = 0; j < s1.stacks.length; j++) {
            if(s1.stacks[i][j] != s2.stacks[i][j]){
              return 1;
            }
          }
        }
        return 0;
      }
    }
    //returns all possible actions in the current world state, "r" "l" "p" "d"
    function getPossibleActions(w1 : WorldState) : string[] {
      var result : string[] = new Array<string>();
      if (w1 == null) {
        return result;
      }
      if(w1.arm > 0) {
        result.push("l");
      }
      if(w1.arm < w1.stacks.length - 1) {
        result.push("r");
      }

      if(w1.holding == undefined) {
          result.push("p");
          return result;
      }
      if(w1.stacks[w1.arm].length == 0) {
        result.push("d");
        return result;
      }

      var temp : string = w1.stacks[w1.arm][w1.stacks[w1.arm].length-1];

      var obj2 : ObjectDefinition = w1.objects[temp];
      var obj : ObjectDefinition = w1.objects[w1.holding];

      if((obj2 == null) || (obj == null))
      {
        return result;
      }
      if(!(obj.form == "ball" && obj2.form != "box") &&
      (!((obj.form == "box" && obj.size == "small") && (obj2.size == "small" && (obj2.form == "brick" || obj2.form == "pyramid")))) &&
      (!((obj.size == "large" && obj.form == "box") && (obj2.form != "brick" && obj2.form != "table"))) &&
      (!(obj2.size == "small" && obj.size == "large")) &&
      (!(obj2.form == "ball")) && (w1.stacks[w1.arm].length < 5)) {
        result.push("d");
      }
      return result;
    }
    //@returns the heuristic cost of a single literal
    function heur(ws : WorldState, lit : Interpreter.Literal) : number { //not taking polarities in to account
      var cost : number = 0;
      switch(lit.relation){
        case "holding" :
          var pos : number = posOf(lit.args[0],ws);
          cost += pickupCost(lit.args[0],ws,pos);
          cost += moveCost(pos,ws);
          return cost;
        case "ontop" :
          return onTopCost(ws,lit.args);
        case "inside" :
          return onTopCost(ws,lit.args);
        case "above" :
          var obj1 : string = lit.args[0];
          var obj2 : string = lit.args[1];
          var pos1 : number = posOf(obj1,ws);
          var pos2 : number = posOf(obj2,ws);
          return Math.max(moveCost(pos1,ws),moveCost(pos2,ws))+pickupCost(obj1,ws,pos1)+1; //+1 is dropcost
        case "under" :
          var obj2 : string = lit.args[0];
          var obj1 : string = lit.args[1];
          var pos1 : number = posOf(obj1,ws);
          var pos2 : number = posOf(obj2,ws);
          return Math.max(moveCost(pos1,ws),moveCost(pos2,ws))+pickupCost(obj1,ws,pos1)+1; //+1 is dropcost
        case "beside" :
          return besideCost(ws, lit.args);
        case "leftof" :
          return besideCost(ws, lit.args);
        case "rightof" :
          return besideCost(ws, lit.args);
        }
      return cost;
    }
    function besideCost(ws : WorldState, args : string[]) : number{
      var obj : string = args[0];
      var loc : string = args[1];
      var objPos : number = posOf(obj, ws);
      var locPos : number = posOf(loc, ws);
      return Math.min(pickupCost(obj,ws,objPos)+moveCost(objPos, ws),pickupCost(loc,ws,locPos)
            +moveCost(locPos, ws))+Math.abs(locPos-objPos)+1;
    }
    //The minimum cost of emptying a stack
    function clearStackCost(index : number,ws : WorldState){
      return ws.stacks[index].length*4+Math.abs(ws.arm-index);
    }
    function onTopCost(ws : WorldState, args : string[]) : number {
      var obj : string = args[0];
      var loc : string = args[1];
      var pos1 : number = posOf(obj,ws);
      var pos2 : number = posOf(loc,ws);
      if(loc == "floor") {
        var bestIndex : number = 0;
        var cost : number = 0;
        for(var i : number = 1 ; i < ws.stacks.length; i++) {
          if (clearStackCost(i,ws) < clearStackCost(bestIndex,ws)) {
            bestIndex = i;
          }
        }
        return pickupCost(obj,ws,pos1) + clearStackCost(bestIndex,ws)+1; //+1 is the dropcost
      }
      return pickupCost(obj,ws,pos1)+dropCost(loc,ws,pos2)+Math.max(moveCost(pos1,ws),moveCost(pos2,ws));
    }
    //The minimum cost of moving from state.arm to pos
    function moveCost(pos : number,state : WorldState) : number{
      if(pos == -1) { //if floor or holding
        return 0;
      }else if(pos == Infinity){
        throw new Error("floor!");
      }else{
        return Math.abs(state.arm-pos);
      }
    }
    //The minumum cost of dropping something in loc
    function dropCost(loc : string, ws : WorldState, pos : number) : number {
      if(ws.holding == loc){ //then pos = -1
        return 1;
      }
      return nrOfItemsOnTopOf(loc,ws,pos)*4+1;
      ;
    }
    //The minimum cost of picking up desiredObject
    function pickupCost(desiredObject : string, ws : WorldState, pos : number) : number {
      var cost : number = 0;
      if(ws.holding == desiredObject) {
        return 0;
      }
      cost+= nrOfItemsOnTopOf(desiredObject, ws, pos)*4;
      if (ws.holding != undefined) {
          cost+=2;
      }
      return cost;
    }
    function nrOfItemsOnTopOf(s : string, ws : WorldState, pos : number) : number {
      if(ws.holding == s) {
        return 0;
      }
      var result: number = 0;
      for(var i : number = ws.stacks[pos].length-1; i >= 0; i--) {
          if(ws.stacks[pos][i] == s) {
            break;
          }
          result++;
      }
      return result;
    }
    //returns the index of the stack containing the object s
    function posOf(s : string, ws : WorldState) : number {
      var result : number = -1; //returns -1 if it is being held or it doesnt exist
      if(s == "floor") {
          return Infinity;
      }
      for(var i : number = 0; i < ws.stacks.length; i++) {
          for(var j : number = 0; j < ws.stacks[i].length; j++) {
            if (ws.stacks[i][j] == s) {
              return i;
            }
          }
      }
      return result;
    }
    /**
     * @param interpretation The logical interpretation of the user's desired goal. The plan needs to be such that by executing it, the world is put into a state that satisfies this goal.
     * @param state The current world state.
     * @returns Basically, a plan is a
     * stack of strings, which are either system utterances that
     * explain what the robot is doing (e.g. "Moving left") or actual
     * actions for the robot to perform, encoded as "l", "r", "p", or
     * "d". The code shows how to build a plan. Each step of the plan can
     * be added using the `push` method.
     */
    function planInterpretation(interpretation : Interpreter.DNFFormula, state : WorldState) : string[] {
      var stateGraph : StateGraph = new StateGraph();

      //The heuristics function
      var heuristics = function heuristicsf(node : WorldStateNode) : number {
        var minhcost : number = Infinity;
        for(var i : number = 0; i < interpretation.length; i++) {
          minhcost = Math.min(minhcost,heur(node.state,interpretation[i][0]));
        }
        return minhcost;
      }
      // The goalfunction , not taking polarities into account, since we don't handle them.
      var goalFunction = function goalf(node : WorldStateNode) : boolean {
        var world : WorldState = node.state;
        for(var i : number = 0; i < interpretation.length; i++) {
            var l : Interpreter.Literal = interpretation[i][0];
            var subResult : boolean;
            if(l.relation == "holding") { //the only single parameter relation
              subResult = world.holding == l.args[0];
            }else{
              subResult = Interpreter.matchesRelation(l.args[0] ,l.args[1], l.relation, world);
            }
            if (subResult) {
              return true;
            }
        }
        return false;
      }
      var result : SearchResult<WorldStateNode> = aStarSearch(stateGraph,new WorldStateNode(state),goalFunction,heuristics,10);

      //reconstruct the command sequence from result.path
      var plan : string[] = new Array<string>();
      for(var i : number = 0; i < result.path.length-1; i++) {
        var current : WorldState = result.path[i].state;
        var next : WorldState = result.path[i+1].state;
        if(current.arm + 1 == next.arm) {
          plan.push("r");
          continue;
        }
        if(current.arm - 1 == next.arm) {
          plan.push("l");
          continue;
        }
        if(current.holding == undefined) {
          plan.push("p");
        }else{
          plan.push("d");
        }
      }

      return plan;
    }
}
