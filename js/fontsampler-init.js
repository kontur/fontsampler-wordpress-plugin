
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
		console.log($(this).val());
		
		var $fs = $(this).closest('.fontsampler-interface').siblings('.fontsampler'),
			val = $(this).val(),
			unit = $(this).data('unit');

		switch ($(this).attr('name')) {
			case 'font-size':
				$fs.fontSampler('changeSize', val + unit);
				break;

			case 'letter-spacing':
				$fs.fontSampler('changeLetterSpacing', val + unit);

			case 'line-height':
				$fs.fontSampler('changeLeading', val + unit);
				break;
		}

		$(this).siblings('.slider-value').html(val + unit);

	});
	$(".fontsampler-interface select").on('change', function () {
		console.log($(this).val());
		var $fs = $(this).closest('.fontsampler-interface').siblings('.fontsampler'),
			val = $(this).val();

		switch ($(this).attr('name')) {
			case "font-selector":
				break;

			case "sample-text":
				$fs.html(val);
				break;

			case "alignment":
				$fs.css("text-align", val);
				break;

			case "invert":
				$fs.toggleClass("invert");
				break;
		}
	});

});