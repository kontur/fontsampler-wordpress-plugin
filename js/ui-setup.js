define(['jquery', 'rangeslider', 'selectric'], function($) {

    function debounce(fn, debounceDuration) {
        debounceDuration = debounceDuration || 100;
        return function() {
            if (!fn.debouncing) {
                var args = Array.prototype.slice.apply(arguments);
                fn.lastReturnVal = fn.apply(window, args);
                fn.debouncing = true;
            }
            clearTimeout(fn.debounceTimeout);
            fn.debounceTimeout = setTimeout(function(){
                fn.debouncing = false;
            }, debounceDuration);
            return fn.lastReturnVal;
        };
    }

    /**
     * Workaround to dispatch a native event instead of relying
     * on the plugin's jquery type of event
     *
     * @param element: DOM node to trigger the event on
     * @param type: String with event type
     */
    function dispatchVanillaEvent(element, type) {
        var evt = document.createEvent('HTMLEvents');
        evt.initEvent(type, true, true);
        element.dispatchEvent(evt);
    }

    /**
     * setup function for all those UI components and interactions
     * that require jquery
     */
    function main() {
        var typeTesterSelector = ".type-tester",
            typeTesterContentSelector = ".type-tester__content";

        $(".fontsampler-interface select[name='sample-text']").on('change', function () {
            var $fs = $(this).closest('.fontsampler-interface').find(typeTesterContentSelector),
                val = $(this).val();

            $fs.html(val);
        });

        $('.fontsampler-interface input[type="range"]').rangeslider({
            // Feature detection the default is `true`.
            // Set this to `false` if you want to use
            // the polyfill also in Browsers which support
            // the native <input type="range"> element.
            polyfill: false,
            onSlide: function (position, element) {
                debounce(dispatchVanillaEvent(this.$element[0], 'input'), 250);
            },
            onSlideEnd: function (position, element) {
                debounce(dispatchVanillaEvent(this.$element[0], 'input'), 250);
            }
        });

        // transform select dropdowns
        $(".fontsampler-interface select").not("[size]").each(function () {
            $(this).selectric({
                onChange: function (element) {
                    debounce(dispatchVanillaEvent(element, 'change'));
                }
            }).closest('.selectric-wrapper').addClass('selectric-wide');
        });


        $(".fontsampler-multiselect").on("click", "button", function () {
            var $fs = $(this).closest('.fontsampler-interface').find(typeTesterContentSelector),
                val = $(this).data("value");

            switch ($(this).closest('.fontsampler-multiselect').data("name")) {
                case "alignment":
                    $fs.css("text-align", val);
                    break;

                case "invert":
                    if (val == "positive") {
                        $fs.removeClass("invert");
                    } else {
                        $fs.addClass("invert");
                    }
                    break;
            }

            $(this).siblings("button").removeClass("fontsampler-multiselect-selected");
            $(this).addClass("fontsampler-multiselect-selected");
        });


        $(".fontsampler-toggle").on("click", function () {
            var $this = $(this),
                isOn = $this.hasClass("fontsampler-toggle-on"),
                feature = $this.data("feature"),
                $fs = $(this).closest('.fontsampler-interface').find(typeTesterContentSelector);

            $this.toggleClass("fontsampler-toggle-on");

            if (isOn) {
                $fs.fontSampler("disableOTFeature", feature);
            } else {
                $fs.fontSampler("enableOTFeature", feature);
            }
        });


        $(".fontsampler-opentype-toggle").on("click", function () {
            $(this).siblings(".fontsampler-opentype-features").toggleClass("shown");
        });
        $(".fontsampler-opentype-features").on("click", "button", function () {
            $(this).closest(".fontsampler-opentype-features").removeClass("shown");
        });
    }

    return main;

});