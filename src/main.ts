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
    composer.createNode(tree.persons.get("17e71bf8371fc0696602148257e366ad")!).expandBottom();
  });
});
