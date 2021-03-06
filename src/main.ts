import $ = require("jquery");
import toml = require("toml");
import { Composer } from "./display";
import { Tree } from "./data";
import { WasmLayout } from "./layouts";
import init, { greet } from "./solver";

$(function () {
  init("output/solver.wasm").then(_ => {
    greet("WASM");
    $.get('data/graph.toml', function (tree_toml) {
      let tree = new Tree(toml.parse(tree_toml));
      console.log(tree);
      let composer = new Composer($(document.body), new WasmLayout());
      composer.createNode(tree.persons.get("17e71bf8")!, 0.0, 0);//.expandBottom();
    });
  });
});
