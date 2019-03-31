[![npm version](https://badge.fury.io/js/flatten-boolean-op.svg)](https://badge.fury.io/js/flatten-boolean-op)
[![Build Status](https://travis-ci.org/alexbol99/flatten-boolean-op.svg?branch=master)](https://travis-ci.org/alexbol99/flatten-boolean-op)
[![Coverage Status](https://coveralls.io/repos/github/alexbol99/flatten-boolean-op/badge.svg?branch=master)](https://coveralls.io/github/alexbol99/flatten-boolean-op?branch=master)

# Boolean operations on polygons

**@flatten-js/boolean-op** is a javascript library performing fast and reliable boolean operations on polygons.
It provides binary boolean operations:

* [unify](https://alexbol99.github.io/flatten-boolean-op/BooleanOp.html#.unify) 
* [intersect](https://alexbol99.github.io/flatten-boolean-op/BooleanOp.html#.intersect)
* [subtract](https://alexbol99.github.io/flatten-boolean-op/BooleanOp.html#.subtract)

Polygon is actually a multi-polygon which may be comprised from a number of faces. The orientation of faces (clockwise or counterclockwise) is matter,
because algorithm implemented in the way that it never changes an original direction of the edge. For the boolean operation to be performed correctly,
faces have to fit the following rules:
1) Each face is a non-degenerated simple closed polygon.
In another words, face should not have self-intersections and its orientation should be definable.
2) If one face is totally inside another face, its orientation should be opposite to the orientation of external face.
Then we call external faces as  **"islands"** and internal faces as **"holes"**.
So the rule is "no island inside island and no hole inside hole".
3) Faces of the polygon should not overlap each other

Boolean operation algorithm does not check that polygon fits these rules, this is on the responsibility of the caller.

The result of boolean operation is also a polygon.
Note, that the resulted polygon may be empty, for example as the result of the intersection between two disjoint polygons.                                                     

## Contacts

Follow me on Twitter [@alex_bol_](https://twitter.com/alex_bol_)

## Usage

Install this package together with @flatten-js/core package which provide class Polygon:
```bash
    npm install @flatten-js/boolean-op @flatten-js/core --save
```

## Example
Then require package in your module, create two polygons using flatten-js library and call one of the methods:
  
```javascript
    import {intersect} from "@flatten-js/boolean-op"
    import {Polygon, point} from "@flatten-js/core"
        
    let polygon1 = new Polygon();
    polygon1.addFace([point(200,10), point(100, 300), point(400, 150), point(250, 10)]);

    let polygon2 = new Polygon();
    polygon2.addFace([point(450, 10), point(0, 150), point(300,300), point(600, 300)]);

    let polygon_res = intersect(polygon1, polygon2);
```

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
      - SUBTRACT: remove inner chains from the first polygon and outers chains from the second polygon
      - INTERSECT: remove outer chains from the second polygon
      - Boundary chains with flag OVERLAPPING_OPPOSITE are always removed
6. Restore faces connecting interrupted chains from the first polygon to the correspondent chains from the second polygon

Remember that algorithm relies on the direction of the edges. It can find continuation of the interrupted chain only if edge from the second polygon
is an precise continuation of the edge from the first one. That is why faces that have same meaning (island or hole) should have same orientation
is both polygons.

## Documentation

Documentation may be found here <https://alexbol99.github.io/flatten-boolean-op/index.html>


 
    