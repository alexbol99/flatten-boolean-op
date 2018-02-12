# Boolean operations on polygons

Flatten-boolean-op is a javascript library performing fast and reliable boolean operations on polygons.
It supports all basic operations on polygons:

* union
* intersection
* subtraction

## Installation

  npm install flatten-boolean-op --save
  
## Dependencies

Flatten-boolean-op depends on the **flatten-js** 2d geometry library (https://github.com/alexbol99/flatten-js)

## Usage

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
    
    // apply boolean operation union
    let poly = union(poly1, poly2);   
    
    console.log(poly.faces.size);           // expected 1
    console.log(poly.edges.size);           // expected 8
```
