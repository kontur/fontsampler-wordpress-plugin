jQuery(function () {
	var $ = jQuery;

	// todo limit amount of select options to the number of font sets
	$("#fontsampler-admin").on("click", ".fontsampler-fontset-remove", function (e) {
		e.preventDefault();
		if ($("#fontsampler-fontset-list li").length > 1) {
			$(this).parent("li").remove();
		} else {
			console.log("Nope. Can't delete last picker");
		}
	});

	$("#fontsampler-admin").on("click", ".fontsampler-fontset-add", function (e) {
		e.preventDefault();
		$("#fontsampler-fontset-list li:last").clone().appendTo("#fontsampler-fontset-list");
		$("#fontsampler-fontset-list li:last option[selected='selected']").removeAttr('selected');
	});


    // setting sliders

    $('#fontsampler-admin .form-settings input[type="range"]').css("outline", "1px solid red").rangeslider({
        // Feature detection the default is `true`.
        // Set this to `false` if you want to use
        // the polyfill also in Browsers which support
        // the native <input type="range"> element.
        polyfill: false
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
    $(".fontsampler-ui-preview-list").sortable({
        connectWith: ".fontsampler-ui-preview-list",
        placeholder: "ui-state-highlight",
        forcePlaceholderSize: true,
        stop: function () {
            $(".fontsampler-ui-preview-list .original-sibling").removeClass("original-sibling");
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

});
