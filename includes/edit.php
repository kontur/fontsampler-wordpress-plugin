<?php if (empty($fonts)): ?>
    <em>No font files found in the media gallery.</em>
<?php else: ?>
    <h1><?php echo empty($set['id']) ? "New fontsampler" : "Edit fontsampler " .$set['id'] ?></h1>
    <p>Once you create the fontsampler, it will be saved with an ID you use to embed it on your wordpress pages</p>
    <form method="post" action="?page=fontsampler">
        <input type="hidden" name="action" value="editSet">
        <?php if (!empty($set['id'])): ?>
            <input type="hidden" name="id" value="<?php echo $set['id']; ?>">
        <?php endif; ?>

        <h2>Fonts</h2>
        <p>Pick which web font set to use</p>
        <select name="font_id">
            <?php foreach ($fonts as $font): ?>
                <option value="<?php echo $font['id']; ?>">
                <?php echo $font['name']; ?>
                </option>
            <?php endforeach;?>
        </select>
        <h2>Options</h2>
        <h3>Interface options</h3>
        <h3>Css options</h3>
        <h3>Published</h3>
        <?php submit_button(); ?>
    </form>
<?php endif; ?>