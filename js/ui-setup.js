define(['jquery', 'js/selection', 'rangeslider', 'selectric'], function ($, selection) {

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
    function main(wrapper, pubsub, fontsData) {

        var $wrapper = $(wrapper),
            FSevents = pubsub,
            typeTesterSelector = ".type-tester",
            typeTesterContentSelector = ".type-tester__content",

            events = {
                'activatefont':        'fontsampler.event.activatefont',
                'afterinit':           'fontsampler.event.afterinit',
                'activateopentype':    'fontsampler.event.activateopentype',
                'openedopentype':      'fontsampler.event.openedopentype',
                'activatealignment':   'fontsampler.event.activatealignment',
                'activateinvert':      'fontsampler.event.activateinvert',
                'activatefontpicker':  'fontsampler.event.activatefontpicker',
                'activatesampletexts': 'fontsampler.event.activatesampletexts', 
                'changefontsize':      'fontsampler.event.changefontsize',
                'changelineheight':    'fontsampler.event.changelineheight',
                'changeletterspacing': 'fontsampler.event.changeletterspacing',
                'notdef': 'fontsampler.event.notdef'
            },

            notdef = parseInt($wrapper.find(typeTesterContentSelector).data("notdef"));

        if (typeof fontsData !== "undefined") {
            var currentFontIndex = 0,
            currentFontGlyphUnicodes = getFontGlyphs(currentFontIndex);
        }


        function getFontGlyphs(fontIndex) {
            var glyphs = fontsData._data[currentFontIndex].font.glyphs.glyphs,
                glyphsArray = [];

            // glyphs is an array-like object with {0: contents, 1: contents ...} 
            // for each glyph
            for (var index in glyphs) {
                var glyph = glyphs[index];
                // if (typeof glyph.name !== "undefined" && glyph.name === ".notdef") {
                //     notdefGlyph = glyph;
                // }
                if (typeof glyph.unicode !== "undefined") {
                    glyphsArray.push( glyph.unicode );
                }
            }

            return glyphsArray;
        }


        /**
         * Listen to keypress events and crosscheck current font for existiance
         * of pressed glyph's unicode
         */
        $wrapper.find(".type-tester__content").on("input propertychange", highlightNotdef);

        // call once on load
        highlightNotdef();

        function highlightNotdef() {
            if (!currentFontGlyphUnicodes) {
                return;
            }
            var $input = $wrapper.find(".type-tester__content"),
                text = $input.text(),
                newText = [],
                cursor = selection.getCaret($input[0]),
                cursorEnd = cursor;

            // 0 = do nothing
            // 1 = highlight (fallback)
            // 2 = notdef (font or fallback)
            // 3 = block
            if (notdef) {
                for (var i=0; i<text.length; i++) {
                    if (currentFontGlyphUnicodes.indexOf( text.charCodeAt(i) ) === -1) {
                        switch (notdef) {
                            case 1:
                                newText.push("<span class='fontsampler-glyph-highlight'>" + text[i] + "</span>");
                                break;

                            case 2:
                                newText.push("<span class='fontsampler-glyph-notdef'>\uFFFF</span>");
                                break;

                            case 3:
                                cursorEnd = cursor -1;
                                break;
                        }
                        triggerEvent(events.notdef);
                    } else {
                        newText.push(text[i]);
                    }
                }
                $input.html(newText.join(""));
                selection.setCaret($input[0], cursor, cursorEnd);
            }
        }


        function triggerEvent(e) {
            $wrapper.trigger(e);
        }


        // Trigger various events on the wrapper element when they happen internally
        // so that library externals can hook into them
        FSevents.subscribe('activateFont', function (fontIndex) {
            currentFontIndex = fontIndex;
            currentFontGlyphUnicodes = getFontGlyphs( currentFontIndex );
            highlightNotdef();
            triggerEvent(events.activatefont);
        });


        // language switcher to activate locl features
        $wrapper.find(".fontsampler-interface select[name='locl-select']").on("change", function () {
            var $tester = $(this).closest(".fontsampler-interface").find(".type-tester__content"),
                val = $(this).val();

            if (val) {
                $tester.attr("lang", $(this).val());
            } else {
                $tester.removeAttr("lang");
            }
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
                    try {
                        var block = this.$element.closest(".fontsampler-ui-block").data("block");
                        triggerEvent(events[ "change" + block ], [this.value]);
                    } catch (error) {
                        console.warn(error);
                    }
                }
            });
        });

        // transform select dropdowns
        $wrapper.find(".fontsampler-interface select").not("[size]").each(function () {
            $(this).selectric({
                onChange: function (element) {
                    debounce(dispatchVanillaEvent(element, 'change'));
                },
                onBeforeOpen: function (element, selectric) {
                    closeOpenOTModal();
                    try {
                        var block = selectric.$element.closest(".fontsampler-ui-block").data("block");
                        triggerEvent(events["activate" + block], [selectric]);
                    } catch (error) {
                        console.warn(error);
                    }
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
                    triggerEvent(events.activatealignment, [val]);
                    $fs.css("text-align", val);
                    break;

                case "invert":
                    triggerEvent(events.activateinvert, [val]);
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
                        .removeClass("shown");
                    
                    triggerEvent(events.activateopentype, [$this.siblings(".fontsampler-opentype-features")]);
                    $this.siblings(".fontsampler-opentype-features").toggleClass("shown");
                    triggerEvent(events.openedopentype, [$this.siblings(".fontsampler-opentype-features")]);

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

                    if (-1 !== hasLinebreaks) {
                        $(this).html(text.replace('/\n/gi', ''));
                        selection.setCaret($(this)[0], $(this).text().length, 0);
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
            var name = $wrapper.data('initial-font-name-overwrite') ? 
                       $wrapper.data('initial-font-name-overwrite') : 
                       $wrapper.data('initial-font-name');
            $(this).children('label').html(name);
        });


        
        $wrapper.removeClass("on-loading");
        triggerEvent(events.afterinit);
    }

    return main;

});