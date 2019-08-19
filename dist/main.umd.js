(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@flatten-js/core')) :
    typeof define === 'function' && define.amd ? define(['exports', '@flatten-js/core'], factory) :
    (global = global || self, factory(global['boolean-op'] = {}, global.Flatten));
}(this, function (exports, core) { 'use strict';

    /**
     * Created by Alex Bol on 12/02/2018.
     */

    const NOT_VERTEX = 0;
    const START_VERTEX = 1;
    const END_VERTEX = 2;

    // const INSIDE = Flatten.INSIDE;
    // const OUTSIDE = Flatten.OUTSIDE;
    // const BOUNDARY = Flatten.BOUNDARY;
    // const OVERLAP_SAME = Flatten.OVERLAP_SAME;
    // const OVERLAP_OPPOSITE = Flatten.OVERLAP_OPPOSITE;

    const BOOLEAN_UNION = 1;
    const BOOLEAN_INTERSECT = 2;
    const BOOLEAN_SUBTRACT = 3;


    /**
     * Unify two polygons polygons and returns new polygon. <br/>
     * Point belongs to the resulted polygon if it belongs to the first OR to the second polygon
     * @param {Flatten.Polygon} polygon1 - first operand
     * @param {Flatten.Polygon} polygon2 - second operand
     * @returns {Flatten.Polygon}
     */
    function unify(polygon1, polygon2) {
        let res_poly = booleanOpBinary(polygon1, polygon2, BOOLEAN_UNION);
        return res_poly;
    }

    /**
     * Subtract second polygon from the first and returns new polygon
     * Point belongs to the resulted polygon if it belongs to the first polygon AND NOT to the second polygon
     * @param {Flatten.Polygon} polygon1 - first operand
     * @param {Flatten.Polygon} polygon2 - second operand
     * @returns {Flatten.Polygon}
     */
    function subtract(polygon1, polygon2) {
        let wrk_poly = polygon2.clone();
        let wrk_poly_reversed = wrk_poly.reverse();
        let res_poly = booleanOpBinary(polygon1, wrk_poly_reversed, BOOLEAN_SUBTRACT);
        return res_poly;
    }

    /**
     * Intersect two polygons and returns new polygon
     * Point belongs to the resultes polygon is it belongs to the first AND to the second polygon
     * @param {Flatten.Polygon} polygon1 - first operand
     * @param {Flatten.Polygon} polygon2 - second operand
     * @returns {Flatten.Polygon}
     */
    function intersect(polygon1, polygon2) {
        let res_poly = booleanOpBinary(polygon1, polygon2, BOOLEAN_INTERSECT);
        return res_poly;
    }

    // function booleanOp(operands)
    // {
    //     let res_poly = new Polygon();
    //     for (let [wrk_poly, op] of operands) {
    //         res_poly = booleanOpBinary(res_poly, wrk_poly, op);
    //     }
    //     return res_poly;
    // }

    function booleanOpBinary(res_poly, wrk_poly, op)
    {
        return clip(res_poly, wrk_poly, op);
    }

    function clip(polygon1, polygon2, op)
    {
        let res_poly = polygon1.clone();
        let wrk_poly = polygon2.clone();

        // get intersection points
        let intersections = getIntersections(res_poly, wrk_poly);

        // sort intersection points
        sortIntersections(intersections);

        // split by intersection points
        splitByIntersections(res_poly, intersections.int_points1_sorted);
        splitByIntersections(wrk_poly, intersections.int_points2_sorted);

        // filter duplicated intersection points
        filterDuplicatedIntersections(intersections);

        // keep not intersected faces for further remove and merge
        let notIntersectedFacesRes = getNotIntersectedFaces(res_poly, intersections.int_points1);
        let notIntersectedFacesWrk = getNotIntersectedFaces(wrk_poly, intersections.int_points2);

        // calculate inclusion flag for not intersected faces
        calcInclusionForNotIntersectedFaces(notIntersectedFacesRes, wrk_poly);
        calcInclusionForNotIntersectedFaces(notIntersectedFacesWrk, res_poly);

        // initialize inclusion flags for edges incident to intersections
        initializeInclusionFlags(intersections.int_points1);
        initializeInclusionFlags(intersections.int_points2);

        // calculate inclusion flags only for edges incident to intersections
        calculateInclusionFlags(intersections.int_points1, polygon2);
        calculateInclusionFlags(intersections.int_points2, polygon1);

        // TODO: fix bondary conflicts

        // Set overlapping flags for boundary chains: SAME or OPPOSITE
        setOverlappingFlags(intersections);

        // remove not relevant chains between intersection points
        removeNotRelevantChains(res_poly, op, intersections.int_points1_sorted, true);
        removeNotRelevantChains(wrk_poly, op, intersections.int_points2_sorted, false);

        // remove not relevant not intersected faces from res_polygon and wrk_polygon
        // if op == UNION, remove faces that are included in wrk_polygon without intersection
        // if op == INTERSECT, remove faces that are not included into wrk_polygon
        removeNotRelevantNotIntersectedFaces(res_poly, notIntersectedFacesRes, op, true);
        removeNotRelevantNotIntersectedFaces(wrk_poly, notIntersectedFacesWrk, op, false);

        // add edges of wrk_poly into the edge container of res_poly
        copyWrkToRes(res_poly, wrk_poly, op, intersections.int_points2);

        // swap links from res_poly to wrk_poly and vice versa
        swapLinks(res_poly, wrk_poly, intersections);

        // remove old faces
        removeOldFaces(res_poly, intersections.int_points1);
        removeOldFaces(wrk_poly, intersections.int_points2);

        // restore faces
        restoreFaces(res_poly, intersections.int_points1, intersections.int_points2);
        restoreFaces(res_poly, intersections.int_points2, intersections.int_points1);

        // merge relevant not intersected faces from wrk_polygon to res_polygon
        // mergeRelevantNotIntersectedFaces(res_poly, wrk_poly);

        return res_poly;
    }

    function getIntersections(polygon1, polygon2)
    {
        let intersections = {
            int_points1: [],
            int_points2: []
        };

        // calculate intersections
        for (let edge1 of polygon1.edges) {

            // request edges of polygon2 in the box of edge1
            let resp = polygon2.edges.search(edge1.box);

            // for each edge2 in response
            for (let edge2 of resp) {

                // calculate intersections between edge1 and edge2
                let ip = edge1.shape.intersect(edge2.shape);

                // for each intersection point
                for (let pt of ip) {
                    addToIntPoints(edge1, pt, intersections.int_points1);
                    addToIntPoints(edge2, pt, intersections.int_points2);
                }
            }
        }
        return intersections;
    }

    function addToIntPoints(edge, pt, int_points)
    {
        let id = int_points.length;
        let split = edge.shape.split(pt);
        if (split.length === 0) return;     // Means point does not belong to edge
        let len = 0;
        if (split.length === 1) {           // Edge was not split
            if (edge.shape.start.equalTo(pt)) {
                len = 0;
            } else if (edge.shape.end.equalTo(pt)) {
                len = edge.shape.length;
            }
        } else {                             // Edge was split into to edges
            len = split[0].length;
        }
        let is_vertex = NOT_VERTEX;
        if (core.Utils.EQ(len, 0)) {
            is_vertex |= START_VERTEX;
        }
        if (core.Utils.EQ(len, edge.shape.length)) {
            is_vertex |= END_VERTEX;
        }
        // Fix intersection point which is end point of the last edge
        let arc_length = (is_vertex & END_VERTEX) && edge.next.arc_length === 0 ? 0 : edge.arc_length + len;

        int_points.push({
            id: id,
            pt: pt,
            arc_length: arc_length,
            edge_before: edge,
            edge_after: undefined,
            face: edge.face,
            is_vertex: is_vertex
        });
    }

    function sortIntersections(intersections)
    {
        if (intersections.int_points1.length === 0) return;

        // augment intersections with new sorted arrays
        // intersections.int_points1_sorted = intersections.int_points1.slice().sort(compareFn);
        // intersections.int_points2_sorted = intersections.int_points2.slice().sort(compareFn);
        intersections.int_points1_sorted = getSortedArray(intersections.int_points1);
        intersections.int_points2_sorted = getSortedArray(intersections.int_points2);
    }

    function getSortedArray(int_points)
    {
        let faceMap = new Map;
        let id = 0;
        // Create integer id's for faces
        for (let ip of int_points) {
            if (!faceMap.has(ip.face)) {
                faceMap.set(ip.face, id);
                id++;
            }
        }
        // Augment intersection points with face id's
        for (let ip of int_points) {
            ip.faceId = faceMap.get(ip.face);
        }
        // Clone and sort
        let int_points_sorted = int_points.slice().sort(compareFn);
        return int_points_sorted;
    }

    function compareFn(ip1, ip2)
    {
        // compare face id's
        if (ip1.faceId < ip2.faceId) {
            return -1;
        }
        if (ip1.faceId > ip2.faceId) {
            return 1;
        }
        // same face - compare arc_length
        if (core.Utils.LT(ip1.arc_length, ip2.arc_length)) {
            return -1;
        }
        if (core.Utils.GT(ip1.arc_length, ip2.arc_length)) {
            return 1;
        }
        return 0;
    }

    function splitByIntersections(polygon, int_points)
    {
        if (!int_points) return;
        for (let int_point of int_points) {
            let edge = int_point.edge_before;

            // recalculate vertex flag: it may be changed after previous split
            if (edge.shape.start.equalTo(int_point.pt)) {
                int_point.is_vertex |= START_VERTEX;
            }
            if (edge.shape.end.equalTo(int_point.pt)) {
                int_point.is_vertex |= END_VERTEX;
            }

            if (int_point.is_vertex & START_VERTEX) {  // nothing to split
                int_point.edge_before = edge.prev;
                int_point.is_vertex = END_VERTEX;
                continue;
            }
            if (int_point.is_vertex & END_VERTEX) {    // nothing to split
                continue;
            }

            let newEdge = polygon.addVertex(int_point.pt, edge);
            int_point.edge_before = newEdge;
        }

        for (let int_point of int_points) {
            int_point.edge_after = int_point.edge_before.next;
        }
    }

    function filterDuplicatedIntersections(intersections)
    {
        if (intersections.int_points1.length < 2) return;

        let do_squeeze = false;

        let int_point_ref1, int_point_ref2;
        let int_point_cur1, int_point_cur2;
        for (let i = 0; i < intersections.int_points1.length; i++) {
            int_point_ref1 = intersections.int_points1[i];
            int_point_ref2 = intersections.int_points2[i];
            if (int_point_ref1.id === -1 && int_point_ref2.id === -1)
                continue;

            for (let j=0; j < intersections.int_points1.length; j++) {
                if (j === i)
                    continue;

                int_point_cur1 = intersections.int_points1[j];
                int_point_cur2 = intersections.int_points2[j];

                if (int_point_cur1.id === -1 && int_point_cur2.id === -1)
                    continue;

                if (core.Utils.EQ(int_point_cur1.arc_length, int_point_ref1.arc_length) &&
                    core.Utils.EQ(int_point_cur2.arc_length, int_point_ref2.arc_length) &&
                    int_point_cur1.faceId === int_point_ref1.faceId &&
                    int_point_cur2.faceId === int_point_ref2.faceId &&
                    int_point_cur1.edge_before === int_point_ref1.edge_before &&
                    int_point_cur1.edge_after === int_point_ref1.edge_after &&
                    int_point_cur2.edge_before === int_point_ref2.edge_before &&
                    int_point_cur2.edge_after === int_point_ref2.edge_after) {
                    int_point_cur1.id = -1;      /* to be deleted */
                    int_point_cur2.id = -1;      /* to be deleted */
                    do_squeeze = true;
                }
            }
        }

        if (do_squeeze) {
            intersections.int_points1 = intersections.int_points1.filter((int_point) => int_point.id >= 0);
            intersections.int_points2 = intersections.int_points2.filter((int_point) => int_point.id >= 0);

            // update id's
            intersections.int_points1.forEach((int_point, index) => int_point.id = index);
            intersections.int_points2.forEach((int_point, index) => int_point.id = index);

            // re-create sorted
            intersections.int_points1_sorted = [];
            intersections.int_points2_sorted = [];
            sortIntersections(intersections);
        }
    }

    function getNotIntersectedFaces(poly, int_points)
    {
        let notIntersected = [];
        for (let face of poly.faces) {
            if (!int_points.find((ip) => ip.face === face)) {
                notIntersected.push(face);
            }
        }
        return notIntersected;
    }

    function calcInclusionForNotIntersectedFaces(notIntersectedFaces, poly2)
    {
        for (let face of notIntersectedFaces) {
            face.first.bv = face.first.bvStart = face.first.bvEnd = undefined;
            face.first.setInclusion(poly2);
        }
    }

    function initializeInclusionFlags(int_points)
    {
        for (let int_point of int_points) {
            int_point.edge_before.bvStart = undefined;
            int_point.edge_before.bvEnd = undefined;
            int_point.edge_before.bv = undefined;
            int_point.edge_before.overlap = undefined;

            int_point.edge_after.bvStart = undefined;
            int_point.edge_after.bvEnd = undefined;
            int_point.edge_after.bv = undefined;
            int_point.edge_after.overlap = undefined;
        }

        for (let int_point of int_points) {
            int_point.edge_before.bvEnd = core.BOUNDARY;
            int_point.edge_after.bvStart = core.BOUNDARY;
        }
    }

    function calculateInclusionFlags(int_points, polygon)
    {
        for (let int_point of int_points) {
            int_point.edge_before.setInclusion(polygon);
            int_point.edge_after.setInclusion(polygon);
        }
    }

    function setOverlappingFlags(intersections)
    {
        let cur_face = undefined;
        let first_int_point_in_face = undefined;
        let next_int_point1 = undefined;
        let num_int_points = intersections.int_points1.length;

        for (let i = 0; i < num_int_points; i++) {
            let cur_int_point1 = intersections.int_points1_sorted[i];

            // Find boundary chain in the polygon1
            if (cur_int_point1.face !== cur_face) {                               // next chain started
                first_int_point_in_face = cur_int_point1;
                cur_face = cur_int_point1.face;
            }

            if (i + 1 === num_int_points) {                                         // last int point in array
                next_int_point1 = first_int_point_in_face;
            } else if (intersections.int_points1_sorted[i + 1].face !== cur_face) {   // last int point in chain
                next_int_point1 = first_int_point_in_face;
            } else {                                                                // not a last point in chain
                next_int_point1 = intersections.int_points1_sorted[i + 1];
            }

            let edge_from1 = cur_int_point1.edge_after;
            let edge_to1 = next_int_point1.edge_before;

            if (!(edge_from1.bv === core.BOUNDARY && edge_to1.bv === core.BOUNDARY))      // not a boundary chain - skip
                continue;

            if (edge_from1 !== edge_to1)                    //  one edge chain    TODO: support complex case
                continue;


            /* Find boundary chain in polygon2 between same intersection points */
            let cur_int_point2 = intersections.int_points2[cur_int_point1.id];
            let next_int_point2 = intersections.int_points2[next_int_point1.id];

            let edge_from2 = cur_int_point2.edge_after;
            let edge_to2 = next_int_point2.edge_before;

            /* if [edge_from2..edge_to2] is not a boundary chain, invert it */
            /* check also that chain consist of one or two edges */
            if (!(edge_from2.bv === core.BOUNDARY && edge_to2.bv === core.BOUNDARY && edge_from2 === edge_to2)) {
                cur_int_point2 = intersections.int_points2[next_int_point1.id];
                next_int_point2 = intersections.int_points2[cur_int_point1.id];

                edge_from2 = cur_int_point2.edge_after;
                edge_to2 = next_int_point2.edge_before;
            }

            if (!(edge_from2.bv === core.BOUNDARY && edge_to2.bv === core.BOUNDARY && edge_from2 === edge_to2))
                continue;                           // not an overlapping chain - skip   TODO: fix boundary conflict

            // Set overlapping flag - one-to-one case
            edge_from1.setOverlap(edge_from2);
        }
    }

    function removeNotRelevantChains(polygon, op, int_points, is_res_polygon)
    {
        if (!int_points) return;
        let cur_face = undefined;
        let first_int_point_in_face_num = undefined;
        let int_point_current;
        let int_point_next;

        for (let i = 0; i < int_points.length; i++) {
            int_point_current = int_points[i];

            if (int_point_current.face !== cur_face) {   // next face started
                first_int_point_in_face_num = i;
                cur_face = int_point_current.face;
            }

            if (cur_face.isEmpty())                // ??
                continue;

            // Get next int point from the same face that current

            // Count how many duplicated points with same <x,y> in "points from" pull ?
            let int_points_from_pull_start = i;
            let int_points_from_pull_num = intPointsPullCount(int_points, i, cur_face);
            let next_int_point_num;
            if (int_points_from_pull_start + int_points_from_pull_num < int_points.length &&
                int_points[int_points_from_pull_start + int_points_from_pull_num].face === int_point_current.face) {
                next_int_point_num = int_points_from_pull_start + int_points_from_pull_num;
            } else {                                         // get first point from the same face
                next_int_point_num = first_int_point_in_face_num;
            }
            int_point_next = int_points[next_int_point_num];

            /* Count how many duplicated points with same <x,y> in "points to" pull ? */
            let int_points_to_pull_start = next_int_point_num;
            let int_points_to_pull_num = intPointsPullCount(int_points, int_points_to_pull_start, cur_face);


            let edge_from = int_point_current.edge_after;
            let edge_to = int_point_next.edge_before;

            if ((edge_from.bv === core.INSIDE && edge_to.bv === core.INSIDE && op === BOOLEAN_UNION) ||
                (edge_from.bv === core.OUTSIDE && edge_to.bv === core.OUTSIDE && op === BOOLEAN_INTERSECT) ||
                ((edge_from.bv === core.OUTSIDE || edge_to.bv === core.OUTSIDE) && op === BOOLEAN_SUBTRACT && !is_res_polygon) ||
                ((edge_from.bv === core.INSIDE || edge_to.bv === core.INSIDE) && op === BOOLEAN_SUBTRACT && is_res_polygon) ||
                (edge_from.bv === core.BOUNDARY && edge_to.bv === core.BOUNDARY && (edge_from.overlap & core.OVERLAP_SAME) && is_res_polygon) ||
                (edge_from.bv === core.BOUNDARY && edge_to.bv === core.BOUNDARY && (edge_from.overlap & core.OVERLAP_OPPOSITE))) {

                polygon.removeChain(cur_face, edge_from, edge_to);

                /* update all points in "points from" pull */
                for (let k = int_points_from_pull_start; k < int_points_from_pull_start + int_points_from_pull_num; k++) {
                    int_point_current.edge_after = undefined;
                }

                /* update all points in "points to" pull */
                for (let k = int_points_to_pull_start; k < int_points_to_pull_start + int_points_to_pull_num; k++) {
                    int_point_next.edge_before = undefined;
                }
            }

            /* skip to the last point in "points from" group */
            i += int_points_from_pull_num - 1;
        }
    }
    function intPointsPullCount(int_points, cur_int_point_num, cur_face)
    {
        let int_point_current;
        let int_point_next;

        let int_points_pull_num = 1;

        if (int_points.length == 1) return 1;

        int_point_current = int_points[cur_int_point_num];

        for (let i = cur_int_point_num + 1; i < int_points.length; i++) {
            if (int_point_current.face != cur_face) {      /* next face started */
                break;
            }

            int_point_next = int_points[i];

            if (!(int_point_next.pt.equalTo(int_point_current.pt) &&
                int_point_next.edge_before === int_point_current.edge_before &&
                int_point_next.edge_after === int_point_current.edge_after)) {
                break;         /* next point is different - break and exit */
            }

            int_points_pull_num++;     /* duplicated intersection point - increase counter */
        }
        return int_points_pull_num;
    }

    function copyWrkToRes(res_polygon, wrk_polygon, op, int_points)
    {
        for (let face of wrk_polygon.faces) {
            for (let edge of face) {
                res_polygon.edges.add(edge);
            }
            // If union - add face from wrk_polygon that is not intersected with res_polygon
            if ( (op === BOOLEAN_UNION || op == BOOLEAN_SUBTRACT) &&
                int_points && int_points.find((ip) => (ip.face === face)) === undefined) {
                res_polygon.addFace(face.first, face.last);
            }
        }
    }

    function swapLinks(res_polygon, wrk_polygon, intersections)
    {
        if (intersections.int_points1.length === 0) return;

        for (let i = 0; i < intersections.int_points1.length; i++) {
            let int_point1 = intersections.int_points1[i];
            let int_point2 = intersections.int_points2[i];

            // Simple case - find continuation on the other polygon

            // Process edge from res_polygon
            if (int_point1.edge_before !== undefined && int_point1.edge_after === undefined) {    // swap need
                if (int_point2.edge_before === undefined && int_point2.edge_after !== undefined) {  // simple case
                    // Connect edges
                    int_point1.edge_before.next = int_point2.edge_after;
                    int_point2.edge_after.prev = int_point1.edge_before;

                    // Fill in missed links in intersection points
                    int_point1.edge_after = int_point2.edge_after;
                    int_point2.edge_before = int_point1.edge_before;
                }
            }
            // Process edge from wrk_polygon
            if (int_point2.edge_before !== undefined && int_point2.edge_after === undefined) {    // swap need
                if (int_point1.edge_before === undefined && int_point1.edge_after !== undefined) {  // simple case
                    // Connect edges
                    int_point2.edge_before.next = int_point1.edge_after;
                    int_point1.edge_after.prev = int_point2.edge_before;

                    // Complete missed links
                    int_point2.edge_after = int_point1.edge_after;
                    int_point1.edge_before = int_point2.edge_before;
                }
            }

            // Continuation not found - complex case
            // Continuation will be found on the same polygon.
            // It happens when intersection point is actually touching point
            // Polygon1
            if (int_point1.edge_before !== undefined && int_point1.edge_after === undefined) {    // still swap need
                for (let int_point of intersections.int_points1_sorted) {
                    if (int_point === int_point1) continue;     // skip same
                    if (int_point.edge_before === undefined && int_point.edge_after !== undefined) {
                        if (int_point.pt.equalTo(int_point1.pt)) {
                            // Connect edges
                            int_point1.edge_before.next = int_point.edge_after;
                            int_point.edge_after.prev = int_point1.edge_before;

                            // Complete missed links
                            int_point1.edge_after = int_point.edge_after;
                            int_point.edge_before = int_point1.edge_before;
                        }
                    }
                }
            }
            // Polygon2
            if (int_point2.edge_before !== undefined && int_point2.edge_after === undefined) {    // still swap need
                for (let int_point of intersections.int_points2_sorted) {
                    if (int_point === int_point2) continue;     // skip same
                    if (int_point.edge_before === undefined && int_point.edge_after !== undefined) {
                        if (int_point.pt.equalTo(int_point2.pt)) {
                            // Connect edges
                            int_point2.edge_before.next = int_point.edge_after;
                            int_point.edge_after.prev = int_point2.edge_before;

                            // Complete missed links
                            int_point2.edge_after = int_point.edge_after;
                            int_point.edge_before = int_point2.edge_before;
                        }
                    }
                }
            }
        }
        // Sanity check that no dead ends left
    }

    function removeOldFaces(polygon, int_points)
    {
        for (let int_point of int_points) {
            polygon.faces.delete(int_point.face);
            int_point.face = undefined;
            if (int_point.edge_before)
                int_point.edge_before.face = undefined;
            if (int_point.edge_after)
                int_point.edge_after.face = undefined;
        }
    }

    function restoreFaces(polygon, int_points, other_int_points)
    {
        // For each intersection point - create new face
        for (let int_point of int_points) {
            if (int_point.edge_before === undefined || int_point.edge_after === undefined)  // completely deleted
                continue;
            if (int_point.face)            // already restored
                continue;

            if (int_point.edge_after.face || int_point.edge_before.face)        // Face already created. Possible case in duplicated intersection points
                continue;

            let first = int_point.edge_after;      // face start
            let last = int_point.edge_before;      // face end;

            let face = polygon.addFace(first, last);

            // Mark intersection points from the newly create face
            // to avoid multiple creation of the same face
            // Face was assigned to each edge of new face in addFace function
            for (let int_point_tmp of int_points) {
                if (int_point_tmp.edge_before && int_point_tmp.edge_after &&
                    int_point_tmp.edge_before.face === face && int_point_tmp.edge_after.face === face) {
                    int_point_tmp.face = face;
                }
            }
            // Mark other intersection points as well
            for (let int_point_tmp of other_int_points) {
                if (int_point_tmp.edge_before && int_point_tmp.edge_after &&
                    int_point_tmp.edge_before.face === face && int_point_tmp.edge_after.face === face) {
                    int_point_tmp.face = face;
                }
            }
        }
    }

    function removeNotRelevantNotIntersectedFaces(polygon, notIntersectedFaces, op, is_res_polygon)
    {
        for (let face of notIntersectedFaces) {
            let rel = face.first.bv;
            if (op === BOOLEAN_UNION && rel === core.INSIDE ||
                op === BOOLEAN_SUBTRACT && rel === core.INSIDE && is_res_polygon ||
                op === BOOLEAN_SUBTRACT && rel === core.OUTSIDE && !is_res_polygon ||
                op === BOOLEAN_INTERSECT && rel === core.OUTSIDE) {

                polygon.deleteFace(face);
            }
        }
    }

    /**
     * Created by Alex Bol on 12/02/2018.
     */

    exports.BOOLEAN_INTERSECT = BOOLEAN_INTERSECT;
    exports.BOOLEAN_SUBTRACT = BOOLEAN_SUBTRACT;
    exports.BOOLEAN_UNION = BOOLEAN_UNION;
    exports.addToIntPoints = addToIntPoints;
    exports.getSortedArray = getSortedArray;
    exports.intersect = intersect;
    exports.removeNotRelevantChains = removeNotRelevantChains;
    exports.removeOldFaces = removeOldFaces;
    exports.restoreFaces = restoreFaces;
    exports.splitByIntersections = splitByIntersections;
    exports.subtract = subtract;
    exports.unify = unify;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
