define(['jquery', 'rangeslider', 'selectric'], function ($) {

    function debounce(fn, debounceDuration) {
        debounceDuration = debounceDuration || 100;
        return function () {
            if (!fn.debouncing) {
                var args = Array.prototype.slice.apply(arguments);
                fn.lastReturnVal = fn.apply(window, args);
                fn.debouncing = true;
            }
            clearTimeout(fn.debounceTimeout);
            fn.debounceTimeout = setTimeout(function () {
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
    function main(wrapper, pubsub) {

        var $wrapper = $(wrapper),
            FSevents = pubsub,
            typeTesterSelector = ".type-tester",
            typeTesterContentSelector = ".type-tester__content",

            events = {
                'activatefont': 'fontsampler.event.activatefont',
                'afterinit': 'fontsampler.event.afterinit',
            };


        function triggerEvent(e) {
            $wrapper.trigger(e);
        }


        // Trigger various events on the wrapper element when they happen internally
        // so that library externals can hook into them
        FSevents.subscribe('activateFont', function () {
            triggerEvent(events.activatefont);
        });


        $wrapper.find(".fontsampler-interface select[name='sample-text']").on('change', function () {
            var $fs = $(this).closest('.fontsampler-interface').find(typeTesterContentSelector),
                val = $(this).val();

            $fs.html(val);
        });

        $wrapper.find('.fontsampler-interface input[type="range"]').each(function () {
            // since specimentools only creates the input element, hand down the RTL 
            // if set on the parent
            $(this).attr("data-direction", $(this).parent().data("direction"));

            $(this).rangeslider({
                // Feature detection the default is `true`.
                // Set this to `false` if you want to use
                // the polyfill also in Browsers which support
                // the native <input type="range"> element.
                polyfill: false,
                onSlide: function (position, element) {
                    debounce(dispatchVanillaEvent(this.$element[0], 'input'), 250);
                    closeOpenOTModal();
                },
                onSlideEnd: function (position, element) {
                    debounce(dispatchVanillaEvent(this.$element[0], 'input'), 250);
                }
            });
        });

        // transform select dropdowns
        $wrapper.find(".fontsampler-interface select").not("[size]").each(function () {
            $(this).selectric({
                onChange: function (element) {
                    debounce(dispatchVanillaEvent(element, 'change'));
                },
                onBeforeOpen: function () {
                    closeOpenOTModal();
                },
                nativeOnMobile: false,
                disableOnMobile: false
            }).closest('.selectric-wrapper').addClass('selectric-wide');
        });


        $wrapper.find(".fontsampler-interface .fontsampler-multiselect").on("click", "button", function (e) {
            var $this = $(this),
                $fs = $this.closest('.fontsampler-interface').find(typeTesterContentSelector),
                val = $this.data("value");

            switch ($this.closest('.fontsampler-multiselect').data("name")) {
                case "alignment":
                    $fs.css("text-align", val);
                    break;

                case "invert":
                    if (val == "positive") {
                        $fs.removeClass("invert");
                        $("body").removeClass("fontsampler-inverted");
                    } else {
                        $fs.addClass("invert");
                        $("body").addClass("fontsampler-inverted");
                    }
                    break;

                case "opentype":
                    // kind of an edge case, but close already open OT modals
                    // of OTHER fontsamplers on the page when opening a new modal
                    $(".fontsampler-opentype-features.shown")
                        .not($this.siblings(".fontsampler-opentype-features"))
                        .removeClass("shown")
                    
                    $this.siblings(".fontsampler-opentype-features").toggleClass("shown")
                    break;
            }

            $this.siblings("button").removeClass("fontsampler-multiselect-selected");
            if ($this.siblings("button").length === 0) {
                $this.toggleClass("fontsampler-multiselect-selected");
            } else {
                $this.addClass("fontsampler-multiselect-selected");
            }
        });

        // add opentype close functionality on any interaction outside the OT modual
        // once it has been opened
        $(document).on("click", closeOpenOTModal);
        function closeOpenOTModal (e) {
            if (typeof e === "undefined") {
                $(".fontsampler-opentype-features.shown").each(function () {
                    $(this).removeClass("shown");
                    $(this).siblings(".fontsampler-opentype-toggle")
                        .removeClass("fontsampler-multiselect-selected");
                });
            } else {
                // if this top most clicked element was inside an OT wrapper
                if ($(e.target).parents(".fontsampler-opentype").length === 0) {
                    //click outside OT modal
                    $wrapper.find(".fontsampler-opentype-features").each(function () {
                        $(this).removeClass("shown");
                        $(this).siblings(".fontsampler-opentype-toggle")
                            .removeClass("fontsampler-multiselect-selected");
                    });
                }
            }
        }

        // prevent line breaks on single line instances
        $wrapper.find(typeTesterContentSelector + '.fontsampler-is-singleline')
            .on("keypress keyup change paste", function (event) {

                if (event.type === "keypress") {
                    // for keypress events immediately block pressing enter for line break
                    if (event.keyCode === 13) {
                        return false;
                    }
                } else {
                    // allow other events, filter any html with $.text() and replace linebreaks
                    // TODO fix paste event from setting the caret to the front of the non-input non-textarea
                    var $this = $(this),
                        text = $this.text(),
                        hasLinebreaks = text.indexOf("\n"),
                        numChildren = $this.children().length;

                    if (-1 !== hasLinebreaks || 0 !== numChildren) {
                        $(this).html(text.replace('/\n/gi', ''));
                    }
                }
            });


        // prevent pasting styled content
        $wrapper.find('.type-tester__content[contenteditable]').on('paste', function(e) {
            e.preventDefault();
            var text = '';
            if (e.clipboardData || e.originalEvent.clipboardData) {
                text = (e.originalEvent || e).clipboardData.getData('text/plain');
            } else if (window.clipboardData) {
                text = window.clipboardData.getData('Text');
            }
            if (document.queryCommandSupported('insertText')) {
                document.execCommand('insertText', false, text);
            } else {
                document.execCommand('paste', false, text);
            }
        });


        // for fontsamplers that only have one font but display the fontpicker label,
        // insert the font family name that opentype.js loaded into the label
        $wrapper.find(".fontsampler-font-label").each(function () {
            var name = $wrapper.data('initial-font-name-overwrite')
                        ? $wrapper.data('initial-font-name-overwrite')
                        : $wrapper.data('initial-font-name');
            $(this).children('label').html(name)
        });


        
        $wrapper.removeClass("on-loading");
        triggerEvent(events.afterinit);
    }

    return main;

});