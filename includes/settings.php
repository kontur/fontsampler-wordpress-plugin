<?php $defaults; ?>

<h1>Settings</h1>
<h2>Fontsampler defaults</h2>
<small>Set the the initial values and ranges for any sliders the users can use (if enabled).</small>
<form method="post" action="?page=fontsampler&amp;subpage=settings" class="form-settings fontsampler-validate">
	<input type="hidden" name="action" value="edit_settings">
	<?php if ( function_exists( 'wp_nonce_field' ) ) : wp_nonce_field( 'fontsampler-action-edit_settings' ); endif; ?>
	<input type="hidden" name="id" value="1">

	<label>
		<span class="setting-description">Font size slider label:</span>
		<input type="text" name="font_size_label" class="fontsampler-admin-slider-label"
		       value="<?php echo $defaults['font_size_label']; ?>"/>
	</label>
	<label>
		<span class="setting-description">Font size initial px:
			<input data-name="font_size_initial"
			       class="current-value"
			       value="<?php echo $defaults['font_size_initial']; ?>"
			       data-validation="number"
			       data-validation-allowing="range[1;256]">
		</span>
		<div class="slider">
			<input type="range" name="font_size_initial"
			       value="<?php echo $defaults['font_size_initial']; ?>"
			       min="1" max="256">
		</div>
	</label>
	<label>
		<span class="setting-description">Font size minimum px:
			<input data-name="font_size_min"
			       class="current-value"
			       value="<?php echo $defaults['font_size_min']; ?>"
			       data-validation="number"
			       data-validation-allowing="range[1;256]">
		</span>
		<div class="slider">
			<input type="range" name="font_size_min"
			       value="<?php echo $defaults['font_size_min']; ?>"
			       min="1" max="255">
		</div>
	</label>
	<label>
		<span class="setting-description">Font size maximum px:
			<input data-name="font_size_max"
			       class="current-value"
			       value="<?php echo $defaults['font_size_max']; ?>"
			       data-validation="number"
			       data-validation-allowing="range[1;256]">
		</span>
		<div class="slider">
			<input type="range" name="font_size_max"
			       value="<?php echo $defaults['font_size_max']; ?>"
			       min="1" max="255">
		</div>
	</label>

	<br>

	<label>
		<span class="setting-description">Letter spacing slider label:</span>
		<input type="text" name="letter_spacing_label" class="fontsampler-admin-slider-label"
		       value="<?php echo $defaults['letter_spacing_label']; ?>"/>
	</label>
	<label>
		<span class="setting-description">Letter-spacing initial px:
			<input data-name="letter_spacing_initial"
			       class="current-value"
			       value="<?php echo $defaults['letter_spacing_initial']; ?>"
			       data-validation="number"
			       data-validation-allowing="range[-10;10],negative,float">
		</span>
		<div class="slider">
			<input type="range" name="letter_spacing_initial"
			       value="<?php echo $defaults['letter_spacing_initial']; ?>"
			       min="-10" max="10">
		</div>
	</label>
	<label>
		<span class="setting-description">Letter-spacing minimum px:
			<input data-name="letter_spacing_min"
			       class="current-value"
			       value="<?php echo $defaults['letter_spacing_min']; ?>"
			       data-validation="number"
			       data-validation-allowing="range[-10;10],negative,float">
		</span>
		<div class="slider">
			<input type="range" name="letter_spacing_min"
			       value="<?php echo $defaults['letter_spacing_min']; ?>" min="-10" max="10">
		</div>
	</label>
	<label>
		<span class="setting-description">Letter-spacing maximum px:
			<input data-name="letter_spacing_max"
			       class="current-value"
			       value="<?php echo $defaults['letter_spacing_max']; ?>"
			       data-validation="number"
			       data-validation-allowing="range[-10;10],negative,float">
		</span>
		<div class="slider">
			<input type="range" name="letter_spacing_max"
			       value="<?php echo $defaults['letter_spacing_max']; ?>"
			       min="-10" max="10">
		</div>
	</label>

	<br>

	<label>
		<span class="setting-description">Line height slider label:</span>
		<input type="text" name="line_height_label" class="fontsampler-admin-slider-label"
		       value="<?php echo $defaults['line_height_label']; ?>"/>
	</label>
	<label>
		<span class="setting-description">Line-height initial %:
			<input data-name="line_height_initial"
			       class="current-value"
			       value="<?php echo $defaults['line_height_initial']; ?>"
			       data-validation="number"
			       data-validation-allowing="range[0;500]">
		</span>
		<div class="slider">
			<input type="range" name="line_height_initial"
			       value="<?php echo $defaults['line_height_initial']; ?>"
			       min="0" max="500">
		</div>
	</label>
	<label>
		<span class="setting-description">Line-height minimum %:
			<input data-name="line_height_min"
			       class="current-value"
			       value="<?php echo $defaults['line_height_min']; ?>"
			       data-validation="number"
			       data-validation-allowing="range[0;500]">
		</span>
		<div class="slider">
			<input type="range" name="line_height_min"
			       value="<?php echo $defaults['line_height_min']; ?>"
			       min="0" max="500">
		</div>
	</label>
	<label>
		<span class="setting-description">Line-height maximum %:
			<input data-name="line_height_max"
			       class="current-value"
			       value="<?php echo $defaults['line_height_max']; ?>"
			       data-validation="number"
			       data-validation-allowing="range[0;500]">
		</span>
		<div class="slider">
			<input type="range" name="line_height_max"
			       value="<?php echo $defaults['line_height_max']; ?>"
			       min="0" max="500">
		</div>
	</label>

	<label>
		<span class="setting-description">Default text alignment:
	</label>
	<label>
		<input type="radio" name="alignment_initial" value="left"
			<?php if ($defaults['alignment_initial'] === "left") : echo ' checked="checked" '; endif; ?>>
		<img class="fontsampler-admin-alignment-icon"
		     src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/align-left.svg">Left
	</label>
	<label>
		<input type="radio" name="alignment_initial" value="center"
			<?php if ($defaults['alignment_initial'] === "center") : echo ' checked="checked" '; endif; ?>>
		<img class="fontsampler-admin-alignment-icon"
		     src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/align-center.svg">Centered
	</label>
	<label>
		<input type="radio" name="alignment_initial" value="right"
			<?php if ($defaults['alignment_initial'] === "right") : echo ' checked="checked" '; endif; ?>>
		<img class="fontsampler-admin-alignment-icon"
		     src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/align-right.svg">Right
	</label>

	<br><br><br>

	<p>The image is used when provided, otherwise the label text is used to create a text link.</p>

	<label>
		<span class="setting-description">Default label of the "Buy" link (if supplied):</span>
		<input type="text" name="buy_label" class="fontsampler-admin-slider-label"
		       value="<?php echo $defaults['buy_label']; ?>"/>
	</label>
	<label class="fontsampler-setting-image">
		<span class="setting-description">Default image of the "Buy" link (if supplied):</span>
		<?php
		$image_id   = $defaults['buy_image'];
		$image_name = 'buy_image';
		include( "fontsampler-media-upload.php" );
		?>
		<br>
		<small>Recommended size about 200 x 60 pixels</small>
	</label>

	<label>
		<span class="setting-description">Default label of the "Specimen" link (if supplied):</span>
		<input type="text" name="specimen_label" class="fontsampler-admin-slider-label"
		       value="<?php echo $defaults['specimen_label']; ?>"/>
	</label>
	<label class="fontsampler-setting-image">
		<span class="setting-description">Default image of the "Buy" link (if supplied):</span>
		<?php
		$image_id   = $defaults['specimen_image'];
		$image_name = 'specimen_image';
		include( "fontsampler-media-upload.php" );
		?>
		<br>
		<small>Recommended size about 200 x 60 pixels</small>
	</label>
	<br><br><br>

	<h2>Common features (UI options)</h2>
	<small>Updating these defaults will automatically update any fontsamplers that use the defaults.</small>
	<?php
	$options = $defaults;
	include( 'fontsampler-options.php' );

	include( 'fontsampler-styles.php' );
	?>


	<h2>Admin interface customizations</h2>
	<label>
		<input type="checkbox"
		       name="admin_hide_legacy_formats"
		       value="1"
			<?php if ( $this->admin_hide_legacy_formats ): echo ' checked="checked" '; endif; ?>>
		<span class="setting-description">Hide legacy webfont formats in admin interface.</span>
		<small>When activated (recommended) this option hides all but the <span class="filename">WOFF</span> and
			<span class="filename">WOFF2</span> webfont formats, since those are the formats sufficient for rendering
			webfonts in modern browsers. Enabling this option de-clutters the interface. Disable only if you explicitly
			want to upload <span class="filename">EOT</span>, <span class="filename">SVG</span> or
			<span class="filename">TTF</span> files for the fontsamplers to use.
		</small>
	</label>
	<?php submit_button(); ?>
</form>
