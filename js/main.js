// since wordpress ships with jquery, we want to refer to this
// dependency without actually having to load it
// note that the wp_enqueue_script has a "hard" dependency for
// jQuery so it indeed is loaded when we define this mock
// which references the then available global jQuery
define('jquery', [], function () {
    return jQuery;
});

require([
    'js/specimentools-init',
    'js/ui-setup'
], function(init, fontsamplerUI) {
    // store this method globally, so it can be called again
    window.fontsamplerSetup = function () {
        init(window, fontsamplerUI);
    } ;
    
    window.fontsamplers = init(window, fontsamplerUI);
});