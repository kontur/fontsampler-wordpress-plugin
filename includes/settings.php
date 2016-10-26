<?php $defaults; ?>

<h1>Settings</h1>
<h2>Fontsampler defaults</h2>
<form method="post" action="?page=fontsampler&amp;subpage=settings" class="form-settings fontsampler-validate">
	<input type="hidden" name="action" value="edit_settings">
	<?php if ( function_exists( 'wp_nonce_field' ) ) : wp_nonce_field( 'fontsampler-action-edit_settings' ); endif; ?>
	<input type="hidden" name="id" value="1">

	<label>
		<span class="setting-description">Font size initial px: <input data-name="font_size_initial"
				class="current-value" value="<?php echo $defaults['font_size_initial']; ?>"
				data-validation="number" data-validation-allowing="range[1;256]"></span>

		<div class="slider"><input type="range" name="font_size_initial"
		                           value="<?php echo $defaults['font_size_initial']; ?>" min="1" max="256"></div>
	</label>
	<label>
		<span class="setting-description">Font size minimum px: <input data-name="font_size_min"
				class="current-value" value="<?php echo $defaults['font_size_min']; ?>"
				data-validation="number" data-validation-allowing="range[1;256]"></span>

		<div class="slider"><input type="range" name="font_size_min" value="<?php echo $defaults['font_size_min']; ?>"
		                           min="1" max="255"></div>
	</label>
	<label>
		<span class="setting-description">Font size maximum px: <input data-name="font_size_max"
				class="current-value" value="<?php echo $defaults['font_size_max']; ?>"
				data-validation="number" data-validation-allowing="range[1;256]"></span>

		<div class="slider"><input type="range" name="font_size_max" value="<?php echo $defaults['font_size_max']; ?>"
		                           min="1" max="255"></div>
	</label>
	<label>
		<span class="setting-description">Letter-spacing initial px: <input data-name="letter_spacing_initial"
				class="current-value" value="<?php echo $defaults['letter_spacing_initial']; ?>"
				data-validation="number" data-validation-allowing="range[-10;10],negative,float"></span>

		<div class="slider"><input type="range" name="letter_spacing_initial"
		                           value="<?php echo $defaults['letter_spacing_initial']; ?>" min="-10" max="10"></div>
	</label>
	<label>
		<span class="setting-description">Letter-spacing minimum px: <input data-name="letter_spacing_min"
				class="current-value" value="<?php echo $defaults['letter_spacing_min']; ?>"
				data-validation="number" data-validation-allowing="range[-10;10],negative,float"></span>

		<div class="slider"><input type="range" name="letter_spacing_min"
		                           value="<?php echo $defaults['letter_spacing_min']; ?>" min="-10" max="10"></div>
	</label>
	<label>
		<span class="setting-description">Letter-spacing maximum px: <input data-name="letter_spacing_max"
				class="current-value" value="<?php echo $defaults['letter_spacing_max']; ?>"
				data-validation="number" data-validation-allowing="range[-10;10],negative,float"></span>

		<div class="slider"><input type="range" name="letter_spacing_max"
		                           value="<?php echo $defaults['letter_spacing_max']; ?>" min="-10" max="10"></div>
	</label>
	<label>
		<span class="setting-description">Line-height initial %: <input data-name="line_height_initial"
				class="current-value" value="<?php echo $defaults['line_height_initial']; ?>"
				data-validation="number" data-validation-allowing="range[0;500]"></span>

		<div class="slider"><input type="range" name="line_height_initial"
		                           value="<?php echo $defaults['line_height_initial']; ?>" min="0" max="500"></div>
	</label>
	<label>
		<span class="setting-description">Line-height minimum %: <input data-name="line_height_min"
				class="current-value" value="<?php echo $defaults['line_height_min']; ?>"
				data-validation="number" data-validation-allowing="range[0;500]"></span>

		<div class="slider"><input type="range" name="line_height_min"
		                           value="<?php echo $defaults['line_height_min']; ?>" min="0" max="500"></div>
	</label>
	<label>
		<span class="setting-description">Line-height maximum %: <input data-name="line_height_max"
				class="current-value" value="<?php echo $defaults['line_height_max']; ?>"
				data-validation="number" data-validation-allowing="range[0;500]"></span>

		<div class="slider"><input type="range" name="line_height_max"
		                           value="<?php echo $defaults['line_height_max']; ?>" min="0" max="500"></div>
	</label>

	<h2>Styling options</h2>

	<label>
		<span class="setting-description">Color of the fontsampler text:</span>
		<div class="picker"><input type="text" name="css_color_text" id="css_color_text" class="color-picker"
		                           value="<?php echo $defaults['css_color_text']; ?>"
		                           data-default-color="<?php echo $this->settings_defaults['css_color_text']; ?>" />
		</div>
	</label>

	<label>
		<span class="setting-description">Color of the fontsampler background:</span>
		<div class="picker"><input type="text" name="css_color_background" id="css_color_background"
		                           class="color-picker"
		                           value="<?php echo $defaults['css_color_background']; ?>"
		                           data-default-color="<?php echo $this->settings_defaults['css_color_background']; ?>" />
		</div>
	</label>

	<label>
		<span class="setting-description">Text color of the UI labels:</span>
		<div class="picker"><input type="text" name="css_color_label" id="css_color_label" class="color-picker"
		                           value="<?php echo $defaults['css_color_label']; ?>"
		                           data-default-color="<?php echo $this->settings_defaults['css_color_label']; ?>" />
		</div>
	</label>

	<label>
		<div class="setting-description">Font size of the UI labels:<br>
		<small>You can use any valide <code>font-size</code> CSS declaration (Use 'inherit' for default look).</small></div>
		<input type="text" name="css_size_label" value="<?php echo $defaults['css_size_label']; ?>"/>
	</label>

	<label>
		<div class="setting-description">Font family of the UI labels:<br>
		<small>You can use any valid <code>font-family</code> CSS declaration (Use 'inherit' for default look).</small></div>
		<input type="text" name="css_fontfamily_label" value="<?php echo $defaults['css_fontfamily_label']; ?>"/>
	</label>

	<label>
		<span class="setting-description">Background color of the dropdown items:</span>
		<div class="picker"><input type="text" name="css_color_highlight" id="css_color_highlight" class="color-picker"
		                           value="<?php echo $defaults['css_color_highlight']; ?>"
		                           data-default-color="""<?php echo $this->settings_defaults['css_color_highlight']; ?>" />
		</div>
	</label>

	<label>
		<span class="setting-description">Background color of the dropdown items when hovered:</span>
		<div class="picker"><input type="text" name="css_color_highlight_hover" id="css_color_highlight_hover"
		                           class="color-picker"
		                           value="<?php echo $defaults['css_color_highlight_hover']; ?>"
		                           data-default-color="<?php echo $this->settings_defaults['css_color_highlight_hover']; ?>" />
		</div>
	</label>

	<label>
		<span class="setting-description">Color of the slider and dropdown line:</span>
		<div class="picker"><input type="text" name="css_color_line" id="css_color_line" class="color-picker"
		                           value="<?php echo $defaults['css_color_line']; ?>"
		                           data-default-color="<?php echo $this->settings_defaults['css_color_line']; ?>" />
		</div>
	</label>

	<label>
		<span class="setting-description">Color of the slider handle:</span>
		<div class="picker"><input type="text" name="css_color_handle" id="css_color_handle" class="color-picker"
		                           value="<?php echo $defaults['css_color_handle']; ?>"
		                           data-default-color="<?php echo $this->settings_defaults['css_color_handle']; ?>" />
		</div>
	</label>

	<!--
	<label>
		<span class="setting-description">Color of the UI icons when selected:</span>
		<div class="picker"><input type="text" name="css_color_icon_active" id="css_color_icon_active"
		                           class="color-picker"
		                           value="<?php echo $defaults['css_color_icon_active']; ?>"
		                           data-default-color="<?php echo $this->settings_defaults['css_color_icon_active']; ?>" />
		</div>
	</label>

	<label>
		<span class="setting-description">Color of the UI icons when unselected:</span>
		<div class="picker"><input type="text" name="css_color_icon_inactive" id="css_color_icon_inactive"
		                           class="color-picker"
		                           value="<?php echo $defaults['css_color_icon_inactive']; ?>"
		                           data-default-color="<?php echo $this->settings_defaults['css_color_icon_inactive']; ?>" />
		</div>
	</label>
	-->


	<label>
		Sample texts
		<small>(use simple line breaks for each option to be displayed in the dropdown)</small>
		<textarea name="sample_texts" cols="60" rows="10"><?php echo $defaults['sample_texts']; ?></textarea>
	</label>
	<?php submit_button(); ?>
</form>
