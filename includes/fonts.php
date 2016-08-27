<h1>Font &amp; files</h1>
<p>Listed here are the fonts and the file formats that are provided for displaying them.</p>
<p>In order to make font samplers you need to first create a font set and upload at least one format for the font.</p>


<table>
    <thead>
    <tr>
        <th>Font name</th>
        <th>Formats</th>
    </tr>
    </thead>
    <tbody>
    <?php foreach ($fonts as $font): ?>
        <tr>
            <td><?php echo $font['name']; ?></td>
            <td>Woff: <?php echo $font['woff_file']; ?><br>
                Woff2: <?php echo $font['woff2_file']; ?></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>

<a href="?page=fontsampler&subpage=font_create">Create a new font record</a>