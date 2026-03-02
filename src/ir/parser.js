"use strict";
/*
Parser for converting raw markdown strings and mapping them to the IR node it represents
 */
Object.defineProperty(exports, "__esModule", { value: true });
var ts_results_1 = require("ts-results");
function parseMarkdownToIR(markdown) {
    var temp = true;
    var nodes = [];
    if (temp) {
        return (0, ts_results_1.Ok)(nodes);
    }
    else {
        return (0, ts_results_1.Err)(new Error("Can not parse markdown"));
    }
}
// function getHeader(line: string): IRNode {
//     // let headerNode: HeaderNode
//     // headerNode.level = //number of #
//     // headerNode.content = // everything after #
//     // headerNode.kind = //is already set
//     // return headerNode
//     // //
//     // const
// } 
var line = "###This is a header";
var match = line.match("###");
console.log(match);
