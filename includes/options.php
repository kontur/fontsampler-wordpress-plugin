<h2>Options</h2>

<label class="fontsampler-radio">
	<input type="radio" name="use_default_options" value="1" ><span>Use default settings</span>
</label>
<label class="fontsampler-radio">
	<input type="radio" name="use_default_options" value="0" checked="checked"><span>Use custom settings</span>
</label>

<div class="fontsampler-options">
	<h3>Basic</h3>
	<fieldset>
		<p>Fontsampler script direction is:</p>
		<label><input type="radio" name="is_ltr" value="1"
				<?php if ( empty( $set['is_ltr'] ) || $set['is_ltr'] == "1" ) : echo 'checked="checked"'; endif; ?>>
			<span>Left to Right</span></label>
		<label><input type="radio" name="is_ltr" value="0"
				<?php if ( isset( $set['is_ltr'] ) && $set['is_ltr'] == "0" ) : echo 'checked="checked"'; endif; ?>>
			<span>Right to Left</span></label>

		<label>
			<span>The initial text displayed in the font sampler, for example the font name or pangram. You can use multi-line text here as well.</span><br>
			<textarea name="initial" rows="5"
			          dir="<?php echo ( ! isset( $set['is_ltr'] ) || $set['is_ltr'] == "1" ) ? 'ltr' : 'rtl'; ?>"><?php if ( ! empty( $set['initial'] ) ) : echo $set['initial']; endif; ?></textarea>
		</label>
	</fieldset>

	<h3>Features</h3>
	<fieldset>
		<?php include( plugin_dir_path( __FILE__ ) . 'fontsampler-options.php'); ?>
	</fieldset>

	<h3>Styling</h3>
	<fieldset>
		<?php include( plugin_dir_path( __FILE__ ) . 'fontsampler-styles.php'); ?>
	</fieldset>
</div>