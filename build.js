({
    paths: {
        'opentype': 'bower_components/opentype.js/dist/opentype',
        'require/text': 'bower_components/requirejs-text/text',
        'specimenTools': 'bower_components/specimen-tools/lib',
        'rangeslider': 'bower_components/rangeslider.js/dist/rangeslider',
        'selectric': 'bower_components/jquery-selectric/public/jquery.selectric',
        'requireLib': 'bower_components/requirejs/require'
    },
    name: "js/main",
    out: "js/fontsampler.js",
    include: "requireLib",
    namespace: "fs",
    optimize: "none",
})