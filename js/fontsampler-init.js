jQuery(function () {
	var $ = jQuery;
	$(".fontsampler").each(function () {
		var file = $(this).data('fontfile');
		$(this).fontSampler({
			fontFile: file
		});
	});


	// interface
	$(".fontsampler-interface input[type=range]").on('change, input', function () {
		var $fs = $(this).closest('.fontsampler-interface').siblings('.fontsampler'),
			val = $(this).val(),
			unit = $(this).data('unit');

		switch ($(this).attr('name')) {
			case 'font-size':
				$fs.fontSampler('changeSize', val + unit);
				break;

			case 'letter-spacing':
				$fs.fontSampler('changeLetterSpacing', val + unit);
				break;

			case 'line-height':
				$fs.fontSampler('changeLeading', val + unit);
				break;
		}
		$(this).siblings('.slider-value').html(val + unit);
	});


	$(".fontsampler-interface select").on('change', function () {
		var $fs = $(this).closest('.fontsampler-interface').siblings('.fontsampler'),
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


	// transform select dropdowns
	$(".fontsampler-interface select").not("[size]").each(function () {
		$(this).selectric().closest('.selectric-wrapper').addClass('selectric-wide');
	});

	$(".fontsampler-multiselect").on("click", "button", function () {
		var $fs = $(this).closest('.fontsampler-interface').siblings('.fontsampler'),
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
});