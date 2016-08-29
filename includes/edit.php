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
        <div class="fontsampler-options-checkbox">
            <label>
                <input type="checkbox" name="size" <?php if (!empty($set['size'])) echo ' checked="checked" '; ?>>
                <span>Size control</span>
            </label>
            <label>
                <input type="checkbox" name="letterspacing" <?php if (!empty($set['letterspacing'])) echo ' checked="checked" '; ?>>
                <span>Letter spacing control</span>
            </label>
            <label>
                <input type="checkbox" name="lineheight" <?php if (!empty($set['lineheight'])) echo ' checked="checked" '; ?>>
                <span>Line height control</span>
            </label>
            <label>
                <input type="checkbox" name="fontpicker" <?php if (!empty($set['fontpicker'])) echo ' checked="checked" '; ?>>
                <span>Display picker for multiple fonts</span>
            </label>
            <label>
                <input type="checkbox" name="sampletexts" <?php if (!empty($set['sampletexts'])) echo ' checked="checked" '; ?>>
                <span>Display picker for sample texts</span>
            </label>
            <label>
                <input type="checkbox" name="alignment" <?php if (!empty($set['alignment'])) echo ' checked="checked" '; ?>>
                <span>Alignment controls</span>
            </label>
            <label>
                <input type="checkbox" name="invert" <?php if (!empty($set['invert'])) echo ' checked="checked" '; ?>>
                <span>Allow inverting the text field to display negative text</span>
            </label>
        </div>
        <h3>Css options</h3>
        <h3>Published</h3>
        <?php submit_button(); ?>
    </form>
<?php endif; ?>