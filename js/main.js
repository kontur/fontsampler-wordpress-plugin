var Fontsampler = require("../node_modules/fontsampler-js/dist/fontsampler")
var FontsamplerSkin = require("../node_modules/fontsampler-js/dist/fontsampler-skin")

window.addEventListener("load", function () {

    var fontsamplers = document.querySelectorAll(".fontsampler-wrapper")

 
    // store this method globally, so it can be called again
    window.fontsamplers = []
    window.fontsamplerSetup = function (node) {
        // return
        var fs = new Fontsampler(node, false)
            FontsamplerSkin(fs)
            fs.init() 

            // additional UI setup specific to Fontsampler WP
            var sampleTextSelect = fs.root.querySelector("select[name='sample-text']")
            if (sampleTextSelect) {
                sampleTextSelect.addEventListener("change", function () {
                    fs.setText(sampleTextSelect.value)
                })
            }

            var invertButtons = fs.root.querySelectorAll("[data-fsjs-block='invert'] button")
            if (invertButtons) {
                for (var b = 0; b < invertButtons.length; b++) {
                    if (b === 0) {
                        invertButtons[b].className = invertButtons[b].className + " fsjs-button-selected"
                    }
                    invertButtons[b].addEventListener("click", onInvertClicked)
                }
            }
            function onInvertClicked (e) {
                var selectedClass = "fsjs-button-selected"

                // jquery, bad, sad, mad
                jQuery(e.currentTarget).addClass(selectedClass).siblings().removeClass(selectedClass)
                jQuery(fs.root.querySelector(".fsjs-block-tester .current-font"))
                    .toggleClass("invert", e.currentTarget.dataset.choice === "negative")
            }

            var opentypeButton = fs.root.querySelector(".fontsampler-opentype-toggle")
            if (opentypeButton) {
                opentypeButton.addEventListener("click", function (e) {
                    var modal = e.currentTarget.nextElementSibling
                    if (modal.className.indexOf("shown") === -1) {
                        modal.className = modal.className + " shown"
                    } else {
                        modal.className = modal.className.replace("shown", "")
                    }
                })
            }

            window.fontsamplers.push(fs)
    }

    if (fontsamplers.length > 0) {
        for (var i = 0; i < fontsamplers.length; i++) {
            window.fontsamplerSetup(fontsamplers[i])
        }
    }

});