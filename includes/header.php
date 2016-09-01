<ul id="fontsampler-menu">
    <li <?php if (empty($_GET['subpage']) || in_array($_GET['subpage'], array('edit', 'create'))): echo 'class="current"'; endif; ?>>
    	<a href="?page=fontsampler">Font samplers</a>
	</li>
    <li <?php if ($_GET['subpage'] == 'fonts' || in_array($_GET['subpage'], array('font_edit', 'font_create'))): echo 'class="current"'; endif; ?>>
    	<a href="?page=fontsampler&subpage=fonts">Fonts &amp; files</a>
    </li>
</ul>