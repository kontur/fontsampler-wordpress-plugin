/**
 * All the jquery components dealing with file uploads on the admin side
 */
define(['jquery'], function ($) {

    function main() {

        // Set all variables to be used in scope
        var frame,
            $wrappers = $('.fontsampler-upload-wrapper');

        $wrappers.each(function () {
            MediaUploader($(this));
        });

    }


    // Simple wrapper for the functionality of any uploader
    function MediaUploader($wrapper) {
        var frame,
            addImgLink = $wrapper.find('.upload-custom-img'),
            delImgLink = $wrapper.find('.delete-custom-img'),
            imgContainer = $wrapper.find('.custom-img-container'),
            imgIdInput = $wrapper.find('.custom-img-id');

        init();

        function init () {
            // ADD IMAGE LINK
            addImgLink.on('click', onAddClick);

            // DELETE IMAGE LINK
            delImgLink.on('click', onDelClick);
        }


        function onAddClick(event) {
            event.preventDefault();

            // If the media frame already exists, reopen it.
            if (frame) {
                frame.open();
                return;
            }

            // Create a new media frame
            frame = wp.media({
                title: 'Select or Upload Media Of Your Chosen Persuasion',
                button: {
                    text: 'Use this media'
                },
                multiple: false  // Set to true to allow multiple files to be selected
            });

            // When an image is selected in the media frame...
            frame.on('select', function () {
                // Get media attachment details from the frame state
                var attachment = frame.state().get('selection').first().toJSON();
                imgContainer.append('<img src="' + attachment.url + '" alt="" />');
                imgIdInput.val(attachment.id);
                addImgLink.addClass('hidden');
                delImgLink.removeClass('hidden');
            });

            // Finally, open the modal on click
            frame.open();
        }

        function onDelClick(event) {
            event.preventDefault();
            imgContainer.html('');
            addImgLink.removeClass('hidden');
            delImgLink.addClass('hidden');
            imgIdInput.val('');
        }
    }

    return main;

});