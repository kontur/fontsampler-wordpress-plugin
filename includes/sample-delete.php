<?php if ( empty( $set['id'] ) ) : ?>
	<h1>Nothing selected to delete.</h1>
<?php else : ?>
	<?php // TODO check and list if this fontsampler is in use somewhere ?>
	<h1>Do you really want to delete the Fontsampler <?php echo $set['id']; ?>?</h1>
	<form method="post" action="?page=fontsampler">
		<input type="hidden" name="action" value="delete_set">
		<?php if ( function_exists( 'wp_nonce_field' ) ) : wp_nonce_field( 'fontsampler-action-delete_set' ); endif; ?>
		<?php if ( ! empty( $set['id'] ) ) : ?><input type="hidden" name="id" value="<?php echo $set['id']; ?>"><?php endif; ?>

		<?php submit_button( 'Yes, delete' ); ?>
	</form>
	<p><a href="?page=fontsampler">Back without deleting.</a></p>
<?php endif; ?>
