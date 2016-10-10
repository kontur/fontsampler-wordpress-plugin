<header id="fontsampler-menu">
    <ul>
        <li <?php if (empty($_GET['subpage']) || in_array($_GET['subpage'], array('edit', 'create'))): echo 'class="current"'; endif; ?>>
            <a href="?page=fontsampler">Font samplers</a>
        </li>
        <li <?php if ($_GET['subpage'] == 'fonts' || in_array($_GET['subpage'], array('font_edit', 'font_create'))): echo 'class="current"'; endif; ?>>
            <a href="?page=fontsampler&amp;subpage=fonts">Fonts &amp; files</a>
        </li>
        <li <?php if ($_GET['subpage'] == 'settings' || in_array($_GET['subpage'], array('font_edit', 'font_create'))): echo 'class="current"'; endif; ?>>
            <a href="?page=fontsampler&amp;subpage=settings">Settings</a>
        </li>
        <li <?php if ($_GET['subpage'] == 'about'): echo ' class="current"'; endif; ?>>
            <a href="?page=fontsampler&amp;subpage=about">About</a>
        </li>
    </ul>
</header>