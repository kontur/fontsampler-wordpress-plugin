<div class="fontsampler-upload-wrapper">
	<?php
	// Get WordPress' media upload URL
	$upload_link = esc_url( get_upload_iframe_src( 'image' ) );
	$image_src = wp_get_attachment_image_src( $image_id, 'full' );
	$has_image = is_array( $image_src );
	?>
	<!-- Your image container, which can be manipulated with js -->
	<div class="custom-img-container">
		<?php if ( $has_image ) : ?>
			<img src="<?php echo $image_src[0] ?>" alt="" style="max-width:100%;"/>
		<?php endif; ?>
	</div>

	<!-- Your add & remove image links -->
	<p class="hide-if-no-js">
		<a class="upload-custom-img <?php if ( $has_image ) : echo 'hidden'; endif; ?>"
		   href="<?php echo $upload_link ?>">Set custom image</a>

		<a class="delete-custom-img <?php if ( ! $has_image ) : echo 'hidden'; endif; ?>"
		   href="#">Remove this image</a>
	</p>

	<input class="custom-img-id" name="<?php echo $image_name; ?>" type="hidden"
	       value="<?php echo esc_attr( $image_id ); ?>"/>
</div>

<?php
// unset so if called another time but with missing vars it does not default
// to these previously used ones
unset($image_id);
unset($image_name);
?>