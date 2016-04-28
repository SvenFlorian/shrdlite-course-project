var Edge = (function () {
    function Edge() {
    }
    return Edge;
}());
var SearchResult = (function () {
    function SearchResult() {
    }
    return SearchResult;
}());
function aStarSearch(graph, start, goal, heuristics, timeout) {
    function nodeToString(key) {
        return key.toString();
    }
    var MapCost = new collections.Dictionary(nodeToString);
    var VisitedParent = new collections.Dictionary(nodeToString);
    var time = 0;
    function totalCost(node) {
        var n = MapCost.getValue(node);
        if (n == undefined) {
            n = Infinity;
        }
        return n;
    }
    function compareCosts(n1, n2) {
        var c1 = totalCost(n1) + heuristics(n1);
        var c2 = totalCost(n2) + heuristics(n2);
        if (c1 < c2)
            return 1;
        else if (c2 < c1)
            return -1;
        else
            return 0;
    }
    var frontier = new collections.PriorityQueue(compareCosts);
    var visitedNodes = new collections.Set();
    frontier.enqueue(start);
    MapCost.setValue(start, 0);
    var currentNode = start;
    while (time < timeout) {
        var parentNode = currentNode;
        currentNode = frontier.dequeue();
        VisitedParent.setValue(currentNode, parentNode);
        visitedNodes.add(currentNode);
        if (goal(currentNode)) {
            console.log("found the goal node!");
            var finalCost = totalCost(currentNode);
            var finalPath = [];
            while (graph.compareNodes(currentNode, start) != 0) {
                finalPath.push(currentNode);
                currentNode = VisitedParent.getValue(currentNode);
            }
            finalPath.push(start);
            finalPath = finalPath.reverse();
            var result = {
                path: finalPath,
                cost: finalCost
            };
            return result;
        }
        for (var i = 0; i < graph.outgoingEdges(currentNode).length; i++) {
            var newNode = graph.outgoingEdges(currentNode)[i].to;
            if (visitedNodes.contains(newNode)) {
                continue;
            }
            var cost = graph.outgoingEdges(currentNode)[i].cost + totalCost(currentNode);
            if (!frontier.contains(newNode)) {
                frontier.add(newNode);
                MapCost.setValue(newNode, cost);
                frontier.enqueue(newNode);
            }
            else if (cost >= totalCost(newNode)) {
                continue;
            }
            else {
                MapCost.setValue(newNode, cost);
                VisitedParent.setValue(newNode, currentNode);
                continue;
            }
        }
    }
    console.log("error: timeout!");
    return null;
}
var GridNode = (function () {
    function GridNode(pos) {
        this.pos = pos;
    }
    GridNode.prototype.add = function (delta) {
        return new GridNode({
            x: this.pos.x + delta.x,
            y: this.pos.y + delta.y
        });
    };
    GridNode.prototype.compareTo = function (other) {
        return (this.pos.x - other.pos.x) || (this.pos.y - other.pos.y);
    };
    GridNode.prototype.toString = function () {
        return "(" + this.pos.x + "," + this.pos.y + ")";
    };
    return GridNode;
}());
var GridGraph = (function () {
    function GridGraph(size, obstacles) {
        this.size = size;
        this.walls = new collections.Set();
        for (var _i = 0, obstacles_1 = obstacles; _i < obstacles_1.length; _i++) {
            var pos = obstacles_1[_i];
            this.walls.add(new GridNode(pos));
        }
        for (var x = -1; x <= size.x; x++) {
            this.walls.add(new GridNode({ x: x, y: -1 }));
            this.walls.add(new GridNode({ x: x, y: size.y }));
        }
        for (var y = -1; y <= size.y; y++) {
            this.walls.add(new GridNode({ x: -1, y: y }));
            this.walls.add(new GridNode({ x: size.x, y: y }));
        }
    }
    GridGraph.prototype.outgoingEdges = function (node) {
        var outgoing = [];
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (!(dx == 0 && dy == 0)) {
                    var next = node.add({ x: dx, y: dy });
                    if (!this.walls.contains(next)) {
                        outgoing.push({
                            from: node,
                            to: next,
                            cost: Math.sqrt(dx * dx + dy * dy)
                        });
                    }
                }
            }
        }
        return outgoing;
    };
    GridGraph.prototype.compareNodes = function (a, b) {
        return a.compareTo(b);
    };
    GridGraph.prototype.toString = function () {
        var borderRow = "+" + new Array(this.size.x + 1).join("--+");
        var betweenRow = "+" + new Array(this.size.x + 1).join("  +");
        var str = "\n" + borderRow + "\n";
        for (var y = this.size.y - 1; y >= 0; y--) {
            str += "|";
            for (var x = 0; x < this.size.x; x++) {
                str += this.walls.contains(new GridNode({ x: x, y: y })) ? "## " : "   ";
            }
            str += "|\n";
            if (y > 0)
                str += betweenRow + "\n";
        }
        str += borderRow + "\n";
        return str;
    };
    return GridGraph;
}());
