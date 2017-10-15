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
        'opentype': 'libs/opentype.js/dist/opentype',
        'Atem-CPS-whitelisting': 'libs/Atem-CPS-whitelisting/lib',
        'Atem-Errors': 'libs/Atem-Errors/lib',
        'Atem-Math-Tools': 'libs/Atem-Math-Tools/lib',
        'Atem-Pen-Case': 'libs/Atem-Pen-Case/lib',
        'require/text': 'libs/requirejs-text/text',
        'specimenTools': 'libs/specimen-tools/lib',
        'rangeslider': 'libs/rangeslider.js/dist/rangeslider',
        'selectric': 'libs/jquery-selectric/public/jquery.selectric',
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
    'specimentools-init',
    'ui-setup'
], function(main, setup) {
    main(window, setup);
});