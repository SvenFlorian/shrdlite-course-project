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
* @param timeout Maximum time to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/
function aStarSearch<Node> (
    graph : Graph<Node>,
    start : Node,
    goal : (n:Node) => boolean,
    heuristics : (n:Node) => number,
    timeout : number
) : SearchResult<Node> {


  function nodeToString(key:Node) : string {
    return key.toString();
  }

  var MapCost : collections.Dictionary<Node,number> = new collections.Dictionary<Node,number>(nodeToString);
  var VisitedParent : collections.Dictionary<Node,Node> = new collections.Dictionary<Node,Node>(nodeToString);
	var time : number = 0;
  function totalCost(node : Node) {
    var n:number = MapCost.getValue(node);
    if (n == null || n == undefined){ //same thing?
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
  frontier.add(start);
  MapCost.setValue(start,0);
  var currentNode : Node;
  //frontier.push(currentNode);
	//var currentTime = new Date();

	while (time < timeout) {
    var parentNode = currentNode;
    currentNode = frontier.dequeue();
    VisitedParent.setValue(currentNode,parentNode);
    visitedNodes.add(currentNode);
    //console.log(parentNode);
    //console.log("visited nodes : " +  visitedNodes.toString());
    //console.log("frontier nodes : " +  frontier.toString());
    if (goal(currentNode)) {
      //console.log("found the goal node!");
      //reconstruct path home
      var finalCost : number = graph.outgoingEdges(currentNode)[i].cost+totalCost(currentNode);
      var finalPath : Node[] = [];
      var current : Node = newNode;
      while (current != null){
        finalPath.push(current)
        current = VisitedParent.getValue(current);
      }
      finalPath = finalPath.reverse();
      var result : SearchResult<Node> = {
        path: finalPath,
        cost: finalCost
      };
      return result;
    }

		//add currentnode's neighbours to frontier and calculate costs
    var bestCost : number = Infinity;
    var bestNode : Node = graph.outgoingEdges(currentNode)[0].to;
		for (var i = 0; i < graph.outgoingEdges(currentNode).length; i++) {
      //console.log(i);
      var newNode : Node = graph.outgoingEdges(currentNode)[i].to;
      if (visitedNodes.contains(newNode)) {
        //console.log("continue1");
        continue;
      }
      var cost : number = graph.outgoingEdges(currentNode)[i].cost+totalCost(currentNode);
      if (!frontier.contains(newNode)) {
        frontier.add(newNode);
      } else {
        if(cost >= totalCost(newNode)) {
          continue; //then this is a slower path to newnode than the already known one
        }
      }
      MapCost.setValue(newNode,cost);
			frontier.enqueue(newNode);
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


//////////////////////////////////////////////////////////////////////
// here is an example graph

interface Coordinate {
    x : number;
    y : number;
}


class GridNode {
    constructor(
        public pos : Coordinate
    ) {}

    add(delta : Coordinate) : GridNode {
        return new GridNode({
            x: this.pos.x + delta.x,
            y: this.pos.y + delta.y
        });
    }

    compareTo(other : GridNode) : number {
        return (this.pos.x - other.pos.x) || (this.pos.y - other.pos.y);
    }

    toString() : string {
        return "(" + this.pos.x + "," + this.pos.y + ")";
    }
}

/** Example Graph. */
class GridGraph implements Graph<GridNode> {
    private walls : collections.Set<GridNode>;

    constructor(
        public size : Coordinate,
        obstacles : Coordinate[]
    ) {
        this.walls = new collections.Set<GridNode>();
        for (var pos of obstacles) {
            this.walls.add(new GridNode(pos));
        }
        for (var x = -1; x <= size.x; x++) {
            this.walls.add(new GridNode({x:x, y:-1}));
            this.walls.add(new GridNode({x:x, y:size.y}));
        }
        for (var y = -1; y <= size.y; y++) {
            this.walls.add(new GridNode({x:-1, y:y}));
            this.walls.add(new GridNode({x:size.x, y:y}));
        }
    }

    outgoingEdges(node : GridNode) : Edge<GridNode>[] {
        var outgoing : Edge<GridNode>[] = [];
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (! (dx == 0 && dy == 0)) {
                    var next = node.add({x:dx, y:dy});
                    if (! this.walls.contains(next)) {
                        outgoing.push({
                            from: node,
                            to: next,
                            cost: Math.sqrt(dx*dx + dy*dy)
                        });
                    }
                }
            }
        }
        return outgoing;
    }

    compareNodes(a : GridNode, b : GridNode) : number {
        return a.compareTo(b);
    }

    toString() : string {
        var borderRow = "+" + new Array(this.size.x + 1).join("--+");
        var betweenRow = "+" + new Array(this.size.x + 1).join("  +");
        var str = "\n" + borderRow + "\n";
        for (var y = this.size.y-1; y >= 0; y--) {
            str += "|";
            for (var x = 0; x < this.size.x; x++) {
                str += this.walls.contains(new GridNode({x:x,y:y})) ? "## " : "   ";
            }
            str += "|\n";
            if (y > 0) str += betweenRow + "\n";
        }
        str += borderRow + "\n";
        return str;
    }
}
