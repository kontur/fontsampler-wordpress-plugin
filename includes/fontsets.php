<h1>Font sets &amp; files</h1>
<p>Listed here are the fonts and the file formats that are provided for displaying them.</p>
<p>In order to make font samplers you need to first create a font set (the different webfont format versions of the font you want to demo) and upload at least one format for the font. If you want to use a font sampler that has a font switcher, for example to preview different weights or styles of the same typeface, you need to create a font set for each of them.</p>


<table>
    <thead>
    <tr>
        <th>Font name</th>
        <th>Formats</th>
        <th>Edit</th>
        <th>Delete</th>
    </tr>
    </thead>
    <tbody>
    <?php foreach ($fonts as $font): ?>
        <tr>
            <td><?php echo $font['name']; ?></td>
            <td>
            <?php foreach ($formats as $format): ?>
                <?php echo $format . ': <span class="filename">' . $font[$format]; ?></span><br>
            <?php endforeach; ?>
            </td>
            <td>
                <form method="post" action="?page=fontsampler&subpage=font_edit&id=<?php echo $font['id']; ?>">
                    <?php submit_button('edit'); ?>
                </form>
            </td>
            <td>
                <form method="post" action="?page=fontsampler&subpage=font_delete">
                    <input type="hidden" name="id" value="<?php echo $font['id']; ?>">
                    <?php submit_button('delete', 'secondary'); ?>
                </form>
            </td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>

<a class="button button-primary" href="?page=fontsampler&subpage=font_create">Create a new font record</a>