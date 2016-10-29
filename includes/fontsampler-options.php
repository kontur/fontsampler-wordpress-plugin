<label>
	<input type="checkbox" name="size"
	       data-default="<?php echo $default_settings['size'] ? 'checked' : ''; ?>"
	       data-set="<?php echo ( ! empty( $options['size'] ) ) ? 'checked' : ''; ?>"
		   <?php if ( ! empty( $options['size'] ) ) : echo ' checked="checked" '; endif; ?> >
	<span>Size control</span>
</label>
<label>
	<input type="checkbox" name="letterspacing"
	       data-default="<?php echo $default_settings['letterspacing'] ? 'checked' : ''; ?>"
	       data-set="<?php echo ( ! empty( $options['letterspacing'] ) ) ? 'checked' : ''; ?>"
		   <?php if ( ! empty( $options['letterspacing'] ) ) : echo ' checked="checked" '; endif; ?> >
	<span>Letter spacing control</span>
</label>
<label>
	<input type="checkbox" name="lineheight"
	       data-default="<?php echo $default_settings['lineheight'] ? 'checked' : ''; ?>"
	       data-set="<?php echo ( ! empty( $options['lineheight'] ) ) ? 'checked' : ''; ?>"
		   <?php if ( ! empty( $options['lineheight'] ) ) : echo ' checked="checked" '; endif; ?> >
	<span>Line height control</span>
</label>
<label>
	<input type="checkbox" name="sampletexts"
	       data-default="<?php echo $default_settings['sampletexts'] ? 'checked' : ''; ?>"
	       data-set="<?php echo ( ! empty( $options['sampletexts'] ) ) ? 'checked' : ''; ?>"
		   <?php if ( ! empty( $options['sampletexts'] ) ) : echo ' checked="checked" '; endif; ?> >
	<span>Display dropdown selection for sample texts</span>
</label>
<label>
	<input type="checkbox" name="alignment"
	       data-default="<?php echo $default_settings['alignment'] ? 'checked' : ''; ?>"
	       data-set="<?php echo ( ! empty( $options['alignment'] ) ) ? 'checked' : ''; ?>"
		   <?php if ( ! empty( $options['alignment'] ) ) : echo ' checked="checked" '; endif; ?> >
	<span>Alignment controls</span>
</label>
<label>
	<input type="checkbox" name="invert"
	       data-default="<?php echo $default_settings['invert'] ? 'checked' : ''; ?>"
	       data-set="<?php echo ( ! empty( $options['invert'] ) ) ? 'checked' : ''; ?>"
		<?php if ( ! empty( $options['invert'] ) ) : echo ' checked="checked" '; endif; ?> >
	<span>Allow inverting the text field to display negative text</span>
</label>
<label>
	<input type="checkbox" name="multiline"
	       data-default="<?php echo $default_settings['multiline'] ? 'checked' : ''; ?>"
	       data-set="<?php echo ( ! empty( $options['multiline'] ) ) ? 'checked' : ''; ?>"
		<?php if ( ! empty( $options['multiline'] ) ) : echo ' checked="checked" '; endif; ?> >
	<span>Allow line breaks</span>
</label>