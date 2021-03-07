import $ = require("jquery");
import toml = require("toml");
import { Composer } from "./display";
import { Tree } from "./data";
import { Layout, SpringLayout, WasmLayout } from "./layouts";
import init, { greet } from "./solver";

$(function () {
  $.ajaxSetup ({ cache: false });
  $.get('data/graph.toml', function (tree_toml) {
    $.ajaxSetup ({ cache: true });
    let tree = new Tree(toml.parse(tree_toml));
    console.log(tree);

    let layout = null;
    init("output/solver.wasm")
    .then(_ => {
      greet("WASM");
      return new WasmLayout();
    })
    .catch(_ => {
      console.log("Error loading WASM solver, falling back to JS");
      return new SpringLayout();
    })
    .then((layout: Layout) => {
      let composer = new Composer($(document.body), layout);
      let hash = window.location.hash.substr(1);
      if (!tree.persons.has(hash)) {
        hash = "17e71bf8";
      }
      composer.createNode(tree.persons.get(hash)!, 0.0, 0);//.expandBottom();
    });
  });
});
