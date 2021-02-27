import $ = require("jquery");
import toml = require("toml");
import { Composer } from "./display";
import { Tree } from "./data";

$(function () {
  $.get('data/tree.toml', function (tree_toml) {
    let tree = new Tree(toml.parse(tree_toml));
    console.log(tree);
    let composer = new Composer();
    $(document.body).append(composer.html);
    composer.createNode(tree.persons.get("f88c5f4aec7a2a744ee003ac192f82a5")!, 1.0, 1);//.expandBottom();
  });
});
