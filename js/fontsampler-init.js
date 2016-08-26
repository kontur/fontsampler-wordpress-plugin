
jQuery(function () {
	console.log(jQuery("body"));
	console.log(jQuery(".fontsampler"));

	jQuery(".fontsampler").each(function () {
		var file = jQuery(this).data('fontfile');
		jQuery(this).fontSampler({
			fontFile: file
		});
	});
});