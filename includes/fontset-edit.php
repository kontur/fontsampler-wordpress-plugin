<h1>Upload new font file</h1>
<form method="post" enctype="multipart/form-data">
    <input type="hidden" name="action" value="font-edit">
    <input type="hidden" name="id" value="<?php echo empty($font['id']) ? 0 : $font['id']; ?>">

    <h2>Font name</h2>
    <p>Supply this mostly to make it able for you to tell different fonts apart for when you pick them
    into a font sampler. (e.g. "MyFont Regular Italic")</p>
    <label>Font name
        <input name="fontname" 
            <?php 
            if (empty($font['name'])) echo ' placeholder="e.g. MyFont Regular Italic" ';
            else echo ' value="' . $font['name'] . '" '; 
            ?>
        >
    </label>

    <h2>Font files</h2>
    <p>The following files will be used to render the actual font sampler. Note that you don't have to
    provide all formats. Supplying at the very least the 'woff' (and 'woff2' if possible) formats will
    cover a good amount of browsers.</p>
    <p>Note that these fonts are used for preview purposes only - what fonts you make available to customers
    is naturally independent from these files.</p>
    <p>Note further more that these files will be stored in your Wordpress Uploads folder. Once uploaded, 
    you can use the same files also for defining other font sets and reuse them in any number of font sets and
    font samplers.</p>
    <?php foreach ($formats as $format): ?>
    <label>Font file .<?php echo $format; ?>
        <input type="file" name="<?php echo $format; ?>">
        <?php if (!empty($font[$format])): ?>
            Current file: <?php echo $font[$format]; ?>
            <input type="hidden" name="existing_file_<?php echo $format; ?>" value="<?php echo $font[$format]; ?>">
        <?php endif; ?>
    </label>
    <?php endforeach; ?>
    <?php if (empty($font['id'])): submit_button('Upload'); else: submit_button('Update'); endif; ?>
</form>