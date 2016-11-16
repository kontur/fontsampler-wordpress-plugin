<h1><?php echo ! empty( $font['id'] ) ? 'Edit this font set' : 'Upload new font files'; ?></h1>
<form method="post" enctype="multipart/form-data" action="?page=fontsampler&amp;subpage=fonts" id="fontsampler-fontset-from" class="fontsampler-validate">
	<input type="hidden" name="action" value="edit_font">
	<?php if ( function_exists( 'wp_nonce_field' ) ) : wp_nonce_field( 'fontsampler-action-edit_font' ); endif; ?>
	<input type="hidden" name="id" value="<?php echo empty( $font['id'] ) ? 0 : $font['id']; ?>">

	<h2>Font name</h2>
	<p>Supply this mostly to make it able for you to tell different fonts apart for when you pick them
		into a font sampler. (e.g. "MyFont Regular Italic")</p>

	<?php include('fontset-fonts.php'); ?>

	<p>The supplied files will be used to render the actual font sampler. Note that you don't have to
		provide all formats. Supplying at the very least the <code>woff</code> formats will
		cover a good amount of browsers. <a href="http://caniuse.com/#search=woff">See here for details.</a></p>

	<p><small>Note that these fonts are used for preview purposes only - what fonts you make available to customers
		is naturally independent from these files.</small></p>

	<p><small>Note further more that these files will be stored in your Wordpress Uploads folder. Once uploaded,
		you can re-use the same files also for defining other font sets and reuse them in any number of font sets and
		font samplers.</small></p>
	<?php if ( empty( $font['id'] ) ) : submit_button( 'Upload' );
	else : submit_button( 'Update' ); endif; ?>
</form>