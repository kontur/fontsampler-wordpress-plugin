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


});