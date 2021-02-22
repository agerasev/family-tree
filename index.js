$.get('tree.toml', function (data) {
    var config = toml.parse(data);
    console.log(config);
});
