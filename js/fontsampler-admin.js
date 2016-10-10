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

});