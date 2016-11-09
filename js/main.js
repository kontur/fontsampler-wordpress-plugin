// since wordpress ships with jquery, we want to refer to this
// dependency without actually having to load it
// note that the wp_enqueue_script has a "hard" dependency for
// jQuery so it indeed is loaded when we define this mock
// which references the then available global jQuery
define('jquery', [], function () {
    return jQuery;
});

require.config({
    'baseUrl': fontsamplerBaseUrl,
    'paths': {
        'opentype': 'bower_components/opentype.js/dist/opentype',
        'Atem-CPS-whitelisting': 'bower_components/Atem-CPS-whitelisting/lib',
        'Atem-Errors': 'bower_components/Atem-Errors/lib',
        'Atem-Math-Tools': 'bower_components/Atem-Math-Tools/lib',
        'Atem-Pen-Case': 'bower_components/Atem-Pen-Case/lib',
        'require/text': 'bower_components/requirejs-text/text',
        'specimenTools': 'bower_components/specimen-tools/lib',
        'rangeslider': 'bower_components/rangeslider.js/dist/rangeslider',
        'selectric': 'bower_components/jquery-selectric/public/jquery.selectric'
    },

    // these shims tell require that when loading these libraries it needs to make
    // sure to FIRST load the "deps", i.e. jquery
    'shim': {
        'rangeslider': {
            deps: ['jquery'],
            exports: 'jQuery.fn.rangeslider'
        },
        'selectric': {
            deps: ['jquery'],
            exports: 'jQuery.fn.selectric'
        }
    }
});

require([
    'js/specimentools-init',
    'js/ui-setup'
], function(main, setup) {
    main(window, setup);
});