/** 
 * All the jquery components dealing with manipulating the
 * UI layout of fontsamplers in the admin area
 */
define(['jquery'], function ($) {

    function main(specimentools, specimenttoolsUI) {

        var $admin = $("#fontsampler-admin"),
            $list = $("#fontsampler-ui-blocks-list"),
            $preview = $("#fontsampler-ui-layout-preview"),
            $previewOptions = $("#fontsampler-ui-layout-preview-options"),
            $ui_order = $("input[name=ui_order]"),
            $uiBlockCheckboxes = $("input.fontsampler-checkbox-ui-block"),

            layoutClasses = ["full", "column", "inline"],
            columnsClasses = "columns-1 columns-2 columns-3 columns-4",
            interfaceClass = "fontsampler-interface",
            blockMenuClass = "fontsampler-ui-block-menu-open";

        if ($preview.length) {
            reloadPreview();
        }


        /**
         * Listen for changes to the block layout via the block overlay in the preview
         */
        $preview.on("change", ".fontsampler-ui-block-overlay input[type=radio]", changeBlockClass);
        function changeBlockClass() {
            var item = $(this).closest(".fontsampler-ui-block-overlay").data("item");
            var $previewBlock = $preview.find(".fontsampler-ui-block[data-block=" + item + "]");
            $previewBlock.removeClass(layoutClasses.join(" ")).addClass($(this).val());
            setUIOrder();
        }


        /**
         * Listen for changes to the layout column count
         */
        $previewOptions.on("change", "input[type=radio]", changeColumnCount);
        function changeColumnCount() {
            var cols = $(this).data('value'),
                colsClass = "columns-" + cols;

            $preview.removeClass(columnsClasses).addClass(colsClass);
            $("." + interfaceClass).removeClass(columnsClasses).addClass(colsClass);

            // trigger resize to make the sliders' bar and handle update implicitly
            $(document, window).trigger("resize");
        }


        /**
         * Listen for changes in the buy and specimen URL input fields
         *
         * When either of the field is not empty, make sure it is included in the
         * layout preview
         */
        $admin.find("input[name=buy],input[name=specimen]").on("change keyup", onUrlInput);
        function onUrlInput() {
            var item = $(this).attr("name"),
                val = $.trim($(this).val()),
                included = inUIOrder(item);

            if (!included && val !== "") {
                addToUIOrder(item);
                reloadPreview();
            }

            if (included && val === "") {
                removeFromUIOrder(item);
                reloadPreview();
            }
        }


        $preview.on("click", ".fontsampler-ui-block-settings", onToggleBlockSettings);
        function onToggleBlockSettings(e) {
            e.preventDefault();
            var $block = $(this).closest(".fontsampler-ui-block"),
                hasMenuClass = $block.hasClass(blockMenuClass);

            $(this).closest(".fontsampler-interface").find("." + blockMenuClass).removeClass(blockMenuClass);
            if (!hasMenuClass) {
                $(this).closest(".fontsampler-ui-block").addClass(blockMenuClass);
            }
        }


        $preview.on("hover", ".fontsampler-ui-block", onHoverUiBlock);
        function onHoverUiBlock() {
            $(this).closest(".fontsampler-interface").find("." + blockMenuClass).removeClass(blockMenuClass);
        }


        $preview.on("click", ".fontsampler-ui-block-add-break", onAddRowBreak);
        function onAddRowBreak(e) {
            e.preventDefault();
            $(this).closest(".fontsampler-ui-block").after('<div class="fontsampler-interface-row-break">ROW BREAK</div>');
            setUIOrder();
        }


        /**
         * Reloading the preview mock
         */
        function reloadPreview() {
            var ui_order = $ui_order.val(),
                ui_columns = $previewOptions.find("input[type=radio]:checked").data('value'),

                data = {
                    'action': 'get_mock_fontsampler',
                    'data': {
                        "ui_columns": ui_columns,
                        "ui_order": ui_order,
                        "initial": "Layout preview only, for arranging the layout blocks"
                    }
                };

            //console.log(data.data);

            // since 2.8 ajaxurl is always defined in the admin header and points to admin-ajax.php
            $.post(ajaxurl, data, function (response) {
                $preview.html(response);

                specimentools(window, function (wrapper, pubsub) {
                    specimenttoolsUI( wrapper, pubsub );
                    $preview.find('.fontsampler-wrapper').removeClass("on-loading");

                    $(".fontsampler-interface").sortable({
                        stop: onSortEnd
                    });

                });
            });
        }


        /**
         * After each sorting ends iterate through the elements in the preview and
         * compile a new and updated ui_order
         */
        function onSortEnd() {
            var sortedOrder = $(".fontsampler-interface").children().map(function () {
                var cssClasses = $(this).attr("class").split(" "),
                    layoutClass = "",
                    isRowBreak = $(this).hasClass("fontsampler-interface-row-break");

                if (isRowBreak) {
                    return "|";
                } else {
                    for (var i = 0; i < cssClasses.length; i++) {
                        var cl = cssClasses[i];
                        if (layoutClasses.indexOf(cl) > -1) {
                            layoutClass = cl;
                            break;
                        }
                    }
                    return $(this).data('block') + "_" + layoutClass;
                }
            }).get().join(",");

            setUIOrder(sortedOrder);

            return sortedOrder;
        }


        $preview.on("mouseenter", ".fontsampler-ui-block", onMouseOverPreviewBlock);
        function onMouseOverPreviewBlock() {

            // only add the overlay on the first hover
            // after mouseleave if will be hidden by css
            if ($(this).find(".fontsampler-ui-block-overlay").length > 0)
                return;

            // copy the radios into the overlay from the $list (which has all
            // possible blocks)
            var item = $(this).data("block"),
                $clone = $list.find("div[data-item=" + item + "]").clone();

            $(this).append($clone);
        }


        $preview.on("mouseenter", ".fontsampler-interface-row-break", onMouseOverRowBreak);
        function onMouseOverRowBreak() {
            if ($(this).find(".fontsampler-delete-row-break").length > 0)
                return;

            $(this).append('<button class="fontsampler-delete-row-break">&times;</button>');
        }


        $preview.on("click", ".fontsampler-delete-row-break", onDeleteRowBreak);
        function onDeleteRowBreak(e) {
            e.preventDefault();
            $(this).closest(".fontsampler-interface-row-break").remove();
            onSortEnd();
        }


        /**
         * Switching from defaults to individual checkboxes
         */
        $("input[name=use_default_options]").on("change", function () {
            var $this = $(this);

            $uiBlockCheckboxes.each(function () {
                var $that = $(this),
                    name = $that.attr('name');

                if (parseInt($this.val()) === 1) {
                    // use defaults:
                    if (parseInt($that.data('default')) === 1) {
                        $that.attr('checked', 'checked');
                    } else {
                        $that.removeAttr('checked');
                    }
                } else {
                    if (parseInt($that.data('set')) === 1) {
                        $that.attr('checked', 'checked');
                    } else {
                        $that.removeAttr('checked');
                    }
                }
                checkboxUiOrderCheck($that);
            });
        });


        // sampler checkboxes & UI preview interaction
        $uiBlockCheckboxes.on("change", function () {
            checkboxUiOrderCheck($(this));
        });

        /**
         * Function that gets called when any of the checkboxes controlling the display of a UI element get toggled
         * If the element is currently hidden, it gets appended to the sortable
         * If the element is currently visible, it gets stashed in the placeholder list
         *
         * @param $this - the checkbox
         * @returns {boolean}
         */
        function checkboxUiOrderCheck($this) {
            var item = $this.attr("name"),
                checked = $this.is(":checked");

            if ('multiline' === item) {
                return;
            }

            if (checked) {
                if (!inUIOrder(item)) {
                    addToUIOrder(item);
                    reloadPreview();
                }
            } else {
                if (inUIOrder(item)) {
                    removeFromUIOrder(item);
                    reloadPreview();
                }
            }
        }


        function setUIOrder(order) {
            if (typeof order === "undefined") {
                order = calculateUIOrder();
            }
            $ui_order.val(order);
        }


        function calculateUIOrder() {
            return onSortEnd();
        }


        function inUIOrder(item) {
            return getUIItems().indexOf(item) > -1;
        }


        function removeFromUIOrder(item) {
            var items = getUIItems(),
                pos = items.indexOf(item),
                newitems = getUIItems(true);

            if (pos > -1) {
                newitems.splice(pos, 1);
            }
            setUIOrder(newitems.join(","));
        }


        function addToUIOrder(item) {
            var layout = $(".fontsampler-ui-block-overlay[data-item='" + item + "']").data('default-class');
            var items = [];
            if (!inUIOrder(item)) {
                items = getUIItems(true);
                items.push(item + "_" + layout);
                setUIOrder(items.join(","));
            }
        }


        function getUIItems(withLayout) {
            var items = $ui_order.val().split(",");

            if (withLayout !== true) {
                items = items.map(function (ui_item) {
                    return ui_item.substring(0, ui_item.indexOf("_"));
                });
            }

            return items;
        }
    }

    return main;

});