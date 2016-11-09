define([
    './specimentools-setup'
], function(
    setup
) {
    "use strict";
    require.config(setup);

    require.config({
        paths: {
            'specimenTools': 'bower_components/specimen-tools/lib'
        }
    });

    return require;
});