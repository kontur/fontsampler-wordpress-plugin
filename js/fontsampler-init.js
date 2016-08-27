
jQuery(function () {
	var $ = jQuery;
	$(".fontsampler").each(function () {
		var file = $(this).data('fontfile');
		$(this).fontSampler({
			fontFile: file
		});
	});

	// interface
	$(".fontsampler-interface input[type=range]").on('change', function () {
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
	});
	$(".fontsampler-interface select").on('change', function () {
		console.log($(this).val());
	});

});