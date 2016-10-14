<?php global $f; ?>

<div class="fontsampler-interface">
	<div class="fontsampler-interface-row fontsampler-interface-primary">
		<?php if ( $set['size'] ) : ?>
			<label class="fontsampler-slider">
				<span class="slider-label"><?php echo $replace['font_size_label']; ?></span>
				<span class="slider-value"><?php echo $replace['font_size_initial']; ?>
					&nbsp;<?php echo $replace['font_size_unit']; ?></span>
				<input type="range" min="<?php echo $replace['font_size_min']; ?>"
				       max="<?php echo $replace['font_size_max']; ?>" value="<?php echo $replace['font_size_initial']; ?>"
				       data-unit="<?php echo $replace['font_size_unit']; ?>" name="font-size">
			</label>
		<?php endif; ?>

		<?php if ( $set['letterspacing'] ) : ?>
			<label class="fontsampler-slider">
				<span class="slider-label"><?php echo $replace['letter_spacing_label']; ?></span>
				<span class="slider-value"><?php echo $replace['letter_spacing_initial']; ?>
					&nbsp;<?php echo $replace['letter_spacing_unit']; ?></span>
				<input type="range" min="<?php echo $replace['letter_spacing_min']; ?>"
				       max="<?php echo $replace['letter_spacing_max']; ?>"
				       value="<?php echo $replace['letter_spacing_initial']; ?>"
				       data-unit="<?php echo $replace['letter_spacing_unit']; ?>" name="letter-spacing">
			</label>
		<?php endif; ?>

		<?php if ( $set['lineheight'] ) : ?>
			<label class="fontsampler-slider">
				<span class="slider-label"><?php echo $replace['line_height_label']; ?></span>
				<span class="slider-value"><?php echo $replace['line_height_initial']; ?>
					&nbsp;<?php echo $replace['line_height_unit']; ?></span>
				<input type="range" min="<?php echo $replace['line_height_min']; ?>"
				       max="<?php echo $replace['line_height_max']; ?>"
				       value="<?php echo $replace['line_height_initial']; ?>"
				       data-unit="<?php echo $replace['line_height_unit']; ?>" name="line-height">
			</label>
		<?php endif; ?>
	</div>

	<div class="fontsampler-interface-row fontsampler-interface-secondary">
		<?php if ( $set['fontpicker'] && sizeof( $fonts ) > 1 ) : ?>
			<select name="font-selector">
				<?php foreach ( $fonts as $font ) : ?>
					<option
						data-font-files='<?php echo $f->fontfiles_JSON( $font ); ?>'><?php echo $font['name']; ?></option>
				<?php endforeach; ?>
			</select>
		<?php endif; ?>

		<?php $samples = explode( "\n", $replace['sample_texts'] ); ?>
		<?php if ( $set['sampletexts'] ) : ?>
			<select name="sample-text">
				<option value="Select a sample text">Select a sample text</option>
				<?php foreach ( $samples as $sample ) : ?>
					<option value="<?php echo $sample; ?>"><?php echo $sample; ?></option>
				<?php endforeach; ?>
			</select>
		<?php endif; ?>

		<?php if ( $set['alignment'] ) : ?>
			<div class="fontsampler-multiselect three-items" data-name="alignment">
				<button class="fontsampler-multiselect-selected" data-value="left"><img
						src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/align-left.svg"></button>
				<button data-value="center"><img
						src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/align-center.svg"></button>
				<button data-value="right"><img src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/align-right.svg">
				</button>
			</div>
		<?php endif; ?>

		<?php if ( $set['invert'] ) : ?>
			<div class="fontsampler-multiselect two-items" data-name="invert">
				<button class="fontsampler-multiselect-selected" data-value="positive"><img
						src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/invert-white.svg"></button>
				<button data-value="negative"><img
						src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/invert-black.svg"></button>
			</div>
		<?php endif; ?>

		<div class="fontsampler-multiselect one-item fontsampler-opentype">
			<button class="fontsampler-opentype-toggle">O</button>
			<div class="fontsampler-opentype-features">
				<?php if ( $set['ot_liga'] ) : ?>
					<button class="fontsampler-toggle" data-feature="liga"><img
							src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/ligatures.svg" alt="Ligatures"></button>
				<?php endif; ?>
				<?php if ( $set['ot_dlig'] ) : ?>
					<button class="fontsampler-toggle" data-feature="dlig"><img
							src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/dligatures.svg"
							alt="Discretionary ligatures"></button>
				<?php endif; ?>
				<?php if ( $set['ot_hlig'] ) : ?>
					<button class="fontsampler-toggle" data-feature="hlig"><img
							src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/hligatures.svg" alt="Historical ligatures">
					</button>
				<?php endif; ?>
				<?php if ( $set['ot_calt'] ) : ?>
					<button class="fontsampler-toggle" data-feature="calt"><img
							src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/alternates.svg" alt="Contextual alternates">
					</button>
				<?php endif; ?>
				<?php if ( $set['ot_frac'] ) : ?>
					<button class="fontsampler-toggle" data-feature="frac"><img
							src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/fractions.svg" alt="Fractions"></button>
				<?php endif; ?>
				<?php if ( $set['ot_sups'] ) : ?>
					<button class="fontsampler-toggle" data-feature="sups"><img
							src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/sup.svg" alt="Superscript"></button>
				<?php endif; ?>
				<?php if ( $set['ot_subs'] ) : ?>
					<button class="fontsampler-toggle" data-feature="subs"><img
							src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/sub.svg" alt="Subscript"></button>
				<?php endif; ?>
				<!--<button class="fontsampler-toggle" data-feature="swsh"><img src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/.svg" alt="Swashes"></button>-->
				<!--<button class="fontsampler-toggle" data-feature="ss"><img src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/.svg" alt="Stylistic sets"></button>-->
				<!--<button class="fontsampler-toggle" data-feature=""><img src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/.svg" alt="Oldstyle figures"></button>-->
				<!--<button class="fontsampler-toggle" data-feature="lnum"><img src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/.svg" alt="Lining figures"></button>-->
				<!--<button class="fontsampler-toggle" data-feature=""><img src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/.svg" alt="Localized forms"></button>-->
			</div>
		</div>
	</div>
</div>
