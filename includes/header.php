<header id="fontsampler-menu">
	<ul>
		<li <?php if ( isset( $_GET['subpage'] ) && ( empty( $_GET['subpage'] ) || in_array( $_GET['subpage'], array(
				'edit',
				'create',
		) )
		) ) : echo 'class="current"'; endif; ?>>
			<a href="?page=fontsampler">Font samplers</a>
		</li>
		<li <?php if ( isset( $_GET['subpage'] ) && ( 'fonts' == $_GET['subpage'] || in_array( $_GET['subpage'], array(
				'font_edit',
				'font_create',
		) )
		) ) : echo 'class="current"'; endif; ?>>
			<a href="?page=fontsampler&amp;subpage=fonts">Fonts &amp; files</a>
		</li>
		<li <?php if ( isset( $_GET['subpage'] ) && ( 'settings' == $_GET['subpage'] || in_array( $_GET['subpage'], array(
				'font_edit',
				'font_create',
		) )
		) ) : echo 'class="current"'; endif; ?>>
			<a href="?page=fontsampler&amp;subpage=settings">Settings</a>
		</li>
		<li <?php if ( isset( $_GET['subpage'] ) && 'about' == $_GET['subpage'] ) : echo ' class="current"'; endif; ?>>
			<a href="?page=fontsampler&amp;subpage=about">About</a>
		</li>
	</ul>
</header>
