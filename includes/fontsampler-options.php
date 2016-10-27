<label>
	<input type="checkbox" name="size" <?php if ( ! empty( $options['size'] ) ) : echo ' checked="checked" '; endif; ?> >
	<span>Size control</span>
</label>
<label>
	<input type="checkbox" name="letterspacing" <?php if ( ! empty( $options['letterspacing'] ) ) : echo ' checked="checked" '; endif; ?> >
	<span>Letter spacing control</span>
</label>
<label>
	<input type="checkbox" name="lineheight" <?php if ( ! empty( $options['lineheight'] ) ) : echo ' checked="checked" '; endif; ?> >
	<span>Line height control</span>
</label>
<label>
	<input type="checkbox" name="fontpicker" <?php if ( ! empty( $options['fontpicker'] ) ) : echo ' checked="checked" '; endif; ?> >
	<span>Display dropdown selection for multiple fonts <small>(this will automatically be hidden if no more than one font are found)</small></span>
</label>
<label>
	<input type="checkbox" name="sampletexts" <?php if ( ! empty( $options['sampletexts'] ) ) : echo ' checked="checked" '; endif; ?> >
	<span>Display dropdown selection for sample texts</span>
</label>
<label>
	<input type="checkbox" name="alignment" <?php if ( ! empty( $options['alignment'] ) ) : echo ' checked="checked" '; endif; ?> >
	<span>Alignment controls</span>
</label>
<label>
	<input type="checkbox" name="invert" <?php if ( ! empty( $options['invert'] ) ) : echo ' checked="checked" '; endif; ?> >
	<span>Allow inverting the text field to display negative text</span>
</label>