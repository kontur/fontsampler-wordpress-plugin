/**
 * All the jquery components dealing with manipulating the
 * various admin side interactions
 */
define(['jquery', 'rangeslider', 'selectric', 'validate', 'fontsampler'], 
    function ($, r, s, v, c, fs) {

    $.validate = v;
    $.fontSampler = fs;

    function main(fontupload, specimentools) {

        // enable frontend side form validation
        $.validate({
            form: ".fontsampler-validate",
            modules: 'file',
        });


        $("body").on("change keyup blur", "input.fontsampler-input-warning", function () {
            var $this = $(this);

            if ($this.val() !== "") {
                $this.removeClass("fontsampler-input-warning");
            }
        });

        // todo limit amount of select options to the number of font sets / don't allow duplicates on frontend side
        // duplicate inputs are going to be filtered out on db entry
        $("#fontsampler-admin").on("click", ".fontsampler-fontset-remove", function (e) {
            e.preventDefault();
            if ($("#fontsampler-fontset-list li").length > 1) {
                $(this).parent("li").remove();

                // the the row with the current default font gets delete, move the default to the first font
                if ($("#fontsampler-fontset-list input[name=initial_font]:checked").length === 0) {
                    $("#fontsampler-fontset-list li:first input[name=initial_font]").attr("checked", "checked");
                }
            } else {
                console.log("Nope. Can't delete last picker");
            }
            $("#fontsampler-fontset-list").sortable("refresh");
            updateFontsOrder();
            updateInlineFontIndexes();
        });


        /**
         * Adding a new fontsampler select box with prefilled existing fonts
         */
        $("#fontsampler-edit-sample").on("click", ".fontsampler-fontset-add", function (e) {
            e.preventDefault();
            var $clone = $("#fontsampler-admin-fontpicker-placeholder").clone();
            $clone.find("input[name=initial_font]").removeAttr("checked").val("0");
            $clone.find("span.fontsampler-initial-font").removeClass('selected');
            $clone.appendTo("#fontsampler-fontset-list");

            $("#fontsampler-fontset-list li:last option[selected='selected']").removeAttr('selected');
            $("#fontsampler-fontset-list").sortable("refresh");

            updateFontsOrder();
        });


        /**
         * On updating the select font dropdown in the fontsampler font section, update the input that send this font's ID
         * if it is selected as the default font
         */
        $("#fontsampler-fontset-list").on("change", "select[name='font_id[]']", function () {
            $(this).siblings(".fontsampler-initial-font-selection").find("input[name=initial_font]").val($(this).val());
        });


        $("#fontsampler-fontset-list").on("change", "input[name=initial_font]", function () {
            $("#fontsampler-fontset-list span.fontsampler-initial-font").removeClass("selected");
            $("#fontsampler-fontset-list input[name=initial_font]:checked").siblings("span.fontsampler-initial-font").addClass("selected");
        });


        $("#fontsampler-admin").on("change", "#fontsampler-fontset-list select", function () {
            $(this).siblings("input[name=initial_font]").val($(this).val());
            updateFontsOrder();
        });


        // allow sorting multiple fonts in a fontsampler
        $("#fontsampler-fontset-list").sortable({
            handle: ".fontsampler-fontset-sort-handle",
            stop: updateFontsOrder
        });


        /**
         * Creating a new inline font upload form inside the form for creating a fontsampler
         */
        $(".fontsampler-fontset-create-inline").on("click", function () {
            var $clone = $("#fontsampler-fontset-inline-placeholder").clone().removeAttr("id"),
                $fontsList = $("#fontsampler-fontset-list");

            // clear any font name from previous row
            $clone.find("input[name='fontname[]']").val("")

            $fontsList.append($clone);
            updateInlineFontIndexes();
            updateFontsOrder();

            fontupload(specimentools);

            return false;
        });

        // trigger once, for pages where the fontupload is not ajax but DOM elements are ready on load
        fontupload(specimentools);


        /**
         * Update the input field fonts_order with a comma separated list of fonts, in the order they are sorted
         * Note: newly created inline fontsets are marked in this list as "inline_ID"
         */
        function updateFontsOrder() {
            var order = $("#fontsampler-fontset-list").find("select[name='font_id[]'], input.inline_font_id").map(function () {
                return $(this).val();
            }).get().join();
            $("input[name=fonts_order]").val(order);
        }


        /**
         * Update the indexes of all file upload inputs of any inline from upload forms, so that they start with 0 index
         * and have no gaps in the name attribute
         */
        function updateInlineFontIndexes() {
            var $fontsList = $("#fontsampler-fontset-list"),
                $placeholder = $("#fontsampler-fontset-inline-placeholder");

            // for the actual font list, go through all now created fontsets and number all their containing
            // file inputs them 0 index based
            $fontsList.find(".fontsampler-fontset-inline").each(function (index, elem) {
                var $this = $(this);

                // set the entire set of file inputs with woff2, woff, etc to the right index of this inserted placeholder
                $this.find("input[type=file]").each(function () {
                    var currentName = $(this).attr("name");
                    $(this).attr("name", $(this).attr("name").substring(0, currentName.lastIndexOf("_") + 1) + index);
                });

                // to each of those fontsets add 'inline_x' to their hidden inline_font_id
                // this is used in updateFontsOrder to save a placeholder position of that particular font for processing
                $this.find("input.inline_font_id").each(function () {
                    $(this).val('inline_' + index);
                });

                // update the radio for setting this font as default for this fontsampler to include a placeholder value
                // so it can be replaced after upload
                $this.find("input[name=initial_font]").val('inline_' + index);
            });

            // in the actual placeholder form, remove the index from the file input, so it doesn't get sent along (at least
            // not as woff_0 etc, which would overwrite the first uploaded fontset's files as empty
            $placeholder.find("input[type=file]").each(function () {
                var currentName = $(this).attr("name");
                $(this).attr("name", $(this).attr("name").substring(0, currentName.lastIndexOf("_") + 1));
            });
        }


        isSlideEvent = true;
        // setting sliders
        $('#fontsampler-admin input[type="range"]').rangeslider({
            // Feature detection the default is `true`.
            // Set this to `false` if you want to use
            // the polyfill also in Browsers which support
            // the native <input type="range"> element.
            polyfill: false,
            onSlide: function (position, value) {
                var $input = this.$element.closest("label").find(".current-value"),
                    $slider = this.$element;

                if (isSlideEvent) {
                    setSlider($slider, $input, parseInt(value), false);
                    isSlideEvent = true;
                }
            }
        });

        
        var keyupCB = null;
        $("#fontsampler-admin input.current-value").on("keyup", function () {
            var $input = $(this),
                $slider = $input.closest("label").find("input[name='" + $input.data("name") + "']");

            clearTimeout(keyupCB);
            keyupCB = setTimeout(function () {            
                setSlider($slider, $input, parseInt($input.val()), true);
                clearTimeout(keyupCB);
            }, 250);
        });

        function setSlider($slider, $input, val, isInputEvent) {
            var clamped = Math.min(Math.max(val, $slider.attr("min")), $slider.attr("max")),
                constraints = getSliderConstraints($slider, isInputEvent),
                type = $slider.data("type");

            if (["min", "initial", "max"].indexOf(type) === -1) {
                return;
            }

            $slider.closest(".fontsampler-options-row-values").siblings(".fontsampler-radio").find("input[type='radio']").attr("checked", "checked");

            switch (type) {
                case "min":
                    if (clamped < constraints.min) {
                        val = constraints.min;
                    }
                    if (val > constraints.ini) {
                        val = constraints.ini;
                    }
                break;

                case "initial":
                    if (clamped < constraints.min) {
                        val = constraints.min;
                    }
                    if (clamped > constraints.max) {
                        val = constraints.max;
                    }
                break;

                case "max":
                    if (clamped > constraints.max) {
                        val = constraints.max
                    }
                    if (val < constraints.ini) {
                        val = constraints.ini;
                    }
                break;
            }

            isSlideEvent = isInputEvent ? true : false;
            $input.val(val);
            $slider.val(val).change();
                        
        }

        function getSliderConstraints($slider, isInputEvent) {
            var group = $slider.data("group");

            // only apply to the three 3-part sliders:
            if (["fontsize", "lineheight", "letterspacing"].indexOf(group) === -1) {
                return true;
            }

            var min_use_default = parseInt($("input[name='" + group + "_min_use_default']:checked").val()) === 1,
                min_default = parseInt($("input[name='" + group + "_min_use_default'][value='1']").siblings(".settings-description").find(".fontsampler-default-value").html()),
                min_slider = parseInt($("input[name='"+ group+ "_min']").val()),
                min_input = parseInt($("input[data-name='" + group + "_min").val()),
                min = min_use_default ? min_default : (isInputEvent === true ? min_input : min_slider),

                ini_use_default = parseInt($("input[name='" + group + "_initial_use_default']:checked").val()) === 1,
                ini_default = parseInt($("input[name='" + group + "_initial_use_default'][value='1']").siblings(".settings-description").find(".fontsampler-default-value").html()),
                ini_slider = parseInt($("input[name='"+ group+ "_initial']").val()),
                ini_input = parseInt($("input[data-name='" + group + "_initial").val()),
                ini = ini_use_default ? ini_default : (isInputEvent === true ? ini_input : ini_slider),

                max_use_default = parseInt($("input[name='" + group + "_max_use_default']:checked").val()) === 1,
                max_default = parseInt($("input[name='" + group + "_max_use_default'][value='1']").siblings(".settings-description").find(".fontsampler-default-value").html()),
                max_slider = parseInt($("input[name='"+ group+ "_max']").val()),
                max_input = parseInt($("input[data-name='" + group + "_max").val()),
                max = max_use_default ? max_default : (isInputEvent === true ? max_input : max_slider);
            
            return {
                min: min,
                ini: ini,
                max: max
            }
        }


        // interface
        $("#fontsampler-admin .form-settings input[type=range]").on('change, input', function () {
            var $display = $(this).closest('label').find('code.current-value'),
                val = $(this).val();

            $display.html(val);
        });


        $(".fontsampler-preview").fontSampler();


        //Colour picker
        $('.color-picker').wpColorPicker({
            color: false,
            mode: 'hsl',
            controls: {
                horiz: 's', // horizontal defaults to saturation
                vert: 'l', // vertical defaults to lightness
                strip: 'h' // right strip defaults to hue
            },
            hide: true, // hide the color picker by default
            border: false, // draw a border around the collection of UI elements
            target: false, // a DOM element / jQuery selector that the element will be appended within. Only used when called on an input.
            width: 200, // the width of the collection of UI elements
            palettes: true // show a palette of basic colors beneath the square.
        });


        // update the script writing direction on selecting an option
        $("#fontsampler-edit-sample input[name=is_ltr]").on("change", function () {
            var $textarea = $(this).closest('form').find('textarea[name="initial"]');
            if (parseInt($(this).val()) === 1) {
                $textarea.attr("dir", "ltr");
            } else {
                $textarea.attr("dir", "rtl");
            }
        });


        // toggling a class on given element from a radio set
        $("[data-toggle-id]").on("change", function () {
            if (parseInt($(this).val()) === 1) {
                $("#" + $(this).data('toggle-id')).addClass($(this).data('toggle-class'));
            } else {
                $("#" + $(this).data('toggle-id')).removeClass($(this).data('toggle-class'));
            }
        });


        // fontsets list pagination
        $("#fontsampler-admin nav.fontsampler-pagination a").on("click", function (event) {
            event.preventDefault();

            var $this = $(this),
                $target = $("#" + $this.data("target")),
                href = $this.attr("href");

            $.get(href, function (result, error) {
                $target.html($(result).find("#fontsampler-admin-tbody-ajax").html());
                $(".fontsampler-preview").fontSampler();
                $("html, body").scrollTop(0);
            });

            $("#fontsampler-admin .fontsampler-pagination-current-page")
                .removeClass("fontsampler-pagination-current-page");

            $("#fontsampler-admin nav.fontsampler-pagination li:nth-of-type(" + ($this.parent().index() + 1) + ")")
                .children("a").addClass("fontsampler-pagination-current-page").blur();

            return false;
        });


        $(".fontsampler-toggle-show-hide").on("click", function (e) {
            e.preventDefault();
            var $this = $(this),
                $next = $(this).next(),
                $show = $this.children('span:first-child'),
                $hide = $this.children('span:last-child');

            $next.toggleClass("fontsampler-visible");

            if (!$next.hasClass("fontsampler-visible")) {
                $show.show();
                $hide.hide();
            } else {
                $show.hide();
                $hide.show();
            }
        });


        $(".fontsampler-options").accordion({
            active: false,
            collapsible: true,
            header: 'h3',
            heightStyle: 'content'
        });

        $("input[name='fontsize'],input[name='lineheight'],input[name='letterspacing']").on("change", function () {
            var $wrapper = $(this).closest("div").find(".fontsampler-options-features-details"),
                uncheckedClass = "fontsampler-options-unchecked";

            if ($(this).is(":checked")) {
                $wrapper.removeClass(uncheckedClass);
            } else {
                $wrapper.addClass(uncheckedClass);
            }
        });


        var $use_default_options = $("input[name=use_default_options]");
        var $options = $(".fontsampler-options");
        $("input[name=use_default_options]").change(function () {
            if ($(this).val() == 1) {
                $options.accordion("disable");
                $options.accordion("option", "active", false);
            } else {
                $options.accordion("enable");
            }
        });

        if ($use_default_options.filter(":checked").val() == 1) {
            $options.accordion("disable");
            $options.accordion("option", "active", false);
        }


        $(".fontsampler-image-radio").on("click", function () {
            var $this = $(this),
                name = $this.find('input').attr('name'),
                $all = $('.fontsampler-image-radio').has('input[name="' + name + '"]');

            $all.removeClass("active").find("input:checked").removeAttr("checked");
            $this.addClass("active").find('input').attr('checked', 'checked').trigger('change');
        });


        // fontsampler & settings direction options
        $initial = $("textarea[name='initial']");
        $("[name='is_ltr']").on("change", function () {
            $initial.attr('dir', $(this).val() == 1 ? 'ltr' : 'rtl');
        });
        $("[name='alignment_initial']").on("change", function () {
            $initial.css('text-align', $(this).data('value'));
        });


        // when clicking into a fontsampler options style's input field automatically
        // select the corresponding radio
        $(".fontsampler-options-row div:nth-of-type(1) input[type='text'], " +
            ".fontsampler-options-row div:nth-of-type(1) textarea").on("focus", function () {
            $(this).parentsUntil('.fontsampler-options-row')
                .find("input[name*='use_default']").attr('checked', 'checked');
        });

        $("#fontsampler-admin").on("click", "input.fontsampler-admin-feature-label-reset", function (e) {
            e.preventDefault();
            $(this).closest(".fontsampler-options-row")
                .find(".fontsampler-admin-slider-label").val($(this).data("default"));
        });

    } // end main


    // Due to clipboard's funny transpiling in combinition with requirejs' optimizer's
    // namespace rename this module can't be properly included. Alas, it's a global.

    // add "copy to clipboard" functionality to fontsampler listing table
    var clip = new Clipboard(".fontsampler-copy-clipboard");
    clip.on('success', function(e) {
        e.clearSelection();
        $(e.trigger).addClass('success');
        setTimeout(function () {
            $(e.trigger).removeClass('success');
        }, 1500);
    });

    return main;

});
