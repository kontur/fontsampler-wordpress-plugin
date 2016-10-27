jQuery(function () {
	var $ = jQuery;

    // enable frontend side form validation
    $.validate({
        form: ".fontsampler-validate",
        modules : 'file',
    });

	// todo limit amount of select options to the number of font sets / don't allow duplicates on frontend side
    // duplicate inputs are going to be filtered out on db entry
	$("#fontsampler-admin").on("click", ".fontsampler-fontset-remove", function (e) {
		e.preventDefault();
		if ($("#fontsampler-fontset-list li").length > 1) {
			$(this).parent("li").remove();
		} else {
			console.log("Nope. Can't delete last picker");
		}
        $("#fontsampler-fontset-list").sortable("refresh");
        updateFontsOrder();
	});

	$("#fontsampler-admin").on("click", ".fontsampler-fontset-add", function (e) {
		e.preventDefault();
		$("#fontsampler-fontset-list li:last").clone().appendTo("#fontsampler-fontset-list");
		$("#fontsampler-fontset-list li:last option[selected='selected']").removeAttr('selected');
        $("#fontsampler-fontset-list").sortable("refresh");

        updateFontsOrder();
	});

    $("#fontsampler-admin").on("change", "#fontsampler-fontset-list select", function () {
        updateFontsOrder();
    });

    // allow sorting multiple fonts in a fontsampler
    $("#fontsampler-fontset-list").sortable({
        handle: ".fontsampler-fontset-sort-handle",
        stop: updateFontsOrder
    });

    function updateFontsOrder() {
        var order = $("#fontsampler-fontset-list li select[name='font_id[]']").map(function () {
            return $(this).val();
        }).get().join();
        $("input[name=fonts_order]").val(order);
    }


    // setting sliders
    $('#fontsampler-admin .form-settings input[type="range"]').rangeslider({
        // Feature detection the default is `true`.
        // Set this to `false` if you want to use
        // the polyfill also in Browsers which support
        // the native <input type="range"> element.
        polyfill: false,
        onSlide: function () {
            var $input = this.$element.closest("label").find(".current-value");
            // prevent reacting to a slide event triggered my text field input update,
            // thus preventing the user being unable to type, as the text input would get overwritten from this update
            if (! $input.is(":focus")) {
                $input.val(this.$element.val());
            }
        }
    });
    $("#fontsampler-admin .form-settings input.current-value").on("keyup", function () {
        var $sliderInput = $(this).closest("label").find("input[name='" + $(this).data("name") + "']"),
            min = $sliderInput.attr("min"),
            max = $sliderInput.attr("max"),
            intval = parseInt($(this).val()),
            constrainedValue = Math.min(Math.max(intval, min), max);

        // prevent blocking the type input while also updating it should the value have been beyond the limits
        if (intval !== constrainedValue && ! isNaN(constrainedValue) ) {
            $(this).val(constrainedValue);
        }
        $sliderInput.val(constrainedValue).change();
    });


    // interface
    $("#fontsampler-admin .form-settings input[type=range]").on('change, input', function () {
        var $display = $(this).closest('label').find('code.current-value');
            val = $(this).val(),
            unit = $(this).data('unit');

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


    // UI preview sortable
    function calculateUIOrder() {
        var order = "";
        $(".fontsampler-ui-preview-list").each(function (index, element) {
            $(element).children("li").each(function (i, elem) {
                order = order.concat($(elem).data("name")).concat(",");
            });
            order = order.slice(0, -1);
            order = order.concat("|");
        });
        order = order.slice(0, -1);
        $(".fontsampler-ui-preview input[name=ui_order]").val(order);
        return order;
    }

    $(".fontsampler-ui-preview-list").sortable({
        connectWith: ".fontsampler-ui-preview-list",
        placeholder: "ui-state-highlight",
        forcePlaceholderSize: true,
        stop: function () {
            $(".fontsampler-ui-preview-list .original-sibling").removeClass("original-sibling");
            calculateUIOrder();
        },
        over: function( event, ui ) {
            // TODO there is one case that is not covered ideally:
            // when dragging a single item from a 2 item row onto the next row with 3 items and then onto the textarea
            // the textarea and the first row swap place, when it should be texarea and second row
            if (ui.item.hasClass("fontsampler-ui-placeholder-full")) {
                // textarea is dragged: swap on the fly with all current items
                var $sender = $(".fontsampler-ui-preview-list:has(.ui-sortable-helper)");
                var $receiver = $(".fontsampler-ui-preview-list:has(.ui-state-highlight)");
                $(".fontsampler-ui-preview-list").each(function (index, element) {
                   if ($(element).children().length == 0) {
                       $sender = $(element);
                   }
                });
                $receiver.children(":not(.ui-sortable-helper):not(.ui-state-highlight)").each(function (index, $element) {
                    $sender.append($element);
                });
            } else if (ui.placeholder.siblings().length > 1 && ui.placeholder.siblings(":not(.ui-sortable-helper)").length == 3) {
                // single item is dragged and receiving list is full, swap the one item with the last of the receiving list
                // TODO not :last but: the one hovering closest to
                var $receiver = $(".fontsampler-ui-preview-list:has(.ui-state-highlight)");
                var $sender = $(".fontsampler-ui-preview-list:not(:has(.ui-state-highlight))").not(":has(.fontsampler-ui-placeholder-full)");
                $sender.append($receiver.children(".fontsampler-ui-block:last"));
                $receiver.append(ui.item);

            } else if (ui.placeholder.siblings(".fontsampler-ui-placeholder-full").length == 1) {
                // single items dragged to where the textarea is, swap the textarea with where the single item originates from
                var $origin = $(".fontsampler-ui-preview-list:has(.ui-sortable-helper)");
                var $destination = $(".fontsampler-ui-preview-list:has(.fontsampler-ui-placeholder-full)");

                if ($destination.has(".ui-sortable-helper").length == 1) {
                    $destination = $origin;
                    $origin = $(".fontsampler-ui-preview-list:has(.original-sibling)");
                }
                $origin.children(":not(.ui-sortable-helper)").each(function (index, element) {
                    $(element).addClass("original-sibling");
                    $destination.append($(element));
                });
                $origin.append($(".fontsampler-ui-placeholder-full"));
            }
        }
    });


    // sampler checkboxes & UI preview interaction
    $("#fontsampler-edit-sample input[type=checkbox]").on("change", function () {
        iterateCheckboxes($(this));
    });
    calculateUIOrder();

    /**
     * Function that gets called when any of the checkboxes controlling the display of a UI element get toggled
     * If the element is currently hidden, it gets appended to the sortable
     * If the element is currently visible, it gets stashed in the placeholder list
     *
     * @param $this - the checkbox
     * @returns {boolean}
     */
    function iterateCheckboxes($this) {
        var attr = $this.attr("name"),
            checked = $this.is(":checked"),

            // the fields controlling the "option" preview block
            $combined = $("input[name*=ot], input[name=alignment], input[invert]"),
            $optionsElem = $(".fontsampler-ui-preview li[data-name=options]"),
            $elem = $(".fontsampler-ui-preview li[data-name='" + attr + "']");

        if (checked) {
            // proceed showing
            // copy element from placeholder to the first preview list with less than 3 items in it (and not the text input)

            // if it's one of the special "options" checkboxes show it
            if (attr.indexOf("ot_") > -1 || ['alignment', 'invert'].indexOf(attr) > -1 ) {
                $elem = $optionsElem;
            }

            $(".fontsampler-ui-preview-list:not(:has(.fontsampler-ui-placeholder-full))").filter(function () {
                return $(this).children("li").length < 3;
            }).filter(":first").append($elem);
            $elem.fadeIn(calculateUIOrder);
        } else {
            // see if the unchecked field was one of the combo fields from OP alignment or inverting
            if (attr.indexOf("ot_") > -1 || ['alignment', 'invert'].indexOf(attr) > -1 ) {
                if ($combined.filter(":checked").length > 0) {
                    // if indeed it is one of those checkboxes that got changed and if indeed not all of those fields
                    // are unchecked, the UI field remains visible, so do nothing / don't fade out the preview field
                    return false;
                } else {
                    $elem = $optionsElem;
                }
            }

            // proceed hiding
            $elem.fadeOut(function () {
                $(this).appendTo(".fontsampler-ui-preview-placeholder");
                calculateUIOrder();
            });
        }
    }


    $("#fontsampler-edit-sample input[name=default_features]").on("change", function () {
        var $checkboxes = $("#fontsampler-options-checkboxes input[type=checkbox]"),
            $this = $(this);

        $checkboxes.each(function () {
            var $that = $(this);

            if ( parseInt( $this.val() ) === 1 ) {
                // use defaults:
                if ($that.data('default') == 'checked') {
                    $that.attr('checked', 'checked');
                } else {
                    $that.removeAttr('checked');
                }
            } else {
                // use custom set:
                if ($that.data('set') == 'checked') {
                    $that.attr('checked', 'checked');
                } else {
                    $that.removeAttr('checked');
                }
            }
            iterateCheckboxes($that);
        });

    });

    // toggling a class on given element from a radio set
    $("[data-toggle-id]").on("change", function () {
        if (parseInt( $(this).val() ) === 1) {
            $("#" + $(this).data('toggle-id')).addClass($(this).data('toggle-class'));
        } else {
            $("#" + $(this).data('toggle-id')).removeClass($(this).data('toggle-class'));
        }
    });

});
