<?php global $f; ?>

<form method="post">
	<select name="fontfile">
		<?php 
		$fonts = $f->get_fonts($wpdb); 
		foreach ($fonts as $font) {
			echo '<option value="' . $font['ID'] . '">';
			echo $font['post_title'];
			echo '</option>';
		}
		?>
	</select>
	<?php submit_button(); ?>
</form>