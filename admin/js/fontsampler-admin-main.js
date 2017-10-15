
// same setup as frontend: /js/main.js
define('jquery', [], function () {
    return jQuery;
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