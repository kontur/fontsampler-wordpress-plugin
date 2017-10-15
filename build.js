({
    baseUrl: "./js",
    paths: {
        'opentype': 'libs/opentype.js/dist/opentype',
        'Atem-CPS-whitelisting': 'libs/Atem-CPS-whitelisting/lib',
        'Atem-Errors': 'libs/Atem-Errors/lib',
        'Atem-Math-Tools': 'libs/Atem-Math-Tools/lib',
        'Atem-Pen-Case': 'libs/Atem-Pen-Case/lib',
        'require/text': 'libs/requirejs-text/text',
        'specimenTools': 'libs/specimen-tools/lib',
        'rangeslider': 'libs/rangeslider.js/dist/rangeslider',
        'selectric': 'libs/jquery-selectric/public/jquery.selectric',
        'requireLib': 'libs/requirejs/require'
    },
    name: "main",
    out: "js/bundle.js",
    include: "requireLib"
})