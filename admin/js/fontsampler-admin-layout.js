/**
 * All the jquery components dealing with manipulating the
 * UI layout of fontsamplers in the admin area
 */
define(['jquery'], function ($) {

    function main(specimentools, setup) {

        var $admin = $("#fontsampler-admin"),
            $list = $("#fontsampler-ui-blocks-list"),
            $preview = $("#fontsampler-ui-layout-preview"),
            $previewOptions = $("#fontsampler-ui-layout-preview-options"),
            $ui_order = $("input[name=ui_order]"),
            $optionsCheckboxes = $("#fontsampler-options-checkboxes"),

            blockClass = "fontsampler-ui-block-",
            layoutClasses = ["full", "column", "inline"],
            columnsClasses = "columns-1 columns-2 columns-3 columns-4",
            interfaceClass = "fontsampler-interface",
            blockOverlayClass = "fontsampler-ui-block-overlay";

        if ($preview.length) {
            reloadPreview();
        }


        /**
         * Listen for changes to the block layout
         */
        $admin.on("change", ".fontsampler-ui-block-layout input[type=radio]", changeBlockClass);
        function changeBlockClass() {
            var item = $(this).closest(".fontsampler-ui-block-layout").data("item");
            var $previewBlock = $preview.find(".fontsampler-ui-block[data-block=" + item + "]");
            $previewBlock.removeClass(layoutClasses.join(" ")).addClass($(this).val());
            setUIOrder();
        }


        /**
         * Listen for changes to the layout column count
         */
        $previewOptions.on("change", "input[type=radio]", changeColumnCount);
        function changeColumnCount() {
            var cols = $(this).val(),
                colsClass = "columns-" + cols;
            $preview.removeClass(columnsClasses).addClass(colsClass);
            $("." + interfaceClass).removeClass(columnsClasses).addClass(colsClass);
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


        /**
         * Reloading the preview mock
         */
        function reloadPreview() {
            var ui_order = $ui_order.val(),
                ui_columns = $previewOptions.find("input[type=radio]:checked").val(),
                specimen = $("input[name=specimen]").val(),
                buy = $("input[name=buy]").val(),

                data = {
                    'action': 'get_mock_fontsampler',
                    'data': {
                        "ui_columns": ui_columns,
                        "ui_order": ui_order,
                        "specimen": specimen,
                        "buy": buy,
                        "initial": "Layout preview only, for arranging the layout blocks"
                    }
                };

            // console.log(data.data);

            // since 2.8 ajaxurl is always defined in the admin header and points to admin-ajax.php
            $.post(ajaxurl, data, function (response) {
                $preview.html(response);

                specimentools(window, function () {
                    setup(".fontsampler-wrapper");
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
            var sortedOrder = $(".fontsampler-interface .fontsampler-ui-block").map(function () {
                var cssClasses = $(this).attr("class").split(" "),
                    layoutClass = "";
                for (var i = 0; i < cssClasses.length; i++) {
                    var cl = cssClasses[i];
                    if (layoutClasses.indexOf(cl) > -1) {
                        layoutClass = cl;
                        break;
                    }
                }
                return $(this).data('block') + "_" + layoutClass;
            }).get().join(",");

            setUIOrder(sortedOrder);
        }


        $preview.on("mouseenter", ".fontsampler-ui-block", onMouseOverPreviewBlock);
        function onMouseOverPreviewBlock() {

            // only add the overlay on the first hover
            // after mouseleave if will be hidden by css
            if ($(this).find("." + blockOverlayClass).length > 0)
                return;

            // copy the radios into the overlay from the $list (which has all
            // possible blocks)
            var item = $(this).data("block"),
                $clone = $list.find("div[data-item=" + item + "]").clone();

            $(this).append('<div class="' + blockOverlayClass + '"></div>');
            $(this).find("." + blockOverlayClass).html($clone);
        }

        // $preview.on("mouseleave", ".fontsampler-ui-block", onMouseOutPreviewBlock);
        // function onMouseOutPreviewBlock () {
        //     //$(this).find("." + blockOverlayClass).remove();
        // }


        /**
         * Switching from defaults to individual checkboxes
         */
        $("#fontsampler-edit-sample input[name=default_features]").on("change", function () {
            var $checkboxes = $optionsCheckboxes.find("input[type=checkbox]"),
                $this = $(this);

            $checkboxes.each(function () {
                var $that = $(this);

                if (parseInt($this.val()) === 1) {
                    // use defaults:
                    if ($that.data('default') == 'checked') {
                        $that.attr('checked', 'checked');
                    } else {
                        $that.removeAttr('checked');
                    }
                    $optionsCheckboxes.addClass("use-defaults");
                } else {
                    // use custom set:
                    if ($that.data('set') == 'checked') {
                        $that.attr('checked', 'checked');
                    } else {
                        $that.removeAttr('checked');
                    }
                    $optionsCheckboxes.removeClass("use-defaults");
                }
                iterateCheckboxes($that);
            });
        });


        // sampler checkboxes & UI preview interaction
        $("#fontsampler-edit-sample input[type=checkbox]").on("change", function () {
            iterateCheckboxes($(this));
        });

        /**
         * Function that gets called when any of the checkboxes controlling the display of a UI element get toggled
         * If the element is currently hidden, it gets appended to the sortable
         * If the element is currently visible, it gets stashed in the placeholder list
         *
         * @param $this - the checkbox
         * @returns {boolean}
         */
        function iterateCheckboxes($this) {
            var item = $this.attr("name"),
                checked = $this.is(":checked");

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
            var order = "";
            $(".fontsampler-ui-block-layout input[type=radio]:checked").each(function (i, elem) {
                order = order.concat($(elem).data("target"), '_', $(elem).val()).concat(",");
            });
            order = order.slice(0, -1);
            return order;
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
            var layout = $(".fontsampler-ui-block-layout[data-item='" + item + "']").data('default-class');
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