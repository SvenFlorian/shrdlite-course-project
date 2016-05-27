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

    function cloneStacks(s : Stack[]) : Stack[] { // A lot of computation will be done here
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
      toString(): string { //TODO perfrom just once?
        if(this.state == null) {
          throw new Error("this state is null!");
          //return "";
        }
        if(this.identifier != null) {
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
        console.log(actions.toString());
        console.log(node.toString());
        return edgeList;
      }
      /** A function that compares nodes. */
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
      (!((obj.size == "large" && obj.form == "box") && (obj2.form == "pyramid"))) &&
      (!(obj2.size == "small" && obj.size == "large")) &&
      (!(obj2.form == "ball")) && (w1.stacks[w1.arm].length < 5)) {
        result.push("d");
      }
      return result;
    }
    function huer(ws : WorldState, lit : Interpreter.Literal) : number {
      var cost : number = 0;
      if(lit.relation == "holding"){
        var desiredObject : string = lit.args[0];
        if(ws.holding == desiredObject) {
          return 0;
        }
        cost+= Math.abs(ws.arm-posOf(desiredObject,ws));
      }
      return cost;
    }
    function posOf(s : string, ws : WorldState) : number {
      var result : number = -1; //returns -1 if it is being held or it doesnt exist
      for(var i : number = 0; i < ws.stacks.length; i++) {
          result = ws.stacks[i].indexOf(s);
          if (result != -1){
            return result;
          }
      }
      return -1;
    }
    //////////////////////////////////////////////////////////////////////
    // private functions

    /**
     * The core planner function. The code here is just a template;
     * you should rewrite this function entirely. In this template,
     * the code produces a dummy plan which is not connected to the
     * argument `interpretation`, but your version of the function
     * should be such that the resulting plan depends on
     * `interpretation`.
     *
     *
     * @param interpretation The logical interpretation of the user's desired goal. The plan needs to be such that by executing it, the world is put into a state that satisfies this goal.
     * @param state The current world state.
     * @returns Basically, a plan is a
     * stack of strings, which are either system utterances that
     * explain what the robot is doing (e.g. "Moving left") or actual
     * actions for the robot to perform, encoded as "l", "r", "p", or
     * "d". The code shows how to build a plan. Each step of the plan can
     * be added using the `push` method.
     */
    function planInterpretation2(interpretation : Interpreter.DNFFormula, state : WorldState) : string[] {
      var testNode : WorldStateNode = new WorldStateNode(state);
      var stateGraph : StateGraph = new StateGraph();
      var edges : Array<Edge<WorldStateNode>> = stateGraph.outgoingEdges(testNode);
      var testNode2 : WorldStateNode = edges[0].to;
      var edges : Array<Edge<WorldStateNode>> = stateGraph.outgoingEdges(testNode2);
      var testNode3 : WorldStateNode = edges[0].to;

      console.log(" " + testNode.toString() + " - actions: " + getPossibleActions(testNode.state));
      console.log(" " + testNode2.toString() + " - actions: " + getPossibleActions(testNode2.state));

      console.log(" " + edges[0].to.toString() + " - actions: " + getPossibleActions(edges[0].to.state));
      console.log(" " + edges[1].to.toString() + " - actions: " + getPossibleActions(edges[1].to.state));
      console.log(" " + edges[2].to.toString() + " - actions: " + getPossibleActions(edges[2].to.state));

      return null;
    }
    function planInterpretation(interpretation : Interpreter.DNFFormula, state : WorldState) : string[] {
      //var testNode : WorldStateNode = new WorldStateNode(state);
      var stateGraph : StateGraph = new StateGraph();

      //TODO heuristics function
      var heuristics = function heuristics(node : WorldStateNode) : number {
        var minhcost : number = Infinity;
        for(var i : number = 0; i < interpretation.length; i++) {
          minhcost = Math.min(minhcost,huer(node.state,interpretation[i][0]));
        }
        return 0;//return minhcost;
      }
      var goalFunction = function goalf(node : WorldStateNode) : boolean {
        var world : WorldState = node.state;
        var result : boolean = false;
        for(var i : number = 0; i < interpretation.length; i++) {
            var l : Interpreter.Literal = interpretation[i][0]; //assuming just 1 literal per potential goal
            var subResult : boolean;
            if(l.relation == "holding") { //the only single paramter relation
              subResult = node.state.holding == l.args[0];
            }else{
              Interpreter.matchesRelation(l.args[0] ,l.args[1], l.relation, world);
            }
            if(!l.polarity) {
                subResult = !subResult;
            }
            result = result || subResult;
        }
        return result;
      }
      var result : SearchResult<WorldStateNode> = aStarSearch(stateGraph,new WorldStateNode(state),goalFunction,heuristics,100);
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
