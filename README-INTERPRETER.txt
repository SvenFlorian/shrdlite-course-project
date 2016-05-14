The code consists of the following functions:

function interpretCommand : constructs the interpretation using the other functions

function isFeasible : returns true if the given literal does not break any physical law (assuming you are in the small world)

function initObjectMapping : initializes a mapping between an object description and its name in the world state. This mapping is then used in the GetMachingObjects function.

function getMatchingObjects : returns a list of all the objects in the world state that fit the description given by a Parser.Object. This is done recursively for the whole tree supplied by the Parser.Object

function pruneList : returns the intersection of given set and the set of objects that are feasible due to the given relation.


Essentially, the base of every command is to take an object and put it to a location. Which exact objects is meant can be narrowed down by elaborating on its relation to some other object in the world. Similarly, this can also be done to narrow down the potential locations to which the object should be moved to. 

In our program we start by traversing through the tree and finding all the possible objects that match this description, as well as finding all the possible locations. We then combine these to create a list of goal states, while also eliminating all infeasible goals in the process. 
