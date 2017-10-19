/**
 * All the jquery components dealing with file uploads on the admin side
 */
define(['jquery'], function ($) {

    function main(specimentools) {

        var that = this,
            $wrappers = $('.fontsampler-font-set .fontsampler-fontset-files');

        $wrappers.each(function (index, elem) {
            MediaUploader($(this));
        });

        // Simple wrapper for the functionality of any uploader
        function MediaUploader($wrapper) {

            var frame,
                addButton = $wrapper.find('.fontsampler-upload-font'),
                delButton = $wrapper.find('.fontsampler-remove-font'),
                idInput = $wrapper.find('.fontsampler-font-id'),
                preview = $wrapper.find('.fontsampler-font-upload-preview'),
                // this one is outside the row wrapper, so search upwards to the font-set wrapper
                nameContainer = $wrapper.closest(".fontsampler-font-set").find('input[name="fontname[]"]'),
                tools = specimentools;

            init();

            function init() {
                // ADD IMAGE LINK
                $wrapper.on('click', ".fontsampler-upload-font", onAddClick);

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
                frame.on('select', (function () {
                    // Get media attachment details from the frame state
                    var attachment = frame.state().get('selection').first().toJSON();

                    nameContainer.html(attachment.url);
                    idInput.val(attachment.id);
                    delButton.removeClass('hidden');

                    var file = attachment.filename;
                    var format = file.substr(file.lastIndexOf(".") + 1, file.length);

                    preview.html('<div data-fonts="' + attachment.url +'" data-initial-font="' + attachment.url + '" ' +
                        'class="fontsampler-wrapper">' +
                        '<div class="type-tester"><div class="fontsampler-interface">' +
                        '   <div autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"' +
                            'class="current-font type-tester__content">Preview</div></div></div></div>');

                    // speciment tools extracts the postscript name and adds it (by default) as
                    // data attribute; get that value and insert it as suggestion into name input
                    specimentools(window, (function () {
                        var fontName = nameContainer.closest(".fontsampler-font-set").find(".fontsampler-wrapper").data("initial-font-name")
                        var val = $.trim(nameContainer.val())
                        if ($.trim(nameContainer.val()) === "") {
                            nameContainer.val(fontName);

                            // trigger blur to trigger validation
                            nameContainer.trigger("blur");
                        }
                    }).bind(this));

                }).bind(this));

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
    }

    return main;

});