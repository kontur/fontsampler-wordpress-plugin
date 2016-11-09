/* css_color_text */
.fontsampler-interface .type-tester__content {
    color: @css_color_text;
}
.fontsampler-interface .type-tester__content.invert {
    background: @css_color_text;
}

/* css_color_background */
.fontsampler-interface .type-tester__content {
    background: @css_color_background;
}
.fontsampler-interface .type-tester__content.invert {
    color: @css_color_background;
}

/* css_color_label */
/* css_size_label */
/* css_fontfamily_label */
.fontsampler-interface .fontsampler-slider .slider-label,
.fontsampler-interface .fontsampler-slider .slider-value,
.fontsampler-interface .selectric .label,
.fontsampler-interface .selectric-items li {
    color: @css_color_label;
    font-size: @css_size_label;
    font-family: @css_fontfamily_label;
}

/* css_color_highlight */
.fontsampler-interface .selectric-items {
    background: @css_color_highlight;
}

/* css_color_highlight_hover */
.fontsampler-interface .selectric-items li:hover {
    background: @css_color_highlight_hover;
}

/* css_color_line */
.fontsampler-interface .selectric-open .selectric,
.fontsampler-interface .selectric .label,
.fontsampler-interface .selectric .button,
.fontsampler-wrapper .fontsampler-interface .fontsampler-multiselect > button,
.fontsampler-interface .rangeslider__fill {
    border-bottom: 1px solid @css_color_line;
}

/* css_color_handle */
.fontsampler-interface .rangeslider__handle {
    background: @css_color_handle;
}

/* css_color_icon_active */
/* css_color_icon_inactive */