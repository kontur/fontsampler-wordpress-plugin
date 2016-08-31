<h1>Font samplers</h1>
<p>Listed here are all the font samplers you have created so far.</p>
<p>A font sampler is a number (or just one) font set and settings that are used to display a interface for testing a font (or several in one).</p>
<p>You can include your font samplers on any page or post by adding the respective shortcode listed in the table below.</p>

<?php if (empty($sets)) : ?>
    <em>No sets created yet.</em>
    <p>This is where your created font samplers will be listed once you've added some below.</p>
    <p>To begin with you need to have some webfont files in your media gallery. You can use the below font upload
        interface just as well.</p>

<?php else: ?>
    <table>
        <thead>
        <tr>
            <th>Id</th>
            <th>Name</th>
            <th>Fonts<br><small>List one or more font sets used in this sampler</small></th>
            <th>Settings</th>
            <th>Shortcode<br><small>Copy this code including brackets and insert them where you want to render the font sampler</small></th>
            <th>Edit</th>
            <th>Delete</th>
        </tr>
        </thead>
        <tbody>
    <?php foreach ($sets as $set): ?>
        <tr>
            <td><?php echo $set['id']; ?></td>
            <td><?php echo $set['name']; ?></td>
            <td>
                <ul>
                <?php foreach ($set['fonts'] as $font): ?>
                    <li><a href="?page=fontsampler&amp;subpage=font_edit&amp;id=<?php echo $font['id']; ?>"><?php echo $font['name']; ?></a></li>
                <?php endforeach; ?>
                </ul>
            </td>
            <td></td>
            <td><code>[fontsampler id=<?php echo $set['id']; ?>]</code></td>
            <td>
                <form method="post" action="?page=fontsampler&amp;subpage=edit&amp;id=<?php echo $set['id']; ?>" style="display: inline-block;">
                    <?php submit_button('Edit set'); ?>
                </form>
                </td>
            <td>
                <form method="post" action="?page=fontsampler" style="display: inline-block;">
                    <input type="hidden" name="action" value="deleteSet">
                    <input type="hidden" name="id" value="<?php echo $set['id']; ?>">
                    <?php submit_button('Delete set', 'secondary'); ?>
                </form>
            </td>
        </tr>

    <?php endforeach; ?>
        </tbody>
    </table>
<?php endif; ?>


<a class="button button-primary" href="?page=fontsampler&subpage=create">Create a new font sampler</a>