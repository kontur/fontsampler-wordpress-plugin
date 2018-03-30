({
    paths: {
        'opentype': 'bower_components/opentype.js/dist/opentype',
        'require/text': 'bower_components/requirejs-text/text',
        'specimenTools': 'bower_components/specimen-tools/lib',
        'rangeslider': 'bower_components/rangeslider.js/dist/rangeslider',
        'selectric': 'bower_components/jquery-selectric/public/jquery.selectric',
        'validate': 'bower_components/jquery-validation/dist/jquery.validate',
        'fontsampler': 'bower_components/jquery-fontsampler/dist/jquery.fontsampler',
        'requireLib': 'bower_components/requirejs/require',
    },
    name: "admin/js/admin-main",
    out: "admin/js/fontsampler-admin.js",
    include: "requireLib",
    namespace: "fs",
    optimize: "none",
})