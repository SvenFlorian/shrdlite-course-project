///<reference path="lib/collections.ts"/>
///<reference path="lib/node.d.ts"/>

/** Graph module
*
*  Types for generic A\* implementation.
*
*  *NB.* The only part of this module
*  that you should change is the `aStarSearch` function. Everything
*  else should be used as-is.
*/

/** An edge in a graph. */
class Edge<Node> {
    from : Node;
    to   : Node;
    cost : number;
}

/** A directed graph. */
interface Graph<Node> {
    /** Computes the edges that leave from a node. */
    outgoingEdges(node : Node) : Edge<Node>[];
    /** A function that compares nodes. */
    compareNodes : collections.ICompareFunction<Node>;
}

/** Type that reports the result of a search. */
class SearchResult<Node> {
    /** The path (sequence of Nodes) found by the search algorithm. */
    path : Node[];
    /** The total cost of the path. */
    cost : number;
}

/**
* A\* search implementation, parameterised by a `Node` type. The code
* here is just a template; you should rewrite this function
* entirely. In this template, the code produces a dummy search result
* which just picks the first possible neighbour.
*
* Note that you should not change the API (type) of this function,
* only its body.
* @param graph The graph on which to perform A\* search.
* @param start The initial node.
* @param goal A function that returns true when given a goal node. Used to determine if the algorithm has reached the goal.
* @param heuristics The heuristic function. Used to estimate the cost of reaching the goal from a given Node.
* @param timeout Maximum time (in seconds) to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/
function aStarSearch<Node> (
    graph : Graph<Node>,
    start : Node,
    goal : (n:Node) => boolean,
    heuristics : (n:Node) => number,
    timeout : number
) : SearchResult<Node> {

  //todo timeout
  function nodeToString(key:Node) : string {
    return key.toString();
  }

  var MapCost : collections.Dictionary<Node,number> = new collections.Dictionary<Node,number>(nodeToString);
  var VisitedParent : collections.Dictionary<Node,Node> = new collections.Dictionary<Node,Node>(nodeToString);
	var time : number = 0;
  function totalCost(node : Node) {
    var n:number = MapCost.getValue(node);
    if (n == undefined){
      n = Infinity;
    }
    return n;
  }
  function compareCosts(n1:Node,n2:Node) : number {
    var c1 : number = totalCost(n1)+heuristics(n1);
    var c2 : number = totalCost(n2)+heuristics(n2);
    if(c1 < c2)
      return 1;
    else if (c2 < c1)
      return -1;
    else
      return 0;
  }
  var frontier : collections.PriorityQueue<Node> = new collections.PriorityQueue<Node>(compareCosts);

  //var frontier : collections.Set<Node> = new collections.Set<Node>();
  var visitedNodes : collections.Set<Node> = new collections.Set<Node>();
  //closedSet.add(start);
  frontier.enqueue(start);
  MapCost.setValue(start,0);
  var currentNode : Node = start; // hence the startnode is its own parent
	//var currentTime = new Date();

	while (time < timeout) {
    var parentNode = currentNode;
    currentNode = frontier.dequeue();
    VisitedParent.setValue(currentNode,parentNode);
    visitedNodes.add(currentNode);
    //console.log(parentNode);
    //console.log("visited nodes : " +  visitedNodes.toString());
    //console.log("frontier nodes : " +  frontier.size());
    if (goal(currentNode)) {
      console.log("found the goal node!");
      //reconstruct path home
      var finalCost : number = totalCost(currentNode);
      var finalPath : Node[] = [];
      while (graph.compareNodes(currentNode,start) != 0){
        console.log(currentNode);
        finalPath.push(currentNode)
        currentNode = VisitedParent.getValue(currentNode);
      }
      finalPath.push(start);
      finalPath = finalPath.reverse();
      var result : SearchResult<Node> = {
        path: finalPath,
        cost: finalCost
      };
      return result;
    }

		//add currentnode's neighbours to frontier and calculate costs
		for (var i = 0; i < graph.outgoingEdges(currentNode).length; i++) {
      //console.log(i);
      var newNode : Node = graph.outgoingEdges(currentNode)[i].to;
      if (visitedNodes.contains(newNode)) {
        //console.log("continue1");
        continue;
      }
      var cost : number = graph.outgoingEdges(currentNode)[i].cost+totalCost(currentNode);
      //console.log(totalCost(currentNode));
      if (!frontier.contains(newNode)) {
        frontier.add(newNode);
        MapCost.setValue(newNode,cost);
  			frontier.enqueue(newNode);
      }else if (cost >= totalCost(newNode)) {
          //console.log("continue!");
          continue; //then this is a slower path to newnode than the already known one
      }else{
          MapCost.setValue(newNode,cost);
          VisitedParent.setValue(newNode, currentNode);
          //need to re-enter into the frontier after the value update?
          continue
      }
    }
  }
  console.log("error: timeout!");
  return null;
}

    //while (result.path.length < 3) {
    //    var edge : Edge<Node> = graph.outgoingEdges(start) [0];
    //    if (! edge) break;
    //    start = edge.to;
    //    result.path.push(start);
    //    result.cost += edge.cost;
    //}
    //return result;
