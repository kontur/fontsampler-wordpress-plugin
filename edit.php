<?php global $f; ?>

<?php $fonts = $f->get_fonts($wpdb); ?>

<?php if (empty($fonts)): ?>
    <em>No font files found in the media gallery.</em>
<?php else: ?>
    <form method="post">
        <select name="fontfile">
            <?php

            foreach ($fonts as $font) {
                echo '<option value="' . $font['ID'] . '">';
                echo $font['post_title'];
                echo '</option>';
            }
            ?>
        </select>
        <?php submit_button(); ?>
    </form>
<?php endif; ?>