<?php global $f; ?>

<h1>list sets</h1>

<?php
foreach ($sets as $set) {
	echo $set['id'] . ' ' . $set['post_name'] ; 
	?>


	[fontsampler id=<?php echo $set['id']; ?>]
	
	<form method="post" style="display:inline-block;">
		<input type="hidden" name="action" value="deleteSet">
		<input type="hidden" name="id" value="<?php echo $set['id']; ?>">

		<?php submit_button('Delete set'); ?>
	</form>

<?php
}
?>
