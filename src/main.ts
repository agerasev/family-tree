import $ = require("jquery");
import toml = require("toml");
import {Tree} from "./types";
import {Composer} from "./composer";
import {PersonNode} from "./node";

$(function () {
  $.get('data/tree.toml', function (tree_toml) {
    let tree = new Tree(toml.parse(tree_toml));
    console.log(tree);
    let composer = new Composer();
    $(document.body).append(composer.html);
    composer.createNode(tree.persons.get("17e71bf8371fc0696602148257e366ad")!).expandBottom();
  });
});
