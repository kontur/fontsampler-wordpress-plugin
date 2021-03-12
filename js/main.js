var Fontsampler = require("../node_modules/fontsampler-js/dist/fontsampler")
var FontsamplerSkin = require("../node_modules/fontsampler-js/dist/fontsampler-skin")

window.addEventListener("load", function() {

    var fontsamplers = document.querySelectorAll(".fontsampler-wrapper")

    // store this method globally, so it can be called again
    window.fontsamplers = []
    window.fontsamplerSetup = function(node) {
        var fonts = window[node.id + "_fonts"],
            options = window[node.id + "_options"]

        console.log("id", node.id)
        console.log("fonts", fonts)
        console.log("options", options)

        if (options && "order" in options) {
            // Any element in order that starts with an # is a custom DOM
            // element with that ID, so get it and replace it into the order
            // for FS JS to parse and render in the Fontsampler UI
            function replace_ids_with_element(value) {
                console.log("value", value, typeof(value))
                // if (typeof(value))
                if (typeof(value) !== "string" && value.length > 0) {
                    return value.map(replace_ids_with_element)
                }

                if (value.substr(0, 1) !== "#") {
                    // Return unchanged otherwise
                    return value 
                }

                try {
                    var el = document.getElementById(value.substr(1))
                    console.log("custom element", el)
                    return el
                } catch (e) {
                    error.log("Custom element " + value + " not found.")
                    return ""
                }
            }

            options.order = options.order.map(replace_ids_with_element)
        }

        var fs = new Fontsampler(node, fonts, options)
        console.log("FS OPTIONS", options)

        FontsamplerSkin(fs)
        fs.init()

        // additional UI setup specific to Fontsampler WP
        var sampleTextSelect = fs.root.querySelector("select[name='sample-text']")
        if (sampleTextSelect) {
            sampleTextSelect.addEventListener("change", function() {
                fs.setText(JSON.parse(sampleTextSelect.value))
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

        function onInvertClicked(e) {
            var selectedClass = "fsjs-button-selected"

            // jquery, bad, sad, mad
            jQuery(e.currentTarget).addClass(selectedClass).siblings().removeClass(selectedClass)
            jQuery(fs.root.querySelector(".fsjs-block-tester .current-font"))
                .toggleClass("invert", e.currentTarget.dataset.choice === "negative")
        }

        var opentypeButton = fs.root.querySelector(".fontsampler-opentype-toggle")
        if (opentypeButton) {
            opentypeButton.addEventListener("click", function(e) {
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