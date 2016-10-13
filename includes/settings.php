<?php $defaults; ?>

<h1>Settings</h1>
<h2>Fontsampler defaults</h2>
<form method="post" action="?page=fontsampler&amp;subpage=settings" class="form-settings">
	<input type="hidden" name="action" value="edit_settings">
	<?php if ( function_exists( 'wp_nonce_field' ) ) : wp_nonce_field( 'fontsampler-action-edit_settings' ); endif; ?>
	<input type="hidden" name="id" value="1">

	<label>
		<span class="setting_description">font_size initial px: <code
				class="current-value"><?php echo $defaults['font_size_initial']; ?></code></span>

		<div class="slider"><input type="range" name="font_size_initial"
		                           value="<?php echo $defaults['font_size_initial']; ?>" min="1" max="256"></div>
	</label>
	<label>
		<span class="setting_description">font_size minimum px: <code
				class="current-value"><?php echo $defaults['font_size_min']; ?></code></span>

		<div class="slider"><input type="range" name="font_size_min" value="<?php echo $defaults['font_size_min']; ?>"
		                           min="1" max="255"></div>
	</label>
	<label>
		<span class="setting_description">font_size maximum px: <code
				class="current-value"><?php echo $defaults['font_size_max']; ?></code></span>

		<div class="slider"><input type="range" name="font_size_max" value="<?php echo $defaults['font_size_max']; ?>"
		                           min="1" max="255"></div>
	</label>
	<label>
		<span class="setting_description">Letter-spacing initial px: <code
				class="current-value"><?php echo $defaults['letter_spacing_initial']; ?></code></span>

		<div class="slider"><input type="range" name="letter_spacing_initial"
		                           value="<?php echo $defaults['letter_spacing_initial']; ?>" min="-10" max="10"></div>
	</label>
	<label>
		<span class="setting_description">Letter-spacing minimum px: <code
				class="current-value"><?php echo $defaults['letter_spacing_min']; ?></code></span>

		<div class="slider"><input type="range" name="letter_spacing_min"
		                           value="<?php echo $defaults['letter_spacing_min']; ?>" min="-10" max="10"></div>
	</label>
	<label>
		<span class="setting_description">Letter-spacing maximum px: <code
				class="current-value"><?php echo $defaults['letter_spacing_max']; ?></code></span>

		<div class="slider"><input type="range" name="letter_spacing_max"
		                           value="<?php echo $defaults['letter_spacing_max']; ?>" min="-10" max="10"></div>
	</label>
	<label>
		<span class="setting_description">Line-height initial %: <code
				class="current-value"><?php echo $defaults['line_height_initial']; ?></code></span>

		<div class="slider"><input type="range" name="line_height_initial"
		                           value="<?php echo $defaults['line_height_initial']; ?>" min="0" max="500"></div>
	</label>
	<label>
		<span class="setting_description">Line-height minimum %: <code
				class="current-value"><?php echo $defaults['line_height_min']; ?></code></span>

		<div class="slider"><input type="range" name="line_height_min"
		                           value="<?php echo $defaults['line_height_min']; ?>" min="0" max="500"></div>
	</label>
	<label>
		<span class="setting_description">Line-height maximum %: <code
				class="current-value"><?php echo $defaults['line_height_max']; ?></code></span>

		<div class="slider"><input type="range" name="line_height_max"
		                           value="<?php echo $defaults['line_height_max']; ?>" min="0" max="500"></div>
	</label>

	<h2>Colour options</h2>

	<span class="setting_description">Foreground (text) colour:</span>

	<div class="picker"><input type="text" name="color_fore" id="color_fore" class="color-picker"
	                           value="<?php echo $defaults['color_fore']; ?>" data-default-color="#000000"/></div>

	<span class="setting_description">Background (page) colour:</span>

	<div class="picker"><input type="text" name="color_back" id="color_back" class="color-picker"
	                           value="<?php echo $defaults['color_back']; ?>" data-default-color="#ffffff"/></div>

	<label>
		Sample texts
		<small>(use simple line breaks for each option to be displayed in the dropdown)</small>
		<textarea name="sample_texts" cols="60" rows="10"><?php echo $defaults['sample_texts']; ?></textarea>
	</label>
	<?php submit_button(); ?>
</form>
