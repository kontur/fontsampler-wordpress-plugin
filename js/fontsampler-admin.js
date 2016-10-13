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
        console.log("ok");
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

});
