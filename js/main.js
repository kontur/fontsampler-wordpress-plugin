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
        'opentype': 'js/libs/opentype.js/dist/opentype',
        'Atem-CPS-whitelisting': 'js/libs/Atem-CPS-whitelisting/lib',
        'Atem-Errors': 'js/libs/Atem-Errors/lib',
        'Atem-Math-Tools': 'js/libs/Atem-Math-Tools/lib',
        'Atem-Pen-Case': 'js/libs/Atem-Pen-Case/lib',
        'require/text': 'js/libs/requirejs-text/text',
        'specimenTools': 'js/libs/specimen-tools/lib',
        'rangeslider': 'js/libs/rangeslider.js/dist/rangeslider',
        'selectric': 'js/libs/jquery-selectric/public/jquery.selectric',
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
    // store this method globally, so it can be called again
    window.fontsamplerSetup = function () {
        main(window, setup);
    }
    main(window, setup);
});