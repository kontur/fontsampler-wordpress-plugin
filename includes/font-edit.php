

<h1>Upload new font file</h1>
<form method="post" enctype="multipart/form-data">
    <input type="hidden" name="action" value="font-edit">
    <input type="hidden" name="id" value="<?php echo empty($font['id']) ? 0 : $font['id']; ?>">

    <label>Font name
        <input name="fontname" placeholder="e.g. MyFont Regular Italic">
    <label>Font file .woff (minimum recommended)
        <input type="file" name="fontfile_woff">
    </label>
    <label>Font file .woff2 (recommended)
        <input type="file" name="fontfile_woff2">
    </label>
    <?php submit_button('Upload'); ?>
</form>