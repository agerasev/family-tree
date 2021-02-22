import $ = require("jquery");
import toml = require("toml");

$(function () {
  $.get('data/tree.toml', function (tree_toml) {
    let tree = toml.parse(tree_toml);
    console.log(tree);
  });
  $('#main').append('<svg><path d="M 0 0 L 100 100" style="stroke: #000; stroke-width: 5px;" /></svg>');
});
