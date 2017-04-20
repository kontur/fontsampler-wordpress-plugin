/**
 * All the jquery components dealing with file uploads on the admin side
 */
define(['jquery'], function ($) {

    function main() {
        // Set all variables to be used in scope
        var frame,
            $wrappers = $('.fontsampler-fontset-files');

        $wrappers.each(function () {
            MediaUploader($(this));
        });

    }

    // Simple wrapper for the functionality of any uploader
    function MediaUploader($wrapper) {
        var frame,
            addButton = $wrapper.find('.fontsampler-upload-font'),
            delButton = $wrapper.find('.fontsampler-remove-font'),
            nameContainer = $wrapper.find('.fontsampler-font-container .filename'),
            idInput = $wrapper.find('.fontsampler-font-id');

        init();

        function init () {
            // ADD IMAGE LINK
            addButton.on('click', onAddClick);

            // DELETE IMAGE LINK
            delButton.on('click', onDelClick);
        }


        function onAddClick(event) {

            // If the media frame already exists, reopen it.
            if (frame) {
                frame.open();
                return;
            }

            // Create a new media frame
            frame = wp.media({
                title: 'Select or Upload the webfont',
                button: {
                    text: 'Use this media'
                },
                multiple: false  // Set to true to allow multiple files to be selected
            });

            // When an image is selected in the media frame...
            frame.on('select', function () {
                // Get media attachment details from the frame state
                var attachment = frame.state().get('selection').first().toJSON();

                nameContainer.html(attachment.url);//append('<img src="' + attachment.url + '" alt="" />');
                idInput.val(attachment.id);
                delButton.removeClass('hidden');
            });

            // Finally, open the modal on click
            frame.open();
        }

        function onDelClick(event) {
            event.preventDefault();
            nameContainer.html('');
            delButton.addClass('hidden');
            idInput.val('');
        }
    }

    return main;

});