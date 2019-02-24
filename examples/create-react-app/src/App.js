import React, {Component} from 'react';
import {point, Polygon} from "@flatten-js/core";
import {intersect} from "@flatten-js/boolean-op";

class App extends Component {

    componentDidMount() {
        let polygon1 = new Polygon();
        polygon1.addFace([point(200,10), point(100, 300), point(400, 150), point(250, 10)]);

        let polygon2 = new Polygon();
        polygon2.addFace([point(450, 10), point(0, 150), point(300,300), point(600, 300)]);

        let polygon_res = intersect(polygon1, polygon2);

        document.getElementById("stage").innerHTML = polygon1.svg() + polygon2.svg() +
            polygon_res.svg({"fill":"lightgreen"});
    }

    render() {
        return <h1>Hello Flatten World!</h1>;
    }
}

export default App;
