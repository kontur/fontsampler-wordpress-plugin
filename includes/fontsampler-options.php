<?php

function fs_output_slider( $label, $name, $value ) {
	ob_start(); ?>
	<label>
		<span class="setting-description"><?php echo $label; ?>
			<input data-name="<?php echo $name; ?>"
			       class="current-value"
			       value="<?php echo $value; ?>"
			       data-validation="number"
			       data-validation-allowing="range[1;256]">
		</span>
		<div class="slider">
			<input type="range" name="<?php echo $name; ?>"
			       value="<?php echo $value ?>"
			       min="1" max="255">
		</div>
	</label>
	<?php return ob_get_clean();
}

function fs_output_option_feature_label_row ($label, $name, $description, $default) {
	ob_start() ?>
	<div class="fontsampler-options-features-details-row">
		<strong>Label:</strong>
		<div>
			<label class="fontsampler-radio"><input type="radio" name="<?php echo $label; ?>_use_default" value="0"></label>
			<label>
				<span class="setting-description"><?php echo $description; ?></span>
				<input type="text" name="<?php echo $name; ?>_label" class="fontsampler-admin-slider-label"
		       value="<?php echo $default; ?>"/>
			</label>
		</div>
		<div>
			<label class="fontsampler-radio"><input type="radio" name="<?php echo $label; ?>_use_default" value="1"><span>Use default</span></label>
		</div>
	</div>
	<?php return ob_get_clean();
}

function fs_output_option_feature_slider_row ($header, $label, $slider_label, $slider_name, $slider_defaults) {
	ob_start(); ?>
	<div class="fontsampler-options-features-details-row">
		<strong><?php echo $header; ?>:</strong>
		<div>
			<label class="fontsampler-radio"><input type="radio" name="<?php echo $label; ?>_min_use_default" value="0"></label>
			<?php echo fs_output_slider( $slider_label, $slider_name, $slider_defaults ); ?>
		</div>
		<div>
			<label class="fontsampler-radio"><input type="radio" name="<?php echo $label; ?>_min_use_default" value="0"><span>Use Default</span></label>
		</div>
	</div>
	<?php return ob_get_clean();
}

$features = [
	'size'          => array(
		'name'                 => 'font_size',
		'label'                => 'Size control',
		'slider_label'         => 'Label:',
		'slider_initial_label' => 'Initial px:',
		'slider_min_label'     => 'Min px:',
		'slider_max_label'     => 'Max px:',
	),
	'letterspacing' => array(
		'name'                 => 'letter_spacing',
		'label'                => 'Letter spacing control',
		'slider_label'         => 'Label:',
		'slider_initial_label' => 'Initial px:',
		'slider_min_label'     => 'Min px:',
		'slider_max_label'     => 'Max px:',
	),
	'lineheight'    => array(
		'name'                 => 'line_height',
		'label'                => 'Line height control',
		'slider_label'         => 'Label:',
		'slider_initial_label' => 'Initial px:',
		'slider_min_label'     => 'Min px:',
		'slider_max_label'     => 'Max px:',
	)
];

$additional_features = [
	'sampletexts' => 'Display dropdown selection for sample texts',
	'fontpicker'  => 'Display fonts in this Fontsampler as dropdown selection (for several fonts) or label (for a single font)',
	'alignment'   => 'Alignment controls',
	'invert'      => 'Allow inverting the text field to display negative text',
	'opentype'    => 'Display OpenType feature controls (for those fonts where they are available)',
	'multiline'   => 'Allow line breaks',
];

// print all feature that have more specific slider defaults that can also be tweaked
foreach ( $features as $label => $f ) {
	global $defaults, $default_settings;
	?>
	<div>
		<label>
			<input type="checkbox" name="<?php echo $label; ?>"
			       data-default="<?php echo $default_settings[ $label ] ? 'checked' : ''; ?>"
			       data-set="<?php echo ( ! empty( $options[ $label ] ) ) ? 'checked' : ''; ?>"
				<?php if ( ! empty( $options[ $label ] ) ) : echo ' checked="checked" '; endif; ?> >
			<span><?php echo $f['label']; ?></span>
		</label>
		<button class="fontsampler-toggle-show-hide fontsampler-button-link">
			<span>Show details</span>
			<span>Hide details</span>
		</button>
		<div class="fontsampler-options-features-details">
			<?php
			echo fs_output_option_feature_label_row($label, $f['name'], $f['slider_label'], $default_settings[ $f['name'] . '_label'] );
			echo fs_output_option_feature_slider_row('Minimum:', $label, $f['slider_min_label'], $f['name'], $defaults[ $f['name'] . '_min' ]);
			echo fs_output_option_feature_slider_row('Initial:', $label, $f['slider_initial_label'], $f['name'], $defaults[ $f['name'] . '_initial' ]);
			echo fs_output_option_feature_slider_row('Maximum:', $label, $f['slider_max_label'], $f['name'], $defaults[ $f['name'] . '_max' ]);
			?>
		</div>
	</div>
<?php
}

// print all other features that are just checkboxes
foreach ( $additional_features as $label => $description ) { ?>
	<label>
		<input type="checkbox" name="<?php echo $label; ?>"
		       data-default="<?php echo $default_settings[ $label ] ? 'checked' : ''; ?>"
		       data-set="<?php echo ( ! empty( $options[ $label ] ) ) ? 'checked' : ''; ?>"
			<?php if ( ! empty( $options[ $label ] ) ) : echo ' checked="checked" '; endif; ?> >
		<span><?php echo $description; ?></span>
	</label>
	<?php
}
?>