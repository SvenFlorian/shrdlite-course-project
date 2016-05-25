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
    var startTime = Date.now();
    timeout = timeout * 1000;
    while (time < timeout) {
        time = (Date.now() - startTime);
        var parentNode = currentNode;
        currentNode = frontier.dequeue();
        visitedNodes.add(currentNode);
        if (goal(currentNode)) {
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
            console.log(visitedNodes.size());
            if (visitedNodes.contains(newNode)) {
                continue;
            }
            var cost = graph.outgoingEdges(currentNode)[i].cost + totalCost(currentNode);
            if (!frontier.contains(newNode)) {
                MapCost.setValue(newNode, cost);
                frontier.enqueue(newNode);
                VisitedParent.setValue(newNode, currentNode);
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
