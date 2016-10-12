<?php $defaults; ?>

<h1>Settings</h1>
<h2>Fontsampler defaults</h2>
<form method="post" action="?page=fontsampler&amp;subpage=settings" class="form-settings">
	<input type="hidden" name="action" value="edit_settings">
	<?php if ( function_exists( 'wp_nonce_field' ) ) : wp_nonce_field( 'fontsampler-action-edit_settings' ); endif; ?>
	<input type="hidden" name="id" value="1">

	<label>
		<span>font_size initial px: <code
				class="current-value"><?php echo $defaults['font_size_initial']; ?></code></span>

		<div class="slider"><input type="range" name="font_size_initial"
		                           value="<?php echo $defaults['font_size_initial']; ?>" min="1" max="256"></div>
	</label>
	<label>
		<span>font_size minimum px: <code class="current-value"><?php echo $defaults['font_size_min']; ?></code></span>

		<div class="slider"><input type="range" name="font_size_min" value="<?php echo $defaults['font_size_min']; ?>"
		                           min="1" max="255"></div>
	</label>
	<label>
		<span>font_size maximum px: <code class="current-value"><?php echo $defaults['font_size_max']; ?></code></span>

		<div class="slider"><input type="range" name="font_size_max" value="<?php echo $defaults['font_size_max']; ?>"
		                           min="1" max="255"></div>
	</label>
	<label>
		<span>Letter-spacing initial px: <code
				class="current-value"><?php echo $defaults['letter_spacing_initial']; ?></code></span>

		<div class="slider"><input type="range" name="letter_spacing_initial"
		                           value="<?php echo $defaults['letter_spacing_initial']; ?>" min="-10" max="10"></div>
	</label>
	<label>
		<span>Letter-spacing minimum px: <code
				class="current-value"><?php echo $defaults['letter_spacing_min']; ?></code></span>

		<div class="slider"><input type="range" name="letter_spacing_min"
		                           value="<?php echo $defaults['letter_spacing_min']; ?>" min="-10" max="10"></div>
	</label>
	<label>
		<span>Letter-spacing maximum px: <code
				class="current-value"><?php echo $defaults['letter_spacing_max']; ?></code></span>

		<div class="slider"><input type="range" name="letter_spacing_max"
		                           value="<?php echo $defaults['letter_spacing_max']; ?>" min="-10" max="10"></div>
	</label>
	<label>
		<span>Line-height initial %: <code class="current-value"><?php echo $defaults['line_height_initial']; ?></code></span>

		<div class="slider"><input type="range" name="line_height_initial"
		                           value="<?php echo $defaults['line_height_initial']; ?>" min="0" max="500"></div>
	</label>
	<label>
		<span>Line-height minimum %: <code
				class="current-value"><?php echo $defaults['line_height_min']; ?></code></span>

		<div class="slider"><input type="range" name="line_height_min"
		                           value="<?php echo $defaults['line_height_min']; ?>" min="0" max="500"></div>
	</label>
	<label>
		<span>Line-height maximum %: <code
				class="current-value"><?php echo $defaults['line_height_max']; ?></code></span>

		<div class="slider"><input type="range" name="line_height_max"
		                           value="<?php echo $defaults['line_height_max']; ?>" min="0" max="500"></div>
	</label>
	<label>
		Sample texts
		<small>(use simple line breaks for each option to be displayed in the dropdown)</small>
		<textarea name="sample_texts" cols="60" rows="10"><?php echo $defaults['sample_texts']; ?></textarea>
	</label>
	<?php submit_button(); ?>
</form>
