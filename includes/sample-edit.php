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

		<span>Add another fontset to this sampler</span><br><br>

		<small>Picking multiple font set will enable the select field for switching between fonts used in the
			Fontsampler.
		</small><br>
		<small>Use the arrow on the left to drag the order of the fonts. Use the minus on the right to remove fonts.</small>


		<h2>Interface options</h2>
		<h3>Initial text</h3>
		<div style="overflow: hidden;">
			<div class="fontsampler-admin-column-half">
			<label>
				<span>The initial text displayed in the font sampler, for example the font name or pangram. You can use multi-line text here as well.</span><br>
				<textarea name="initial" rows="5"
				          dir="<?php echo ( !isset( $set['is_ltr'] ) || $set['is_ltr'] == "1" ) ? 'ltr' : 'rtl'; ?>"><?php if ( ! empty( $set['initial'] ) ) : echo $set['initial']; endif; ?></textarea>
			</label>
			</div>
			<div class="fontsampler-admin-column-half">
				<p>Fontsampler direction is:</p>
				<label><input type="radio" name="is_ltr" value="1"
						<?php if ( empty( $set['is_ltr'] ) || $set['is_ltr'] == "1") : echo 'checked="checked"'; endif; ?>>
						<span>Left to Right</span></label>
				<label><input type="radio" name="is_ltr" value="0"
						<?php if ( isset( $set['is_ltr'] ) && $set['is_ltr'] == "0") : echo 'checked="checked"'; endif; ?>>
						<span>Right to Left</span></label>
			</div>
		</div>

		<div style="overflow: hidden;">
			<div class="fontsampler-options-checkbox fontsampler-admin-column-half">
				<fieldset>
					<legend>Common features</legend>

					<label>
						<input data-toggle-class="use-defaults" data-toggle-id="fontsampler-options-checkboxes" type="radio"
						       name="default_features" value="1"
							<?php if ( $set['default_features'] ): echo 'checked="checked"'; endif; ?>>
						<span>Use default features</span>
					</label>
					<label>
						<input data-toggle-class="use-defaults" data-toggle-id="fontsampler-options-checkboxes" type="radio"
						       name="default_features" value="0"
							<?php if ( ! $set['default_features'] ): echo 'checked="checked"'; endif; ?>>
						<span>Select custom features</span>
					</label>

					<div id="fontsampler-options-checkboxes" class="<?php echo $set['default_features'] ? 'use-defaults' : '';?> ">
						<?php
						$options = $set;
						include('fontsampler-options.php');
						?>
					</div>
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
		<div class="fontsampler-ui-preview">
			<input name="ui_order" type="hidden" value="<?php if ( ! empty( $set['ui_order'] ) ) : echo $set['ui_order']; endif; ?>">

			<?php

			// use these labels to substitute nicer description texts to stand in for the input names
			$labels = array(
				'fontsampler'   => 'Text input',
				'size'          => 'Font size slider',
				'letterspacing' => 'Letterspacing slider',
				'lineheight'    => 'Lineheight slider',
				'fontpicker'    => 'Font selection<br><small>(more than one font in set)</small>',
				'sampletexts'   => 'Sample text selection',
				'options'       => 'Alignment, Invert &amp; OT',
			);

			// fix a possibly missing 'fontpicker' UI element to be included in the ui_order_parsed
			if ( isset( $set['fonts'] ) && sizeof( $set['fonts'] ) > 1 ) {

				// since there is more than one font, a fontpicker should be present, check if this is the case
				$fontpicker_present = false;
				foreach ( $set['ui_order_parsed'] as $row ) {
					if ( isset( $row['fontpicker'] ) ) {
						$fontpicker_present = true;
						break;
					}
				}

				// loop through the ui_order_parsed array and insert fontpicker element first chance possible
				if ( ! $fontpicker_present ) {
					for ( $i = 0; $i < 3; $i++ ) {

						// should the current ui_order_parsed be only with one or two subarrays, create a new "row"
						if ( ! isset( $set['ui_order_parsed'][ $i ] ) ) {
							$set['ui_order_parsed'][ $i ] = array();
						}
						$row = $set['ui_order_parsed'][ $i ];

						// push the fontpicker into the first possible match for:
						// - not a row with 3 elements
						// - not a row with the 3 column spanning fontsampler elements
						if ( sizeof( $row ) < 3 && ! isset( $row['fontsampler'] ) ) {
							array_push( $set['ui_order_parsed'][ $i ], 'fontpicker');
							break;
						}
					}
				}
			}

			// keep track of what has already been rendered and what should get rendered invisibly (the rest) into the
			// placeholder
			$visible = array();
			$invisible = array();

			for ( $r = 0; $r < 3; $r++ ) : $row = isset( $set['ui_order_parsed'][ $r ] ) ? $set['ui_order_parsed'][ $r ] : null; ?>
				<ul class="fontsampler-ui-preview-list">
				<?php
				if ( $row and is_array( $row ) ) :
					foreach ( $row as $item ) :
				?>
					<li class="fontsampler-ui-block <?php if ( 'fontsampler' == $item ) : echo 'fontsampler-ui-placeholder-full'; endif; ?>"
					    data-name="<?php echo $item; ?>"><?php echo $labels[ $item ]; ?></li>
					<?php array_push( $visible, $item ); ?>
				<?php
					endforeach;
				endif;
				?>
				</ul>
			<?php endfor; ?>

			<ul class="fontsampler-ui-preview-placeholder">
				<?php
				$invisible = array_diff_key( $labels, array_flip( $visible ) );
				foreach ( $invisible as $key => $label ):
				?>
					<li class="fontsampler-ui-block" data-name="<?php echo $key; ?>"><?php echo $label; ?></li>
				<?php endforeach; ?>
			</ul>
		</div>
		<small>Only items you have selected above will be available for sorting in this preview.</small>
		<small>Below the elements in order of how they are displayed to the users of your site. <br>
			You can sort them by dragging and dropping.</small>
		<br>
		<?php submit_button(); ?>
	</form>
<?php endif; ?>
