<?php global $f; ?>

<h1>Fontsamplers</h1>

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
            <th>Files</th>
            <th>Settings</th>
            <th>Delete</th>
        </tr>
        </thead>
        <tbody>
    <?php foreach ($sets as $set): ?>
        <tr>
            <th><?php echo $set['id']; ?></th>
            <th><?php echo $set['post_name']; ?></th>
            <th></th>
            <th>
                <form method="post" style="display: inline-block;">
                    <input type="hidden" name="action" value="deleteSet">
                    <input type="hidden" name="id" value="<?php echo $set['id']; ?>">
                    <?php submit_button('Delete set'); ?>
                </form>
            </th>
        </tr>

    <?php endforeach; ?>
        </tbody>
    </table>
<?php endif; ?>