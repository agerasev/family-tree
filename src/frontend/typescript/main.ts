import $ = require("jquery");
import toml = require("toml");
import { Composer } from "./display";
import { Tree } from "./data";
import { SpringLayout } from "./layouts";

$(function () {
  $.get('data/graph.toml', function (tree_toml) {
    let tree = new Tree(toml.parse(tree_toml));
    console.log(tree);
    let composer = new Composer($(document.body), new SpringLayout());
    composer.createNode(tree.persons.get("17e71bf8371fc0696602148257e366ad")!, 0.0, 0);//.expandBottom();
  });
});
