<ul id="fontsampler-menu">
    <li <?php if (empty($_GET['subpage']) || $_GET['subpage'] == 'edit'): echo 'class="current"'; endif; ?>>
    	<a href="?page=fontsampler">Font samplers</a>
	</li>
    <li <?php if ($_GET['subpage'] == 'fonts' || $_GET['subpage'] == 'font_edit'): echo 'class="current"'; endif; ?>>
    	<a href="?page=fontsampler&subpage=fonts">Fonts &amp; files</a>
    </li>
</ul>