<?php
$settings_defaults = $this->settings_defaults;

function fs_output_color_field( $field, $description ) {
	global $defaults, $settings_defaults;
	ob_start(); ?>
	<label>
		<span class="setting-description styling-description"><?php echo $description; ?></span>
		<div class="picker">
			<input type="text" name="<?php echo $field; ?>"
			       id="?php echo $field; ?>" class="color-picker"
			       value="<?php echo $defaults[ $field ]; ?>"
			       data-default-color="<?php echo $settings_defaults[ $field ]; ?>"/>
		</div>
	</label>
	<?php return ob_get_clean();
}

function fs_output_color_fields( $fields ) {
	ob_start();
	foreach ( $fields as $field ) {
		echo fs_output_color_field( $field[0], $field[1] );
	}

	return ob_get_clean();
}

function fs_output_css_field( $field, $description, $additional ) {
	global $defaults;
	ob_start(); ?>
	<label>
			<span class="setting-description styling-description"><?php echo $description; ?><br>
			<small><?php echo $additional; ?></small></span>
		<input type="text" name="<?php echo $field; ?>" value="<?php echo $defaults[ $field ]; ?>"/>
	</label>
	<?php return ob_get_clean();
}

function fs_output_css_fields( $fields ) {
	ob_start();
	foreach ( $fields as $field ) {
		echo fs_output_css_field( $field[0], $field[1], $field[2] );
	}

	return ob_get_clean();
}
?>

<label>
		<span class="setting-description styling-description">Sample texts
		<small>(use simple line breaks for each option to be displayed in the dropdown)</small></span>
	<textarea name="sample_texts" cols="60" rows="10"><?php echo $defaults['sample_texts']; ?></textarea>
</label>

<div class="fontsampler-admin-settings-styling">
	<h2>Styling options</h2>
	<small>Adjust the color scheme of all fontsamplers you embed.</small>

	<?php
	echo fs_output_color_fields( array(
		array( 'css_color_text', 'Color of the fontsampler text:' ),
		array( 'css_color_background', 'Color of the fontsampler background:' ),
		array( 'css_color_label', 'Text color of the UI labels:' ),
	) );

	echo fs_output_css_fields( array(
		array(
			'css_size_label',
			'Font size of the UI labels:',
			"You can use any valid <code>font-size</code> CSS declaration (Use 'inherit' for default look)."
		),
		array(
			'css_fontfamily_label',
			'Font family of the UI labels:',
			"You can use any valid <code>font-family</code> CSS declaration (Use 'inherit' for default look)."
		),
	) );

	echo fs_output_color_fields( array(
		array( 'css_color_highlight', 'Background color of the dropdown items:' ),
		array( 'css_color_highlight_hover', 'Background color of the dropdown items when hovered:' ),
		array( 'css_color_line', 'Color of the slider and dropdown line:' ),
		array( 'css_color_handle', 'Color of the slider handle:' ),
	) );

	echo fs_output_css_fields( array(
		array(
			'css_column_gutter',
			'UI columns gutter:',
			"You can use any valid <code>size</code> CSS declaration (Default: 10px)."
		),
		array(
			'css_row_gutter',
			'UI rows gutter:',
			"You can use any valid <code>size</code> CSS declaration (Default: 10px)."
		),
		array(
			'css_row_height',
			'UI rows height:',
			"You can use any valid <code>size</code> CSS declaration (Default: 30px)."
		),
	) );
	?>
</div>