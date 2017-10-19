jQuery(function () {
	var $ = jQuery; 
	$(".fontsampler").each(function () {
		var file = $(this).data('fontfile'),
			options = $(this).data('options');

		$(this).fontSampler({
			fontFile: file,
			fontSize: options["fontsize_initial"] + options["fontsize_unit"],
			letterSpacing: options["letterspacing_initial"] + options["letterspacing_unit"],
			leading: options["lineheight_initial"] + options["lineheight_unit"],
			multiLine: options["multiline"] == 1 ? true : false,
		});
	});


	// interface
	$(".fontsampler-interface input[type=range]").on('change, input', function () {
		var $fs = $(this).closest('.fontsampler-interface').find('.fontsampler'),
			val = $(this).val(),
			unit = $(this).data('unit');

		switch ($(this).attr('name')) {
			case 'fontsize':
				$fs.fontSampler('changeSize', val + unit);
				break;

			case 'letterspacing':
				$fs.fontSampler('changeLetterSpacing', val + unit);
				break;

			case 'lineheight':
				$fs.fontSampler('changeLeading', val + unit);
				break;
		}
		$(this).siblings('.slider-value').html(val + '&nbsp;' + unit);
	});


	$(".fontsampler-interface select").on('change', function () {
		var $fs = $(this).closest('.fontsampler-interface').find('.fontsampler'),
			val = $(this).val();

		switch ($(this).attr('name')) {
			case "font-selector":
                var json = $(this).find("option:selected").data("font-files");
                $fs.fontSampler('changeFont', json);
				break;

			case "sample-text":
				$fs.html(val);
				break;
		}
	});

	$('.fontsampler-interface input[type="range"]').rangeslider({
	    // Feature detection the default is `true`.
	    // Set this to `false` if you want to use
	    // the polyfill also in Browsers which support
	    // the native <input type="range"> element.
	    polyfill: false
	});


	// transform select dropdowns
	$(".fontsampler-interface select").not("[size]").each(function () {
		$(this).selectric().closest('.selectric-wrapper').addClass('selectric-wide');
	});


	$(".fontsampler-multiselect").on("click", "button", function () {
		var $fs = $(this).closest('.fontsampler-interface').find('.fontsampler'),
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
            $fs = $(this).closest('.fontsampler-interface').find('.fontsampler');

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

});