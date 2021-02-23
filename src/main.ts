import $ = require("jquery");
import toml = require("toml");
import {Tree} from "./types";
import {Node} from "./node";

$(function () {
  $.get('data/tree.toml', function (tree_toml) {
    let tree = new Tree(toml.parse(tree_toml));
    console.log(tree);
    for (let [id, person] of tree.persons) {
      let node = new Node(person);
      $(document.body).append(node.html);
    }
  });
});
