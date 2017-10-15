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
        'requireLib': 'js/libs/requirejs/require'
    },
    name: "js/main",
    out: "js/bundle.js",
    include: "requireLib"
})