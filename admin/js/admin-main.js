
// same setup as frontend: /js/main.js
define('jquery', [], function () {
    return jQuery;
});

require([
    'js/specimentools-init',
    'js/ui-setup',

    'admin/js/admin-ui',
    'admin/js/admin-layout', 
    'admin/js/admin-upload', // for uploading images for the UI icons 
    'admin/js/admin-font-upload'
], function (init, fontsamplerUI, adminUI, adminLayout, adminUpload, adminFontupload) {
    // init any fontsampler instance on the page, i.e. when editing a fontsampler and
    // there is a preview layout rendered at the bottom
    window.fontsamplerSetup = function () {
        init(window, fontsamplerUI);
    };
    
    window.fontsamplers = init(window, fontsamplerUI);
    
    // in the adminUI the font upload instantiates a specimentools for uploaded fonts
    // but doesn't render anything; just used for extracting the font name from the OTF
    adminUI(adminFontupload, init);

    // dealing with the layout in the fontsampler creation form we also need to render the 
    // fetched preview fontsampler instance, so pass in fontsamplerUI to init it
    adminLayout(init, fontsamplerUI); // pass in specimentools (init) so we can re-init after ajax update

    // init the WP ajax upload for image uplaods in the admin forms
    adminUpload();
});