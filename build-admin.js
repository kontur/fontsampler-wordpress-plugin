({
    baseUrl: "./",
    paths: {
        'opentype': 'js/libs/opentype.js/dist/opentype',
        'Atem-CPS-whitelisting': 'js/libs/Atem-CPS-whitelisting/lib',
        'Atem-Errors': 'js/libs/Atem-Errors/lib',
        'Atem-Math-Tools': 'js/libs/Atem-Math-Tools/lib',
        'Atem-Pen-Case': 'js/libs/Atem-Pen-Case/lib',
        'require/text': 'js/libs/requirejs-text/text',
        'specimenTools': 'js/libs/specimen-tools/lib',
        'rangeslider': 'js/libs/rangeslider.js/dist/rangeslider',
        'selectric': 'js/libs/jquery-selectric/public/jquery.selectric',
        'validate': 'bower_components/jquery-validation/dist/jquery.validate',
        'clipboard': 'bower_components/clipboard/dist/clipboard',
        'requireLib': 'js/libs/requirejs/require',
    },
    shim: {
        'rangeslider': {
            deps: ['jquery'],
            exports: 'jQuery.fn.rangeslider'
        },
        'selectric': {
            deps: ['jquery'],
            exports: 'jQuery.fn.selectric'
        }
    },
    name: "admin/js/fontsampler-admin-main",
    out: "admin/js/fontsampler-admin.js",
    include: "requireLib"
})