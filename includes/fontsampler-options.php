<?php

//var_dump( "DEFAULTS", $defaults );
//var_dump( "SET", $set );
?>

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
			<input type="range" name="<?php echo $name; ?>_slider"
			       value="<?php echo $value ?>"
			       min="1" max="255">
		</div>
	</label>
	<?php return ob_get_clean();
}

function fs_output_option_feature_label_row( $use_default, $label, $name, $description, $default ) {
	ob_start() ?>
	<div class="fontsampler-options-features-details-row">
		<strong>Label</strong>
		<div>
			<label class="fontsampler-radio">
				<input type="radio" name="<?php echo $label; ?>_use_default" value="0"
					<?php if ( !$use_default ): echo ' checked="checked" '; endif; ?>>
			</label>
			<label>
				<span class="setting-description"><?php echo $description; ?></span>
				<input type="text" name="<?php echo $name; ?>_label" class="fontsampler-admin-slider-label"
				       value="<?php echo $default; ?>"/>
			</label>
		</div>
		<div>
			<label class="fontsampler-radio">
				<input type="radio" name="<?php echo $label; ?>_use_default" value="1"
					<?php if ( $use_default ): echo ' checked="checked" '; endif; ?>>
				<span>Use default: <?php echo $default; ?></span>
			</label>
		</div>
	</div>
	<?php return ob_get_clean();
}

function fs_output_option_feature_slider_row( $use_default, $header, $label, $slider_label, $slider_name, $slider_default ) {
	ob_start(); ?>
	<div class="fontsampler-options-features-details-row">
		<strong><?php echo $header; ?></strong>
		<div>
			<label class="fontsampler-radio">
				<input type="radio" name="<?php echo $label; ?>_use_default" value="0"
					<?php if ( !$use_default ): echo ' checked="checked" '; endif; ?>>
			</label>
			<?php echo fs_output_slider( $slider_label, $slider_name, $slider_default ); ?>
		</div>
		<div>
			<label class="fontsampler-radio">
				<input type="radio" name="<?php echo $label; ?>_use_default" value="1"
					<?php if ( $use_default ): echo ' checked="checked" '; endif; ?>>
				<span>Use Default: <?php echo $slider_default; ?></span>
			</label>
		</div>
	</div>
	<?php return ob_get_clean();
}

$features = [
	'font_size'      => array(
		'name'                 => 'font_size',
		'label'                => 'Size control',
		'slider_label'         => 'Label',
		'slider_initial_label' => 'Initial px',
		'slider_min_label'     => 'Min px',
		'slider_max_label'     => 'Max px',
	),
	'letter_spacing' => array(
		'name'                 => 'letter_spacing',
		'label'                => 'Letter spacing control',
		'slider_label'         => 'Label',
		'slider_initial_label' => 'Initial px',
		'slider_min_label'     => 'Min px',
		'slider_max_label'     => 'Max px',
	),
	'line_height'    => array(
		'name'                 => 'line_height',
		'label'                => 'Line height control',
		'slider_label'         => 'Label',
		'slider_initial_label' => 'Initial px',
		'slider_min_label'     => 'Min px',
		'slider_max_label'     => 'Max px',
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

foreach ( $features as $label => $f ) {
	?>
	<div>
		<label>
			<input type="checkbox" name="<?php echo $label; ?>"
			       data-default="<?php echo $defaults[ $label ] ? 'checked' : ''; ?>"
			       data-set="<?php echo ( ! empty( $set[ $label ] ) ) ? 'checked' : ''; ?>"
				<?php if ( ! empty( $set[ $label ] ) ) : echo ' checked="checked" '; endif; ?> >
			<span><?php echo $f['label']; ?></span>
		</label>
		<button class="fontsampler-toggle-show-hide fontsampler-button-link">
			<span>Show details</span>
			<span>Hide details</span>
		</button>
		<div class="fontsampler-options-features-details">
			<?php
			$use_default = ( empty( $set['set_id'] ) );
			echo fs_output_option_feature_label_row( $use_default, $label, $f['name'], $f['slider_label'],
				$defaults[ $f['name'] . '_label' ] );

			echo fs_output_option_feature_slider_row( $use_default, 'Minimum', $label . '_min', $f['slider_min_label'],
				$f['name'] . '_min_value', $defaults[ $f['name'] . '_min' ] );

			echo fs_output_option_feature_slider_row( $use_default, 'Initial', $label . '_initial', $f['slider_initial_label'],
				$f['name'] . '_initial_value', $defaults[ $f['name'] . '_initial' ] );

			echo fs_output_option_feature_slider_row( $use_default, 'Maximum', $label . '_max', $f['slider_max_label'],
				$f['name'] . '_max_value', $defaults[ $f['name'] . '_max' ] );
			?>
		</div>
	</div>
	<?php
}

// print all feature that have more specific slider defaults that can also be tweaked

// print all other features that are just checkboxes
foreach ( $additional_features as $label => $description ) { ?>
	<div>
		<label>
			<input type="checkbox" name="<?php echo $label; ?>"
			       data-default="<?php echo $defaults[ $label ] ? 'checked' : ''; ?>"
			       data-set="<?php echo ( ! empty( $options[ $label ] ) ) ? 'checked' : ''; ?>"
				<?php if ( ! empty( $options[ $label ] ) ) : echo ' checked="checked" '; endif; ?> >
			<span><?php echo $description; ?></span>
		</label>
	</div>
	<?php
}
?>