<?php if ( empty( $fonts ) ) : ?>
	<div class="notice">
		<strong class="note">No font files found in the media gallery. Start by
			<a href="?page=fontsampler&amp;subpage=font_create">creating a fontset</a> and uploading its webfont
			formats.</strong>
	</div>
<?php else : ?>
	<h1><?php echo empty( $set['id'] ) ? 'New fontsampler' : 'Edit fontsampler ' . $set['id'] ?></h1>
	<p>Once you create the fontsampler, it will be saved with an ID you use to embed it on your wordpress pages</p>
	<form method="post" action="?page=fontsampler" id="fontsampler-edit-sample">
		<input type="hidden" name="action" value="edit_set">
		<?php if ( function_exists( 'wp_nonce_field' ) ) : wp_nonce_field( 'fontsampler-action-edit_set' ); endif; ?>
		<?php if ( ! empty( $set['id'] ) ) : ?><input type="hidden" name="id" value="<?php echo $set['id']; ?>"><?php endif; ?>

		<h2>Fonts</h2>

		<p>Pick which font set or sets to use:</p>
		<small>Picking multiple font set will enable the select field for switching between fonts used in the
			Fontsampler.
		</small><br>
		<small>Use the arrow on the left to drag the order of the fonts. Use the minus on the right to remove fonts.</small>
		<input type="hidden" name="fonts_order" value="<?php if ( ! empty( $fonts_order ) ) : echo $fonts_order; endif; ?>">
		<ul id="fontsampler-fontset-list">
			<?php if ( ! empty( $set['id'] ) && ! empty( $set['fonts'] ) ) : foreach ( $set['fonts'] as $existing_font ) : ?>
				<li>
					<span class="fontsampler-fontset-sort-handle">&varr;</span>
					<select name="font_id[]">
						<option value="0">--</option>
						<?php foreach ( $fonts as $font ) : ?>
							<option <?php if ( in_array( $existing_font['name'], $font ) ) : echo ' selected="selected"'; endif; ?>
								value="<?php echo $font['id']; ?>">
								<?php echo $font['name']; ?>
								<?php echo $font['id']; ?>
							</option>
						<?php endforeach; ?>
					</select>
					<button class="btn btn-small fontsampler-fontset-remove">&minus;</button>
				</li>
			<?php endforeach; ?>

			<?php else : ?>
				<li>
					<!-- for a new fontset, display one, non-selected, select choice -->
					<span class="fontsampler-fontset-sort-handle">&varr;</span>
					<select name="font_id[]">
						<option value="0">--</option>
						<?php foreach ( $fonts as $font ) : ?>
							<option value="<?php echo $font['id']; ?>"><?php echo $font['name']; ?></option>
						<?php endforeach; ?>
					</select>
					<button class="btn btn-small fontsampler-fontset-remove">&minus;</button>
					<span>Remove this fontset from sampler</span>
				</li>
			<?php endif; ?>
		</ul>
		<button class="btn btn-small fontsampler-fontset-add">+</button>
		<span>Add another fontset to this sampler</span>

		<h2>Interface options</h2>
		<h3>Initial text</h3>
		<label>
			<span>The initial text displayed in the font sampler, for example the font name or pangram. You can use multi-line text here as well.</span><br>
			<textarea name="initial" cols="60" rows="5"><?php if ( ! empty( $set['initial'] ) ) : echo $set['initial']; endif; ?></textarea>
		</label>

		<div>
			<div class="fontsampler-options-checkbox fontsampler-admin-column-half">
				<fieldset>
					<legend>Common features</legend>
					<label>
						<input type="checkbox" name="size" <?php if ( ! empty( $set['size'] ) ) : echo ' checked="checked" '; endif; ?> >
						<span>Size control</span>
					</label>
					<label>
						<input type="checkbox" name="letterspacing" <?php if ( ! empty( $set['letterspacing'] ) ) : echo ' checked="checked" '; endif; ?> >
						<span>Letter spacing control</span>
					</label>
					<label>
						<input type="checkbox" name="lineheight" <?php if ( ! empty( $set['lineheight'] ) ) : echo ' checked="checked" '; endif; ?> >
						<span>Line height control</span>
					</label>
					<label>
						<input type="checkbox" name="fontpicker" <?php if ( ! empty( $set['fontpicker'] ) ) : echo ' checked="checked" '; endif; ?> >
						<span>Display dropdown selection for multiple fonts </span>
						<small>(this will automatically be hidden if no more than one font are found)</small>
					</label>
					<label>
						<input type="checkbox" name="sampletexts" <?php if ( ! empty( $set['sampletexts'] ) ) : echo ' checked="checked" '; endif; ?> >
						<span>Display dropdown selection for sample texts</span>
					</label>
					<label>
						<input type="checkbox" name="alignment" <?php if ( ! empty( $set['alignment'] ) ) : echo ' checked="checked" '; endif; ?> >
						<span>Alignment controls</span>
					</label>
					<label>
						<input type="checkbox" name="invert" <?php if ( ! empty( $set['invert'] ) ) : echo ' checked="checked" '; endif; ?> >
						<span>Allow inverting the text field to display negative text</span>
					</label>
				</fieldset>
			</div>

			<div class="fontsampler-admin-column-half">
				<fieldset>
					<legend>Opentype options</legend>

				<p>Enable those features only if your fonts support them - the plugin simply offers the interface
					without
					checking availability.</p>
				<label>
					<input type="checkbox" name="ot_liga" <?php if ( ! empty( $set['ot_liga'] ) ) : echo ' checked="checked" '; endif; ?> >
					<span>Common ligatures</span>
				</label>
				<label>
					<input type="checkbox" name="ot_dlig" <?php if ( ! empty( $set['ot_dlig'] ) ) : echo ' checked="checked" '; endif; ?> >
					<span>Discretionary ligatures</span>
				</label>
				<label>
					<input type="checkbox" name="ot_hlig" <?php if ( ! empty( $set['ot_hlig'] ) ) : echo ' checked="checked" '; endif; ?> >
					<span>Historical ligatures</span>
				</label>
				<label>
					<input type="checkbox" name="ot_calt" <?php if ( ! empty( $set['ot_calt'] ) ) : echo ' checked="checked" '; endif; ?> >
					<span>Contextual alternates</span>
				</label>
				<hr>
				<label>
					<input type="checkbox" name="ot_frac" <?php if ( ! empty( $set['ot_frac'] ) ) : echo ' checked="checked" '; endif; ?> >
					<span>Fractions</span>
				</label>
				<label>
					<input type="checkbox" name="ot_sups" <?php if ( ! empty( $set['ot_sups'] ) ) : echo ' checked="checked" '; endif; ?> >
					<span>Superscript</span>
				</label>
				<label>
					<input type="checkbox" name="ot_subs" <?php if ( ! empty( $set['ot_subs'] ) ) : echo ' checked="checked" '; endif; ?> >
					<span>Subscript</span>
				</label>
				</fieldset>
			</div>
		</div>
		<h2>Interface layout</h2>
		<p>You can customize the layout of interface elements to differ from the defaults.</p>
		<small>Only items you have selected above will be available for sorting in this preview.</small>
		<div class="fontsampler-ui-preview">
			<input name="ui_order" type="hidden" value="<?php if ( ! empty( $set['ui_order'] ) ) : echo $set['ui_order']; endif; ?>">
			<small>Below the elements in order of how they are displayed to the users of your site. <br>
				You can sort them by dragging and dropping.</small>
			<?php if ( empty( $set['ui_order_parsed'] ) ) :
				$set['ui_order_parsed'] = $this->parse_ui_order( 'size,letterspacing,options|fontpicker,sampletexts,lineheight|fontsampler' );
			endif; ?>
			<?php
			$labels = array(
				'fontsampler' => 'Text input',
				'size' => 'Font size slider',
				'letterspacing' => 'Letterspacing slider',
				'lineheight' => 'Lineheight slider',
				'fontpicker' => 'Font selection',
				'sampletexts' => 'Sample text selection',
				'options' => 'Alignment, Invert &amp; OT',
			);
			$unchecked = array();
			?>
			<?php for ( $r = 0; $r < 3; $r++ ) : $row = isset( $set['ui_order_parsed'][ $r ] ) ? $set['ui_order_parsed'][ $r ] : null; ?>
				<ul class="fontsampler-ui-preview-list">
				<?php if ( $row ) : foreach ( $row as $item ) : ?>
					<li class="fontsampler-ui-block <?php if ( 'fontsampler' == $item ) : echo 'fontsampler-ui-placeholder-full'; endif; ?>"
					    data-name="<?php echo $item; ?>"><?php echo $labels[ $item ]; ?></li>
				<?php endforeach; endif; ?>
				</ul>
			<?php endfor; ?>
			<ul class="fontsampler-ui-preview-placeholder">

			</ul>
		</div>
		<br>
		<?php submit_button(); ?>
	</form>
<?php endif; ?>
