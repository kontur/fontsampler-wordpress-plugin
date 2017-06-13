# Fontsampler Wordpress Plugin (v 0.2.6)
This plugin allows Wordpress users to embed interactive webfont previews in their websites.

## How does it work?
After installing and activating the plugin the Wordpress admin can create *Fontsamplers*. Each *Fontsampler* can be 
embedded in any Wordpress Page or Post with a simple shortcode like so:

> [fontsampler id=123]

In the place of the shortcode the plugin will render the appropriate interface for previewing and manipulating the 
font.

## Current status
The plugin is hosted on the [Wordpress plugin directory](https://wordpress.org/plugins/fontsampler/) and you can install 
it directly from your Wordpress admin panel. The plugin is free to use, including commercial websites. [Donations are welcome](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=LSK5YQHHCGGYS) and support continuous development and improvments. For improvements and suggestions, feel free to get involved by opening issues 
or feature requests here, or join [the discussion group](https://groups.google.com/forum/#!forum/fontsampler-wordpress-plugin-development) 
to hear more about the progress and development schedule.

## Supporting development
You can [donate to the plugin](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=LSK5YQHHCGGYS)'s continuous development effort via PayPal. The first effort in developing this plugin was funded via an [indiegogo campaign](https://www.indiegogo.com/projects/wordpress-plugin-for-letting-users-test-typefaces#/), which is now closed. Supporters are listed (if they wish) on the plugin's about page and documentation.

**Pull requests are more than welcome** as well, but let me know in the issues list what you are working on.

### Planned features not implemented yet
See the [issues](https://github.com/kontur/fontsampler-wordpress-plugin/issues) for the latest up-to-date information:

### Installing preview versions
**IMPORTANT DISCLAIMER: Install directly from this repository if you wish to contribute of check out latest development features. For regular use please install via the WP plugin interface.** 
I recommend to test the plugin on backup or local Wordpress installations, not in your website's 
production environment. At the very least back up your database and `wp-content` folder before testing the plugin. You 
have been warned!

* Go to [the releases tab](https://github.com/kontur/fontsampler-wordpress-plugin/releases) and download the "zip" archive
of the latest release
* In your Wordpress installation in the folder `wp-content/plugins` extract the archive into a new folder named "fontsampler"
* Login to your Wordpress admin
* Go to Plugins and activate the plugin
* You can now access the plugin options in the sidebar under `¶ Fontsampler`

# License
This code is distributed under the GNU General Public License v3.0. 
[See license](LICENSE.txt)

[Read a simplified version of what this license means](http://choosealicense.com/licenses/gpl-3.0/#)

(c) 2016-2017 Johannes Neumeier
