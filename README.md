[![npm version](https://badge.fury.io/js/flatten-boolean-op.svg)](https://badge.fury.io/js/flatten-boolean-op)

# Boolean operations on polygons

Flatten-boolean-op is a javascript library performing fast and reliable boolean operations on polygons.
It supports following boolean operations on polygons:

* unify
* intersect
* subtract

Polygon is actually a multi-polygon which is comprised from a number of faces. The orientation of faces (clockwise or counterclockwise) is matter,
because algorithm implemented in the way that it never changes an original direction of the edge. For the boolean operation to be performed correctly,
faces have to fit the following rules:
1) Each face is a non-degenerated simple closed polygon. In another words, face should not have self-intersections and its orientation may be strictly defined.
2) If one face is totally inside another face, its orientation should be opposite to the orientation of external face.
Then we will call external faces **islands** and internal faces **holes**.
So the rule is "no island inside island and no hole inside hole".
3) Faces of the polygon should not overlap each other

Bollean operation algorithm does not check that polygon fits these rules, this is on the responsibility of the caller.

The result of boolean operation is also a polygon.
Note, that the resulted polygon may be empty, for example as the result of the intersection between two disjoint polygons.
                                                     
## Dependencies

Flatten-boolean-op depends on the **flatten-js 2d geometry library**.
This library provides **Polygon** class definition together with the methods to treat faces and edges.<br/>
Explore this library at <https://github.com/alexbol99/flatten-js> and see more useful classes and methods.


## Usage

Your can choose either to install package in your project or to consume algorithm as a serice.

### Install in your project

Install package in your project using npm:

    npm install flatten-boolean-op --save

Then require package in your module, define polygons using flatten-js library and call one of the methods:
  
```javascript
    // require flatten-boolean-op package
    let BooleanOp = require('flatten-boolean-op');
    let {union, intersect, subtract} = BooleanOp;
    
    // require flatten-js library that provides polygon model and other geometrical primitives
    let Flatten = require('flatten-js');
    let {Polygon, Point, Segment, Arc} = Flatten;
    
    // define first polygon
    let poly1 = new Polygon();
    poly1.addFace([point(0,0), point(150, 0), point(150,30), point(0, 30)]);
    
    // define second polygon
    let poly2 = new Polygon();
    poly2.addFace([point(100, 20), point(200, 20), point(200, 40), point(100, 40)]);
    
    // apply boolean operation "unify"
    let poly = unify(poly1, poly2);   
    
    console.log(poly.faces.size);           // expected 1
    console.log(poly.edges.size);           // expected 8
```

## Consume as a service

Instead of intalling package in your project you may choose to consume it as a service from <https://algorithmia.com> <br/>

- First, define your account in Algorithmia platform and get your API key.

- Then, install Algorithmia client


    npm install --save algorithmia

- Instantiate an Algorithmia client using your API key:
   
```javascript
     var algorithmia = require("algorithmia");
     var client = algorithmia(process.env.ALGORITHMIA_API_KEY);     
```

- Define input, call `.algo` method to define query and use `.pipe` to attach input to the query

Algorithm accepts input as an array to 3 elements: two polygon operands and boolean operation code. 
Polygon operand is JSON object, which is array of arrays of edges, representing each face.
Polygon JSON object may be obtained using build-in `polygon.toJSON()` method.<br/>
Algorithmia client calls JSON.serialize(), submits query to the algorithmia server and returns promise.
Boolean operation code is one of `Flatten.BOOLEAN_UNION, Flatten.BOOLEAN_SUBTRACT, Flatten.BOOLEAN_INTERSECT` constants.  
The result is also polygon JSON object. Polygon may be easily reconstructed from this object, see example below.

```javascript
    //
     var algorithmia = require("algorithmia");
     
     var client = algorithmia(process.env.ALGORITHMIA_API_KEY);
    // require flatten-boolean-op package
    let BooleanOp = require('flatten-boolean-op');
    let {union, intersect, subtract} = BooleanOp;
    
    // require flatten-js library that provides polygon model and other geometrical primitives
    let Flatten = require('flatten-js');
    let {Polygon, Point, Segment, Arc} = Flatten;
    
    // define first polygon
    let poly1 = new Polygon();
    poly1.addFace([point(0,0), point(150, 0), point(150,30), point(0, 30)]);
    
    // define second polygon
    let poly2 = new Polygon();
    poly2.addFace([point(100, 20), point(200, 20), point(200, 40), point(100, 40)]);
    
    // prepare input array for calling algorithm on cloud
    let input = [poly1.toJSON(), poly2.toJSON(), Flatten.BOOLEAN_UNION];
    
    // request boolean operation
    client("ALGORITHMIA_API_KEY")
        .algo("alexbol99/PolygonBooleanOp/0.1.2")
        .pipe(input)
        .then(function(output) {
            // Parse response from algorithmia and create new polygon
            let poly = new Polygon();   
            for (let jsonFace of output) {
                poly.addFace(jsonFace);
            }
            console.log(poly.faces.size);           // expected 1
            console.log(poly.edges.size);           // expected 8            
        });

```


See <https://algorithmia.com/algorithms/alexbol99/PolygonBooleanOp> algorithm page for more details

## Algorithm description
Algorithm implements the version of Kevin Weiler and Peter Atherton clipping algorithm,
described in the article **Hidden Surface Removal Using Polygon Area Sorting** see <https://www.cs.drexel.edu/~david/Classes/CS430/HWs/p214-weiler.pdf>

In pseudocode, it may be described as below:
1. The borders of the two polygons are compared for intersections.
Detected intersection points marked by references to the face they were taken, and by arc length -
the arc distance from the start of the first edge in face. 
Then intersection points are sorted by arc length.
2. At each intersection point a new vertex is added into the contour chain of each of the polygons.
3. Faces that have no intersections are processing for detection inclusion flag
4. List of intersection points are processed for both polygons.
 For each chain of edges defined by pair of intersection points, detected its inclusion flag.
 It may be INSIDE, OUTSIDE or BOUNDARY. For BOUNDARY chains we will defined addition overlapping flag: OVERLAPPING_SAME or OVERLAPPING_OPPOSITE,
 which will tell us how to treat boundary chains.
5.  Depending on performing boolean operation, not relevant chains are removing from both polygons
      - UNION: remove inner chains
      - SUBSTRACT: remove inner chains from the first polygon and outers chains from the second polygon
      - INTERSECT: remove outer chains from the second polygon
     Boundary chains with flag OVERLAPPING_OPPOSITE are always removed
6. Restore faces connecting interrupted chains from the first polygon to the correspondent chains from the second polygon

Remember that algorithm relies on the direction of the edges. It can find continuation of the interrupted chain only if edge from the second polygon
is an precise continuation of the edge from the first one. That is why faces that have same meaning (island or hole) should have same orientation
is both polygons.


 
    