// same setup as frontend: /js/main.js
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
        'validate': 'js/libs/jquery-form-validator/form-validator/jquery.form-validator',
        'clipboard': 'js/libs/clipboard/dist/clipboard',
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
        },
        'validate': {
            deps: ['jquery'],
            exports: 'jQuery.fn.validate'
        },
    }
});

require([
    'js/specimentools-init',
    'admin/js/fontsampler-admin-ui',
    'admin/js/fontsampler-admin-layout',
    'admin/js/fontsampler-admin-upload',
    'admin/js/fontsampler-admin-font-upload',
    'js/ui-setup'
], function (specimentools, ui, layout, upload, fontupload, setup) {
    specimentools(window);
    ui(fontupload, specimentools);
    layout(specimentools, setup); // pass in specimentools so we can re-init after ajax update

    upload();
    //fontupload(specimentools);
});