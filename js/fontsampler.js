(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Fontsampler = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var Fontsampler = require("../node_modules/fontsampler-js/dist/fontsampler")
var FontsamplerSkin = require("../node_modules/fontsampler-js/dist/fontsampler-skin")

window.addEventListener("load", function() {

    var fontsamplers = document.querySelectorAll(".fontsampler-wrapper")

    // store this method globally, so it can be called again
    window.fontsamplers = []
    window.fontsamplerSetup = function(node) {
        var fonts = window[node.id + "_fonts"],
            options = window[node.id + "_options"]

        console.log("id", node.id)
        console.log("fonts", fonts)
        console.log("options", options)

        if (options && "order" in options) {
            // Any element in order that starts with an # is a custom DOM
            // element with that ID, so get it and replace it into the order
            // for FS JS to parse and render in the Fontsampler UI
            function replace_ids_with_element(value) {
                console.log("value", value, typeof(value))
                // if (typeof(value))
                if (typeof(value) !== "string" && value.length > 0) {
                    return value.map(replace_ids_with_element)
                }

                if (value.substr(0, 1) !== "#") {
                    // Return unchanged otherwise
                    return value 
                }

                try {
                    var el = document.getElementById(value.substr(1))
                    console.log("custom element", el)
                    return el
                } catch (e) {
                    error.log("Custom element " + value + " not found.")
                    return ""
                }
            }

            options.order = options.order.map(replace_ids_with_element)
        }

        var fs = new Fontsampler(node, fonts, options)
        console.log("FS OPTIONS", options)

        FontsamplerSkin(fs)
        fs.init()

        // additional UI setup specific to Fontsampler WP
        var sampleTextSelect = fs.root.querySelector("select[name='sample-text']")
        if (sampleTextSelect) {
            sampleTextSelect.addEventListener("change", function() {
                fs.setText(JSON.parse(sampleTextSelect.value))
            })
        }

        var invertButtons = fs.root.querySelectorAll("[data-fsjs-block='invert'] button")
        if (invertButtons) {
            for (var b = 0; b < invertButtons.length; b++) {
                if (b === 0) {
                    invertButtons[b].className = invertButtons[b].className + " fsjs-button-selected"
                }
                invertButtons[b].addEventListener("click", onInvertClicked)
            }
        }

        function onInvertClicked(e) {
            var selectedClass = "fsjs-button-selected"

            // jquery, bad, sad, mad
            jQuery(e.currentTarget).addClass(selectedClass).siblings().removeClass(selectedClass)
            jQuery(fs.root.querySelector(".fsjs-block-tester .current-font"))
                .toggleClass("invert", e.currentTarget.dataset.choice === "negative")
        }

        var opentypeButton = fs.root.querySelector(".fontsampler-opentype-toggle")
        if (opentypeButton) {
            opentypeButton.addEventListener("click", function(e) {
                var modal = e.currentTarget.nextElementSibling
                if (modal.className.indexOf("shown") === -1) {
                    modal.className = modal.className + " shown"
                } else {
                    modal.className = modal.className.replace("shown", "")
                }
            })
        }

        window.fontsamplers.push(fs)
    }

    if (fontsamplers.length > 0) {
        for (var i = 0; i < fontsamplers.length; i++) {
            window.fontsamplerSetup(fontsamplers[i])
        }
    }

});
},{"../node_modules/fontsampler-js/dist/fontsampler":3,"../node_modules/fontsampler-js/dist/fontsampler-skin":2}],2:[function(require,module,exports){
(function (global){(function (){
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.FontsamplerSkin = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.dropkickjs=t():e.dropkickjs=t()}(this,function(){return function(e){function t(s){if(i[s])return i[s].exports;var a=i[s]={i:s,l:!1,exports:{}};return e[s].call(a.exports,a,a.exports,t),a.l=!0,a.exports}var i={};return t.m=e,t.c=i,t.d=function(e,i,s){t.o(e,i)||Object.defineProperty(e,i,{configurable:!1,enumerable:!0,get:s})},t.n=function(e){var i=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(i,"a",i),i},t.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},t.p="",t(t.s=0)}([function(e,t,i){"use strict";function s(e){return e&&e.__esModule?e:{default:e}}function a(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(t,"__esModule",{value:!0});var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},l=function(){function e(e,t){for(var i=0;i<t.length;i++){var s=t[i];s.enumerable=s.enumerable||!1,s.configurable=!0,"value"in s&&(s.writable=!0),Object.defineProperty(e,s.key,s)}}return function(t,i,s){return i&&e(t.prototype,i),s&&e(t,s),t}}(),o=i(1),d=s(o),r=i(2),c=s(r),h=i(3),u=s(h),f=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),p=window.parent!==window.self,b=void 0,m=function(){function e(t,i){a(this,e),this.sel=t;var s=void 0,n=void 0,l=window.Dropkick;for("string"==typeof this.sel&&"#"===this.sel[0]&&(this.sel=document.getElementById(t.substr(1))),s=0;s<l.uid;s++)if((n=l.cache[s])instanceof e&&n.data.select===this.sel)return d.default.extend(n.data.settings,i),n;if(!this.sel)throw"You must pass a select to DropKick";if(this.sel.length<1)throw"You must have options inside your <select>: "+t;if("SELECT"===this.sel.nodeName)return this.init(this.sel,i)}return l(e,[{key:"init",value:function(t,i){var s,a=window.Dropkick,n=e.build(t,"dk"+a.uid);if(this.data={},this.data.select=t,this.data.elem=n.elem,this.data.settings=d.default.extend({},c.default,i),this.disabled=t.disabled,this.form=t.form,this.length=t.length,this.multiple=t.multiple,this.options=n.options.slice(0),this.selectedIndex=t.selectedIndex,this.selectedOptions=n.selected.slice(0),this.value=t.value,this.data.cacheID=a.uid,a.cache[this.data.cacheID]=this,this.data.settings.initialize.call(this),a.uid+=1,this._changeListener||(t.addEventListener("change",this),this._changeListener=!0),!f||this.data.settings.mobile){if(t.parentNode.insertBefore(this.data.elem,t),t.setAttribute("data-dkCacheId",this.data.cacheID),this.data.elem.addEventListener("click",this),this.data.elem.addEventListener("keydown",this),this.data.elem.addEventListener("keypress",this),this.form&&this.form.addEventListener("reset",this),!this.multiple)for(s=0;s<this.options.length;s++)this.options[s].addEventListener("mouseover",this);b||(document.addEventListener("click",e.onDocClick),p&&parent.document.addEventListener("click",e.onDocClick),b=!0)}return this}},{key:"add",value:function(e,t){var i,s,a;"string"==typeof e&&(i=e,e=document.createElement("option"),e.text=i),"OPTION"===e.nodeName&&(s=d.default.create("li",{class:"dk-option","data-value":e.value,text:e.text,innerHTML:e.innerHTML,role:"option","aria-selected":"false",id:"dk"+this.data.cacheID+"-"+(e.id||e.value.replace(" ","-"))}),d.default.addClass(s,e.className),this.length+=1,e.disabled&&(d.default.addClass(s,"dk-option-disabled"),s.setAttribute("aria-disabled","true")),e.hidden&&(d.default.addClass(s,"dk-option-hidden"),s.setAttribute("aria-hidden","true")),this.data.select.add(e,t),"number"==typeof t&&(t=this.item(t)),a=this.options.indexOf(t),a>-1?(t.parentNode.insertBefore(s,t),this.options.splice(a,0,s)):(this.data.elem.lastChild.appendChild(s),this.options.push(s)),s.addEventListener("mouseover",this),e.selected&&this.select(a))}},{key:"item",value:function(e){return e=e<0?this.options.length+e:e,this.options[e]||null}},{key:"remove",value:function(e){var t=this.item(e);t.parentNode.removeChild(t),this.options.splice(e,1),this.data.select.remove(e),this.select(this.data.select.selectedIndex),this.length-=1}},{key:"close",value:function(){var e,t=this.data.elem;if(!this.isOpen||this.multiple)return!1;for(e=0;e<this.options.length;e++)d.default.removeClass(this.options[e],"dk-option-highlight");t.lastChild.setAttribute("aria-expanded","false"),d.default.removeClass(t.lastChild,"dk-select-options-highlight"),d.default.removeClass(t,"dk-select-open-(up|down)"),this.isOpen=!1,this.data.settings.close.call(this)}},{key:"open",value:function(){var e=void 0,t=void 0,i=void 0,s=void 0,a=void 0,n=void 0,l=this.data.elem,o=l.lastChild,r=void 0!==window.pageXOffset,c="CSS1Compat"===(document.compatMode||""),h=r?window.pageYOffset:c?document.documentElement.scrollTop:document.body.scrollTop;if(a=d.default.offset(l).top-h,n=window.innerHeight-(a+l.offsetHeight),this.isOpen||this.multiple)return!1;o.style.display="block",e=o.offsetHeight,o.style.display="",t=a>e,i=n>e,s=t&&!i?"-up":"-down",this.isOpen=!0,d.default.addClass(l,"dk-select-open"+s),o.setAttribute("aria-expanded","true"),this._scrollTo(this.options.length-1),this._scrollTo(this.selectedIndex),this.data.settings.open.call(this)}},{key:"disable",value:function(e,t){var i="dk-option-disabled";0!==arguments.length&&"boolean"!=typeof e||(t=void 0===e,e=this.data.elem,i="dk-select-disabled",this.disabled=t),void 0===t&&(t=!0),"number"==typeof e&&(e=this.item(e)),t?(e.setAttribute("aria-disabled",!0),d.default.addClass(e,i)):(e.setAttribute("aria-disabled",!1),d.default.removeClass(e,i))}},{key:"hide",value:function(e,t){void 0===t&&(t=!0),e=this.item(e),t?(e.setAttribute("aria-hidden",!0),d.default.addClass(e,"dk-option-hidden")):(e.setAttribute("aria-hidden",!1),d.default.removeClass(e,"dk-option-hidden"))}},{key:"select",value:function(e,t){var i,s,a,n,l=this.data.select;if("number"==typeof e&&(e=this.item(e)),"string"==typeof e)for(i=0;i<this.length;i++)this.options[i].getAttribute("data-value")===e&&(e=this.options[i]);return!(!e||"string"==typeof e||!t&&d.default.hasClass(e,"dk-option-disabled"))&&(d.default.hasClass(e,"dk-option")?(s=this.options.indexOf(e),a=l.options[s],this.multiple?(d.default.toggleClass(e,"dk-option-selected"),a.selected=!a.selected,d.default.hasClass(e,"dk-option-selected")?(e.setAttribute("aria-selected","true"),this.selectedOptions.push(e)):(e.setAttribute("aria-selected","false"),s=this.selectedOptions.indexOf(e),this.selectedOptions.splice(s,1))):(n=this.data.elem.firstChild,this.selectedOptions.length&&(d.default.removeClass(this.selectedOptions[0],"dk-option-selected"),this.selectedOptions[0].setAttribute("aria-selected","false")),d.default.addClass(e,"dk-option-selected"),e.setAttribute("aria-selected","true"),n.setAttribute("aria-activedescendant",e.id),n.className="dk-selected "+a.className,n.innerHTML=a.innerHTML,this.selectedOptions[0]=e,a.selected=!0),this.selectedIndex=l.selectedIndex,this.value=l.value,t||this.data.select.dispatchEvent(new u.default("change",{bubbles:this.data.settings.bubble})),e):void 0)}},{key:"selectOne",value:function(e,t){return this.reset(!0),this._scrollTo(e),this.select(e,t)}},{key:"search",value:function(e,t){var i,s,a,n,l,o,d,r,c=this.data.select.options,h=[];if(!e)return this.options;for(t=t?t.toLowerCase():"strict",t="fuzzy"===t?2:"partial"===t?1:0,r=new RegExp((t?"":"^")+e,"i"),i=0;i<c.length;i++)if(a=c[i].text.toLowerCase(),2==t){for(s=e.toLowerCase().split(""),n=l=o=d=0;l<a.length;)a[l]===s[n]?(o+=1+o,n++):o=0,d+=o,l++;n===s.length&&h.push({e:this.options[i],s:d,i:i})}else r.test(a)&&h.push(this.options[i]);return 2===t&&(h=h.sort(function(e,t){return t.s-e.s||e.i-t.i}).reduce(function(e,t){return e[e.length]=t.e,e},[])),h}},{key:"focus",value:function(){this.disabled||(this.multiple?this.data.elem:this.data.elem.children[0]).focus()}},{key:"reset",value:function(e){var t,i=this.data.select;for(this.selectedOptions.length=0,t=0;t<i.options.length;t++)i.options[t].selected=!1,d.default.removeClass(this.options[t],"dk-option-selected"),this.options[t].setAttribute("aria-selected","false"),!e&&i.options[t].defaultSelected&&this.select(t,!0);this.selectedOptions.length||this.multiple||this.select(0,!0)}},{key:"refresh",value:function(){Object.keys(this).length>0&&(!f||this.data.settings.mobile)&&this.dispose().init(this.data.select,this.data.settings)}},{key:"dispose",value:function(){var e=window.Dropkick;return Object.keys(this).length>0&&(!f||this.data.settings.mobile)&&(delete e.cache[this.data.cacheID],this.data.elem.parentNode.removeChild(this.data.elem),this.data.select.removeAttribute("data-dkCacheId")),this}},{key:"handleEvent",value:function(e){if(!this.disabled)switch(e.type){case"click":this._delegate(e);break;case"keydown":this._keyHandler(e);break;case"keypress":this._searchOptions(e);break;case"mouseover":this._highlight(e);break;case"reset":this.reset();break;case"change":this.data.settings.change.call(this)}}},{key:"_delegate",value:function(e){var t,i,s,a,n=e.target;if(d.default.hasClass(n,"dk-option-disabled"))return!1;if(this.multiple){if(d.default.hasClass(n,"dk-option"))if(t=window.getSelection(),"Range"===t.type&&t.collapseToStart(),e.shiftKey)if(s=this.options.indexOf(this.selectedOptions[0]),a=this.options.indexOf(this.selectedOptions[this.selectedOptions.length-1]),i=this.options.indexOf(n),i>s&&i<a&&(i=s),i>a&&a>s&&(a=s),this.reset(!0),a>i)for(;i<a+1;)this.select(i++);else for(;i>a-1;)this.select(i--);else e.ctrlKey||e.metaKey?this.select(n):(this.reset(!0),this.select(n))}else this[this.isOpen?"close":"open"](),d.default.hasClass(n,"dk-option")&&this.select(n)}},{key:"_highlight",value:function(e){var t,i=e.target;if(!this.multiple){for(t=0;t<this.options.length;t++)d.default.removeClass(this.options[t],"dk-option-highlight");d.default.addClass(this.data.elem.lastChild,"dk-select-options-highlight"),d.default.addClass(i,"dk-option-highlight")}}},{key:"_keyHandler",value:function(e){var t,i,s=this.selectedOptions,a=this.options,n=1,l={tab:9,enter:13,esc:27,space:32,up:38,down:40};switch(e.keyCode){case l.up:n=-1;case l.down:if(e.preventDefault(),t=s[s.length-1],d.default.hasClass(this.data.elem.lastChild,"dk-select-options-highlight"))for(d.default.removeClass(this.data.elem.lastChild,"dk-select-options-highlight"),i=0;i<a.length;i++)d.default.hasClass(a[i],"dk-option-highlight")&&(d.default.removeClass(a[i],"dk-option-highlight"),t=a[i]);n=a.indexOf(t)+n,n>a.length-1?n=a.length-1:n<0&&(n=0),this.data.select.options[n].disabled||(this.reset(!0),this.select(n),this._scrollTo(n));break;case l.space:if(!this.isOpen){e.preventDefault(),this.open();break}case l.tab:case l.enter:for(n=0;n<a.length;n++)d.default.hasClass(a[n],"dk-option-highlight")&&this.select(n);case l.esc:this.isOpen&&(e.preventDefault(),this.close())}}},{key:"_searchOptions",value:function(e){var t,i=this,s=String.fromCharCode(e.keyCode||e.which);void 0===this.data.searchString&&(this.data.searchString=""),function(){i.data.searchTimeout&&clearTimeout(i.data.searchTimeout),i.data.searchTimeout=setTimeout(function(){i.data.searchString=""},1e3)}(),this.data.searchString+=s,t=this.search(this.data.searchString,this.data.settings.search),t.length&&(d.default.hasClass(t[0],"dk-option-disabled")||this.selectOne(t[0]))}},{key:"_scrollTo",value:function(e){var t,i,s,a=this.data.elem.lastChild;if(-1===e||"number"!=typeof e&&!e||!this.isOpen&&!this.multiple)return!1;"number"==typeof e&&(e=this.item(e)),t=d.default.position(e,a).top,i=t-a.scrollTop,s=i+e.offsetHeight,s>a.offsetHeight?(t+=e.offsetHeight,a.scrollTop=t-a.offsetHeight):i<0&&(a.scrollTop=t)}}]),e}();window.Dropkick=m,window.Dropkick.cache={},window.Dropkick.uid=0,m.build=function(e,t){var i,s,a,n=[],l={elem:null,options:[],selected:[]},o=function e(i){var s,a,n,o,r=[];switch(i.nodeName){case"OPTION":s=d.default.create("li",{class:"dk-option ","data-value":i.value,text:i.text,innerHTML:i.innerHTML,role:"option","aria-selected":"false",id:t+"-"+(i.id||i.value.replace(" ","-"))}),d.default.addClass(s,i.className),i.disabled&&(d.default.addClass(s,"dk-option-disabled"),s.setAttribute("aria-disabled","true")),i.hidden&&(d.default.addClass(s,"dk-option-hidden"),s.setAttribute("aria-hidden","true")),i.selected&&(d.default.addClass(s,"dk-option-selected"),s.setAttribute("aria-selected","true"),l.selected.push(s)),l.options.push(this.appendChild(s));break;case"OPTGROUP":for(a=d.default.create("li",{class:"dk-optgroup"}),i.label&&a.appendChild(d.default.create("div",{class:"dk-optgroup-label",innerHTML:i.label})),n=d.default.create("ul",{class:"dk-optgroup-options"}),o=i.children.length;o--;r.unshift(i.children[o]));i.disabled&&(a.classList.add("dk-optgroup-disabled"),r.forEach(function(e){e.disabled=i.disabled})),r.forEach(e,n),this.appendChild(a).appendChild(n)}};for(l.elem=d.default.create("div",{class:"dk-select"+(e.multiple?"-multi":"")}),s=d.default.create("ul",{class:"dk-select-options",id:t+"-listbox",role:"listbox"}),e.disabled&&(d.default.addClass(l.elem,"dk-select-disabled"),l.elem.setAttribute("aria-disabled",!0)),l.elem.id=t+(e.id?"-"+e.id:""),d.default.addClass(l.elem,e.className),e.multiple?(l.elem.setAttribute("tabindex",e.getAttribute("tabindex")||"0"),s.setAttribute("aria-multiselectable","true")):(i=e.options[e.selectedIndex],l.elem.appendChild(d.default.create("div",{class:"dk-selected "+(i?i.className:""),tabindex:e.tabindex||0,innerHTML:i?i.text:"&nbsp;",id:t+"-combobox","aria-live":"assertive","aria-owns":s.id,role:"combobox"})),s.setAttribute("aria-expanded","false")),a=e.children.length;a--;n.unshift(e.children[a]));return n.forEach(o,l.elem.appendChild(s)),l},m.onDocClick=function(e){var t,i,s=window.Dropkick;if(1!==e.target.nodeType)return!1;null!==(t=e.target.getAttribute("data-dkcacheid"))&&s.cache[t].focus();for(i in s.cache)d.default.closest(e.target,s.cache[i].data.elem)||i===t||s.cache[i].disabled||s.cache[i].close()},void 0!==window.jQuery&&(window.jQuery.fn.dropkick=function(){var e=Array.prototype.slice.call(arguments);return jQuery(this).each(function(){e[0]&&"object"!==n(e[0])?"string"==typeof e[0]&&m.prototype[e[0]].apply(new m(this),e.slice(1)):new m(this,e[0]||{})})}),t.default=m},function(e,t,i){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var s=-1!==navigator.appVersion.indexOf("MSIE"),a={hasClass:function(e,t){var i=new RegExp("(^|\\s+)"+t+"(\\s+|$)");return e&&i.test(e.className)},addClass:function(e,t){e&&!this.hasClass(e,t)&&(e.className+=" "+t)},removeClass:function(e,t){var i=new RegExp("(^|\\s+)"+t+"(\\s+|$)");e&&(e.className=e.className.replace(i," "))},toggleClass:function(e,t){[(this.hasClass(e,t)?"remove":"add")+"Class"](e,t)},extend:function(e){return Array.prototype.slice.call(arguments,1).forEach(function(t){if(t)for(var i in t)e[i]=t[i]}),e},offset:function(e){var t=e.getBoundingClientRect()||{top:0,left:0},i=document.documentElement,a=s?i.scrollTop:window.pageYOffset,n=s?i.scrollLeft:window.pageXOffset;return{top:t.top+a-i.clientTop,left:t.left+n-i.clientLeft}},position:function(e,t){for(var i={top:0,left:0};e&&e!==t;)i.top+=e.offsetTop,i.left+=e.offsetLeft,e=e.parentNode;return i},closest:function(e,t){for(;e;){if(e===t)return e;e=e.parentNode}return!1},create:function(e,t){var i=void 0,s=document.createElement(e);t||(t={});for(i in t)t.hasOwnProperty(i)&&("innerHTML"===i?s.innerHTML=t[i]:s.setAttribute(i,t[i]));return s},deferred:function(e){return function(){var t=this,i=arguments;window.setTimeout(function(){e.apply(t,i)},1)}}};t.default=a},function(e,t,i){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var s={initialize:function(){},mobile:!0,change:function(){},open:function(){},close:function(){},search:"strict",bubble:!0};t.default=s},function(e,t,i){(function(t){var i=t.CustomEvent;e.exports=function(){try{var e=new i("cat",{detail:{foo:"bar"}});return"cat"===e.type&&"bar"===e.detail.foo}catch(e){}return!1}()?i:"undefined"!=typeof document&&"function"==typeof document.createEvent?function(e,t){var i=document.createEvent("CustomEvent");return t?i.initCustomEvent(e,t.bubbles,t.cancelable,t.detail):i.initCustomEvent(e,!1,!1,void 0),i}:function(e,t){var i=document.createEventObject();return i.type=e,t?(i.bubbles=Boolean(t.bubbles),i.cancelable=Boolean(t.cancelable),i.detail=t.detail):(i.bubbles=!1,i.cancelable=!1,i.detail=void 0),i}}).call(t,i(4))},function(e,t){var i;i=function(){return this}();try{i=i||Function("return this")()||(0,eval)("this")}catch(e){"object"==typeof window&&(i=window)}e.exports=i}])});
},{}],2:[function(_dereq_,module,exports){
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("rangeSlider", [], factory);
	else if(typeof exports === 'object')
		exports["rangeSlider"] = factory();
	else
		root["rangeSlider"] = factory();
})(window, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/range-slider.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/range-slider.css":
/*!******************************!*\
  !*** ./src/range-slider.css ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin

/***/ }),

/***/ "./src/range-slider.js":
/*!*****************************!*\
  !*** ./src/range-slider.js ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _dom = __webpack_require__(/*! ./utils/dom */ "./src/utils/dom.js");

var dom = _interopRequireWildcard(_dom);

var _functions = __webpack_require__(/*! ./utils/functions */ "./src/utils/functions.js");

var func = _interopRequireWildcard(_functions);

__webpack_require__(/*! ./range-slider.css */ "./src/range-slider.css");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var newLineAndTabRegexp = new RegExp('/[\\n\\t]/', 'g');
var MAX_SET_BY_DEFAULT = 100;
var HANDLE_RESIZE_DELAY = 300;
var HANDLE_RESIZE_DEBOUNCE = 50;

var pluginName = 'rangeSlider';
var inputrange = dom.supportsRange();
var defaults = {
  polyfill: true,
  root: document,
  rangeClass: 'rangeSlider',
  disabledClass: 'rangeSlider--disabled',
  fillClass: 'rangeSlider__fill',
  bufferClass: 'rangeSlider__buffer',
  handleClass: 'rangeSlider__handle',
  startEvent: ['mousedown', 'touchstart', 'pointerdown'],
  moveEvent: ['mousemove', 'touchmove', 'pointermove'],
  endEvent: ['mouseup', 'touchend', 'pointerup'],
  min: null,
  max: null,
  step: null,
  value: null,
  buffer: null,
  stick: null,
  borderRadius: 10,
  vertical: false
};

var verticalSlidingFixRegistered = false;

/**
 * Plugin
 * @param {HTMLElement} element
 * @param {this} options
 */

var RangeSlider = function () {
  function RangeSlider(element, options) {
    _classCallCheck(this, RangeSlider);

    var minSetByDefault = void 0;
    var maxSetByDefault = void 0;
    var stepSetByDefault = void 0;
    var stickAttribute = void 0;
    var stickValues = void 0;

    RangeSlider.instances.push(this);

    this.element = element;
    this.options = func.simpleExtend(defaults, options);
    this.polyfill = this.options.polyfill;
    this.vertical = this.options.vertical;
    this.onInit = this.options.onInit;
    this.onSlide = this.options.onSlide;
    this.onSlideStart = this.options.onSlideStart;
    this.onSlideEnd = this.options.onSlideEnd;
    this.onSlideEventsCount = -1;
    this.isInteractsNow = false;
    this.needTriggerEvents = false;

    this._addVerticalSlideScrollFix();

    // Plugin should only be used as a polyfill
    if (!this.polyfill) {
      // Input range support?
      if (inputrange) {
        return;
      }
    }

    this.options.buffer = this.options.buffer || parseFloat(this.element.getAttribute('data-buffer'));

    this.identifier = 'js-' + pluginName + '-' + func.uuid();

    this.min = func.getFirsNumberLike(this.options.min, parseFloat(this.element.getAttribute('min')), minSetByDefault = 0);

    this.max = func.getFirsNumberLike(this.options.max, parseFloat(this.element.getAttribute('max')), maxSetByDefault = MAX_SET_BY_DEFAULT);

    this.value = func.getFirsNumberLike(this.options.value, this.element.value, parseFloat(this.element.value || this.min + (this.max - this.min) / 2));

    this.step = func.getFirsNumberLike(this.options.step, parseFloat(this.element.getAttribute('step')) || (stepSetByDefault = 1));

    this.percent = null;

    if (func.isArray(this.options.stick) && this.options.stick.length >= 1) {
      this.stick = this.options.stick;
    } else if (stickAttribute = this.element.getAttribute('stick')) {
      stickValues = stickAttribute.split(' ');
      if (stickValues.length >= 1) {
        this.stick = stickValues.map(parseFloat);
      }
    }
    if (this.stick && this.stick.length === 1) {
      this.stick.push(this.step * 1.5);
    }
    this._updatePercentFromValue();

    this.toFixed = this._toFixed(this.step);

    var directionClass = void 0;

    this.container = document.createElement('div');
    dom.addClass(this.container, this.options.fillClass);

    directionClass = this.vertical ? this.options.fillClass + '__vertical' : this.options.fillClass + '__horizontal';
    dom.addClass(this.container, directionClass);

    this.handle = document.createElement('div');
    dom.addClass(this.handle, this.options.handleClass);

    directionClass = this.vertical ? this.options.handleClass + '__vertical' : this.options.handleClass + '__horizontal';
    dom.addClass(this.handle, directionClass);

    this.range = document.createElement('div');
    dom.addClass(this.range, this.options.rangeClass);
    this.range.id = this.identifier;

    var elementTitle = element.getAttribute('title');
    if (elementTitle && elementTitle.length > 0) {
      this.range.setAttribute('title', elementTitle);
    }

    if (this.options.bufferClass) {
      this.buffer = document.createElement('div');
      dom.addClass(this.buffer, this.options.bufferClass);
      this.range.appendChild(this.buffer);

      directionClass = this.vertical ? this.options.bufferClass + '__vertical' : this.options.bufferClass + '__horizontal';
      dom.addClass(this.buffer, directionClass);
    }

    this.range.appendChild(this.container);
    this.range.appendChild(this.handle);

    directionClass = this.vertical ? this.options.rangeClass + '__vertical' : this.options.rangeClass + '__horizontal';
    dom.addClass(this.range, directionClass);

    if (func.isNumberLike(this.options.value)) {
      this._setValue(this.options.value, true);
      this.element.value = this.options.value;
    }

    if (func.isNumberLike(this.options.buffer)) {
      this.element.setAttribute('data-buffer', this.options.buffer);
    }

    if (func.isNumberLike(this.options.min) || minSetByDefault) {
      this.element.setAttribute('min', '' + this.min);
    }

    if (func.isNumberLike(this.options.max) || maxSetByDefault) {
      this.element.setAttribute('max', '' + this.max);
    }

    if (func.isNumberLike(this.options.step) || stepSetByDefault) {
      this.element.setAttribute('step', '' + this.step);
    }

    dom.insertAfter(this.element, this.range);

    // hide the input visually
    dom.setCss(this.element, {
      'position': 'absolute',
      'width': '1px',
      'height': '1px',
      'overflow': 'hidden',
      'opacity': '0'
    });

    // Store context
    this._handleDown = this._handleDown.bind(this);
    this._handleMove = this._handleMove.bind(this);
    this._handleEnd = this._handleEnd.bind(this);
    this._startEventListener = this._startEventListener.bind(this);
    this._changeEventListener = this._changeEventListener.bind(this);
    this._handleResize = this._handleResize.bind(this);

    this._init();

    // Attach Events
    window.addEventListener('resize', this._handleResize, false);

    dom.addEventListeners(this.options.root, this.options.startEvent, this._startEventListener);

    // Listen to programmatic value changes
    this.element.addEventListener('change', this._changeEventListener, false);
  }

  /**
   * A lightweight plugin wrapper around the constructor,preventing against multiple instantiations
   * @param {Element} el
   * @param {Object} options
   */


  _createClass(RangeSlider, [{
    key: 'update',


    /* public methods */

    /**
     * @param {Object} obj like {min : Number, max : Number, value : Number, step : Number, buffer : [String|Number]}
     * @param {Boolean} triggerEvents
     * @returns {RangeSlider}
     */
    value: function update(obj, triggerEvents) {
      if (triggerEvents) {
        this.needTriggerEvents = true;
      }
      if (func.isObject(obj)) {
        if (func.isNumberLike(obj.min)) {
          this.element.setAttribute('min', '' + obj.min);
          this.min = obj.min;
        }

        if (func.isNumberLike(obj.max)) {
          this.element.setAttribute('max', '' + obj.max);
          this.max = obj.max;
        }

        if (func.isNumberLike(obj.step)) {
          this.element.setAttribute('step', '' + obj.step);
          this.step = obj.step;
          this.toFixed = this._toFixed(obj.step);
        }

        if (func.isNumberLike(obj.buffer)) {
          this._setBufferPosition(obj.buffer);
        }

        if (func.isNumberLike(obj.value)) {
          this._setValue(obj.value);
        }
      }
      this._update();
      this.onSlideEventsCount = 0;
      this.needTriggerEvents = false;
      return this;
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      var _this = this;

      dom.removeAllListenersFromEl(this, this.options.root);
      window.removeEventListener('resize', this._handleResize, false);
      this.element.removeEventListener('change', this._changeEventListener, false);

      this.element.style.cssText = '';
      delete this.element[pluginName];

      // Remove the generated markup
      if (this.range) {
        this.range.parentNode.removeChild(this.range);
      }

      RangeSlider.instances = RangeSlider.instances.filter(function (plugin) {
        return plugin !== _this;
      });

      if (!RangeSlider.instances.some(function (plugin) {
        return plugin.vertical;
      })) {
        this._removeVerticalSlideScrollFix();
      }
    }

    /* private methods */

  }, {
    key: '_toFixed',
    value: function _toFixed(step) {
      return (step + '').replace('.', '').length - 1;
    }
  }, {
    key: '_init',
    value: function _init() {
      if (this.onInit && typeof this.onInit === 'function') {
        this.onInit();
      }
      this._update(false);
    }
  }, {
    key: '_updatePercentFromValue',
    value: function _updatePercentFromValue() {
      this.percent = (this.value - this.min) / (this.max - this.min);
    }

    /**
     * This method check if this.identifier exists in ev.target's ancestors
     * @param ev
     * @param data
     */

  }, {
    key: '_startEventListener',
    value: function _startEventListener(ev, data) {
      var _this2 = this;

      var el = ev.target;
      var isEventOnSlider = false;

      if (ev.which !== 1 && !('touches' in ev)) {
        return;
      }

      dom.forEachAncestors(el, function (el) {
        return isEventOnSlider = el.id === _this2.identifier && !dom.hasClass(el, _this2.options.disabledClass);
      }, true);

      if (isEventOnSlider) {
        this._handleDown(ev, data);
      }
    }
  }, {
    key: '_changeEventListener',
    value: function _changeEventListener(ev, data) {
      if (data && data.origin === this.identifier) {
        return;
      }

      var value = ev.target.value;
      var pos = this._getPositionFromValue(value);

      this._setPosition(pos);
    }
  }, {
    key: '_update',
    value: function _update(triggerEvent) {
      var sizeProperty = this.vertical ? 'offsetHeight' : 'offsetWidth';

      this.handleSize = dom.getDimension(this.handle, sizeProperty);
      this.rangeSize = dom.getDimension(this.range, sizeProperty);
      this.maxHandleX = this.rangeSize - this.handleSize;
      this.grabX = this.handleSize / 2;
      this.position = this._getPositionFromValue(this.value);

      // Consider disabled state
      if (this.element.disabled) {
        dom.addClass(this.range, this.options.disabledClass);
      } else {
        dom.removeClass(this.range, this.options.disabledClass);
      }

      this._setPosition(this.position);
      if (this.options.bufferClass && this.options.buffer) {
        this._setBufferPosition(this.options.buffer);
      }
      this._updatePercentFromValue();
      if (triggerEvent !== false) {
        dom.triggerEvent(this.element, 'change', { origin: this.identifier });
      }
    }
  }, {
    key: '_addVerticalSlideScrollFix',
    value: function _addVerticalSlideScrollFix() {
      if (this.vertical && !verticalSlidingFixRegistered) {
        document.addEventListener('touchmove', RangeSlider._touchMoveScrollHandler, { passive: false });
        verticalSlidingFixRegistered = true;
      }
    }
  }, {
    key: '_removeVerticalSlideScrollFix',
    value: function _removeVerticalSlideScrollFix() {
      document.removeEventListener('touchmove', RangeSlider._touchMoveScrollHandler);
      verticalSlidingFixRegistered = false;
    }
  }, {
    key: '_handleResize',
    value: function _handleResize() {
      var _this3 = this;

      return func.debounce(function () {
        // Simulate resizeEnd event.
        func.delay(function () {
          _this3._update();
        }, HANDLE_RESIZE_DELAY);
      }, HANDLE_RESIZE_DEBOUNCE)();
    }
  }, {
    key: '_handleDown',
    value: function _handleDown(e) {
      this.isInteractsNow = true;
      e.preventDefault();
      dom.addEventListeners(this.options.root, this.options.moveEvent, this._handleMove);
      dom.addEventListeners(this.options.root, this.options.endEvent, this._handleEnd);

      // If we click on the handle don't set the new position
      if ((' ' + e.target.className + ' ').replace(newLineAndTabRegexp, ' ').indexOf(this.options.handleClass) > -1) {
        return;
      }

      var boundingClientRect = this.range.getBoundingClientRect();

      var posX = this._getRelativePosition(e);
      var rangeX = this.vertical ? boundingClientRect.bottom : boundingClientRect.left;
      var handleX = this._getPositionFromNode(this.handle) - rangeX;
      var position = posX - this.grabX;

      this._setPosition(position);

      if (posX >= handleX && posX < handleX + this.options.borderRadius * 2) {
        this.grabX = posX - handleX;
      }
      this._updatePercentFromValue();
    }
  }, {
    key: '_handleMove',
    value: function _handleMove(e) {
      var posX = this._getRelativePosition(e);

      this.isInteractsNow = true;
      e.preventDefault();
      this._setPosition(posX - this.grabX);
    }
  }, {
    key: '_handleEnd',
    value: function _handleEnd(e) {
      e.preventDefault();
      dom.removeEventListeners(this.options.root, this.options.moveEvent, this._handleMove);
      dom.removeEventListeners(this.options.root, this.options.endEvent, this._handleEnd);

      // Ok we're done fire the change event
      dom.triggerEvent(this.element, 'change', { origin: this.identifier });

      if (this.isInteractsNow || this.needTriggerEvents) {
        if (this.onSlideEnd && typeof this.onSlideEnd === 'function') {
          this.onSlideEnd(this.value, this.percent, this.position);
        }

        if (this.vertical) {
          RangeSlider.slidingVertically = false;
        }
      }
      this.onSlideEventsCount = 0;
      this.isInteractsNow = false;
    }
  }, {
    key: '_setPosition',
    value: function _setPosition(pos) {
      var position = void 0;
      var stickRadius = void 0;
      var restFromValue = void 0;
      var stickTo = void 0;

      // Snapping steps
      var value = this._getValueFromPosition(func.between(pos, 0, this.maxHandleX));

      // Stick to stick[0] in radius stick[1]
      if (this.stick) {
        stickTo = this.stick[0];
        stickRadius = this.stick[1] || 0.1;
        restFromValue = value % stickTo;
        if (restFromValue < stickRadius) {
          value = value - restFromValue;
        } else if (Math.abs(stickTo - restFromValue) < stickRadius) {
          value = value - restFromValue + stickTo;
        }
      }
      position = this._getPositionFromValue(value);

      // Update ui
      if (this.vertical) {
        this.container.style.height = position + this.grabX + 'px';
        this.handle.style['webkitTransform'] = 'translateY(-' + position + 'px)';
        this.handle.style['msTransform'] = 'translateY(-' + position + 'px)';
        this.handle.style.transform = 'translateY(-' + position + 'px)';
      } else {
        this.container.style.width = position + this.grabX + 'px';
        this.handle.style['webkitTransform'] = 'translateX(' + position + 'px)';
        this.handle.style['msTransform'] = 'translateX(' + position + 'px)';
        this.handle.style.transform = 'translateX(' + position + 'px)';
      }

      this._setValue(value);

      // Update globals
      this.position = position;
      this.value = value;
      this._updatePercentFromValue();

      if (this.isInteractsNow || this.needTriggerEvents) {
        if (this.onSlideStart && typeof this.onSlideStart === 'function' && this.onSlideEventsCount === 0) {
          this.onSlideStart(this.value, this.percent, this.position);
        }

        if (this.onSlide && typeof this.onSlide === 'function') {
          this.onSlide(this.value, this.percent, this.position);
        }

        if (this.vertical) {
          RangeSlider.slidingVertically = true;
        }
      }

      this.onSlideEventsCount++;
    }
  }, {
    key: '_setBufferPosition',
    value: function _setBufferPosition(pos) {
      var isPercent = true;

      if (isFinite(pos)) {
        pos = parseFloat(pos);
      } else if (func.isString(pos)) {
        if (pos.indexOf('px') > 0) {
          isPercent = false;
        }
        pos = parseFloat(pos);
      } else {
        console.warn('New position must be XXpx or XX%');
        return;
      }

      if (isNaN(pos)) {
        console.warn('New position is NaN');
        return;
      }
      if (!this.options.bufferClass) {
        console.warn('You disabled buffer, it\'s className is empty');
        return;
      }
      var bufferSize = isPercent ? pos : pos / this.rangeSize * 100;

      if (bufferSize < 0) {
        bufferSize = 0;
      }
      if (bufferSize > 100) {
        bufferSize = 100;
      }
      this.options.buffer = bufferSize;

      var paddingSize = this.options.borderRadius / this.rangeSize * 100;
      var bufferSizeWithPadding = bufferSize - paddingSize;

      if (bufferSizeWithPadding < 0) {
        bufferSizeWithPadding = 0;
      }

      if (this.vertical) {
        this.buffer.style.height = bufferSizeWithPadding + '%';
        this.buffer.style.bottom = paddingSize * 0.5 + '%';
      } else {
        this.buffer.style.width = bufferSizeWithPadding + '%';
        this.buffer.style.left = paddingSize * 0.5 + '%';
      }

      this.element.setAttribute('data-buffer', bufferSize);
    }

    /**
     *
     * @param {Element} node
     * @returns {*} Returns element position relative to the parent
     * @private
     */

  }, {
    key: '_getPositionFromNode',
    value: function _getPositionFromNode(node) {
      var i = this.vertical ? this.maxHandleX : 0;

      while (node !== null) {
        i += this.vertical ? node.offsetTop : node.offsetLeft;
        node = node.offsetParent;
      }
      return i;
    }

    /**
     *
     * @param {(MouseEvent|TouchEvent)}e
     * @returns {number}
     */

  }, {
    key: '_getRelativePosition',
    value: function _getRelativePosition(e) {
      var boundingClientRect = this.range.getBoundingClientRect();

      // Get the offset relative to the viewport
      var rangeSize = this.vertical ? boundingClientRect.bottom : boundingClientRect.left;
      var pageOffset = 0;

      var pagePositionProperty = this.vertical ? 'pageY' : 'pageX';

      if (typeof e[pagePositionProperty] !== 'undefined') {
        pageOffset = e.touches && e.touches.length ? e.touches[0][pagePositionProperty] : e[pagePositionProperty];
      } else if (typeof e.originalEvent !== 'undefined') {
        if (typeof e.originalEvent[pagePositionProperty] !== 'undefined') {
          pageOffset = e.originalEvent[pagePositionProperty];
        } else if (e.originalEvent.touches && e.originalEvent.touches[0] && typeof e.originalEvent.touches[0][pagePositionProperty] !== 'undefined') {
          pageOffset = e.originalEvent.touches[0][pagePositionProperty];
        }
      } else if (e.touches && e.touches[0] && typeof e.touches[0][pagePositionProperty] !== 'undefined') {
        pageOffset = e.touches[0][pagePositionProperty];
      } else if (e.currentPoint && (typeof e.currentPoint.x !== 'undefined' || typeof e.currentPoint.y !== 'undefined')) {
        pageOffset = this.vertical ? e.currentPoint.y : e.currentPoint.x;
      }

      if (this.vertical) {
        pageOffset -= window.pageYOffset;
      }

      return this.vertical ? rangeSize - pageOffset : pageOffset - rangeSize;
    }
  }, {
    key: '_getPositionFromValue',
    value: function _getPositionFromValue(value) {
      var percentage = (value - this.min) / (this.max - this.min);
      var pos = percentage * this.maxHandleX;

      return isNaN(pos) ? 0 : pos;
    }
  }, {
    key: '_getValueFromPosition',
    value: function _getValueFromPosition(pos) {
      var percentage = pos / (this.maxHandleX || 1);
      var value = this.step * Math.round(percentage * (this.max - this.min) / this.step) + this.min;

      return Number(value.toFixed(this.toFixed));
    }
  }, {
    key: '_setValue',
    value: function _setValue(value, force) {
      if (value === this.value && !force) {
        return;
      }

      // Set the new value and fire the `input` event
      this.element.value = value;
      this.value = value;
      dom.triggerEvent(this.element, 'input', { origin: this.identifier });
    }
  }], [{
    key: 'create',
    value: function create(el, options) {
      var createInstance = function createInstance(el) {
        var data = el[pluginName];

        // Create a new instance.
        if (!data) {
          data = new RangeSlider(el, options);
          el[pluginName] = data;
        }
      };

      if (el.length) {
        Array.prototype.slice.call(el).forEach(function (el) {
          createInstance(el);
        });
      } else {
        createInstance(el);
      }
    }
  }, {
    key: '_touchMoveScrollHandler',
    value: function _touchMoveScrollHandler(event) {
      if (RangeSlider.slidingVertically) {
        event.preventDefault();
      }
    }
  }]);

  return RangeSlider;
}();

exports.default = RangeSlider;


RangeSlider.version = "0.4.11";
RangeSlider.dom = dom;
RangeSlider.functions = func;
RangeSlider.instances = [];
RangeSlider.slidingVertically = false;
module.exports = exports['default'];

/***/ }),

/***/ "./src/utils/dom.js":
/*!**************************!*\
  !*** ./src/utils/dom.js ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.supportsRange = exports.removeAllListenersFromEl = exports.removeEventListeners = exports.addEventListeners = exports.insertAfter = exports.triggerEvent = exports.forEachAncestors = exports.removeClass = exports.addClass = exports.hasClass = exports.setCss = exports.getDimension = exports.getHiddenParentNodes = exports.isHidden = exports.detectIE = undefined;

var _functions = __webpack_require__(/*! ./functions */ "./src/utils/functions.js");

var func = _interopRequireWildcard(_functions);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var EVENT_LISTENER_LIST = 'eventListenerList';

var detectIE = exports.detectIE = function detectIE() {
  var ua = window.navigator.userAgent;
  var msie = ua.indexOf('MSIE ');

  if (msie > 0) {
    return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
  }

  var trident = ua.indexOf('Trident/');

  if (trident > 0) {
    var rv = ua.indexOf('rv:');

    return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
  }

  var edge = ua.indexOf('Edge/');

  if (edge > 0) {
    return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
  }

  return false;
};

var ieVersion = detectIE();
var eventCaptureParams = window.PointerEvent && !ieVersion ? { passive: false } : false;

/**
 * Check if a `element` is visible in the DOM
 *
 * @param  {Element}  element
 * @return {Boolean}
 */
var isHidden = exports.isHidden = function isHidden(element) {
  return element.offsetWidth === 0 || element.offsetHeight === 0 || element.open === false;
};

/**
 * Get hidden parentNodes of an `element`
 *
 * @param {Element} element
 * @return {Element[]}
 */
var getHiddenParentNodes = exports.getHiddenParentNodes = function getHiddenParentNodes(element) {
  var parents = [];
  var node = element.parentNode;

  while (node && isHidden(node)) {
    parents.push(node);
    node = node.parentNode;
  }
  return parents;
};

/**
 * Returns dimensions for an element even if it is not visible in the DOM.
 *
 * @param  {Element} element
 * @param  {string}  key     (e.g. offsetWidth …)
 * @return {Number}
 */
var getDimension = exports.getDimension = function getDimension(element, key) {
  var hiddenParentNodes = getHiddenParentNodes(element);
  var hiddenParentNodesLength = hiddenParentNodes.length;
  var hiddenParentNodesStyle = [];
  var dimension = element[key];

  // Used for native `<details>` elements
  var toggleOpenProperty = function toggleOpenProperty(element) {
    if (typeof element.open !== 'undefined') {
      element.open = !element.open;
    }
  };

  if (hiddenParentNodesLength) {
    for (var i = 0; i < hiddenParentNodesLength; i++) {
      // Cache the styles to restore then later.
      hiddenParentNodesStyle.push({
        display: hiddenParentNodes[i].style.display,
        height: hiddenParentNodes[i].style.height,
        overflow: hiddenParentNodes[i].style.overflow,
        visibility: hiddenParentNodes[i].style.visibility
      });

      hiddenParentNodes[i].style.display = 'block';
      hiddenParentNodes[i].style.height = '0';
      hiddenParentNodes[i].style.overflow = 'hidden';
      hiddenParentNodes[i].style.visibility = 'hidden';
      toggleOpenProperty(hiddenParentNodes[i]);
    }

    dimension = element[key];

    for (var j = 0; j < hiddenParentNodesLength; j++) {
      toggleOpenProperty(hiddenParentNodes[j]);
      hiddenParentNodes[j].style.display = hiddenParentNodesStyle[j].display;
      hiddenParentNodes[j].style.height = hiddenParentNodesStyle[j].height;
      hiddenParentNodes[j].style.overflow = hiddenParentNodesStyle[j].overflow;
      hiddenParentNodes[j].style.visibility = hiddenParentNodesStyle[j].visibility;
    }
  }
  return dimension;
};

/**
 *
 * @param {HTMLElement} el
 * @param {Object} cssObj
 * @returns {*}
 */
var setCss = exports.setCss = function setCss(el, cssObj) {
  for (var key in cssObj) {
    el.style[key] = cssObj[key];
  }
  return el.style;
};

/**
 *
 * @param {HTMLElement} elem
 * @param {string} className
 */
var hasClass = exports.hasClass = function hasClass(elem, className) {
  return new RegExp(' ' + className + ' ').test(' ' + elem.className + ' ');
};

/**
 *
 * @param {HTMLElement} elem
 * @param {string} className
 */
var addClass = exports.addClass = function addClass(elem, className) {
  if (!hasClass(elem, className)) {
    elem.className += ' ' + className;
  }
};

/**
 *
 * @param {HTMLElement} elem
 * @param {string} className
 */
var removeClass = exports.removeClass = function removeClass(elem, className) {
  var newClass = ' ' + elem.className.replace(/[\t\r\n]/g, ' ') + ' ';

  if (hasClass(elem, className)) {
    while (newClass.indexOf(' ' + className + ' ') >= 0) {
      newClass = newClass.replace(' ' + className + ' ', ' ');
    }
    elem.className = newClass.replace(/^\s+|\s+$/g, '');
  }
};

/**
 *
 * @param {HTMLElement} el
 * @param {Function} callback
 * @param {boolean} andForElement - apply callback for el
 * @returns {HTMLElement}
 */
var forEachAncestors = exports.forEachAncestors = function forEachAncestors(el, callback, andForElement) {
  if (andForElement) {
    callback(el);
  }

  while (el.parentNode && !callback(el)) {
    el = el.parentNode;
  }

  return el;
};

/**
 *
 * @param {HTMLElement} el
 * @param {string} name event name
 * @param {Object} data
 */
var triggerEvent = exports.triggerEvent = function triggerEvent(el, name, data) {
  if (!func.isString(name)) {
    throw new TypeError('event name must be String');
  }
  if (!(el instanceof HTMLElement)) {
    throw new TypeError('element must be HTMLElement');
  }
  name = name.trim();
  var event = document.createEvent('CustomEvent');

  event.initCustomEvent(name, false, false, data);
  el.dispatchEvent(event);
};

/**
 * @param {Object} referenceNode after this
 * @param {Object} newNode insert this
 */
var insertAfter = exports.insertAfter = function insertAfter(referenceNode, newNode) {
  return referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
};

/**
 * Add event listeners and push them to el[EVENT_LISTENER_LIST]
 * @param {HTMLElement|Node|Document} el DOM element
 * @param {Array} events
 * @param {Function} listener
 */
var addEventListeners = exports.addEventListeners = function addEventListeners(el, events, listener) {
  events.forEach(function (eventName) {
    if (!el[EVENT_LISTENER_LIST]) {
      el[EVENT_LISTENER_LIST] = {};
    }
    if (!el[EVENT_LISTENER_LIST][eventName]) {
      el[EVENT_LISTENER_LIST][eventName] = [];
    }

    el.addEventListener(eventName, listener, eventCaptureParams);
    if (el[EVENT_LISTENER_LIST][eventName].indexOf(listener) < 0) {
      el[EVENT_LISTENER_LIST][eventName].push(listener);
    }
  });
};

/**
 * Remove event listeners and remove them from el[EVENT_LISTENER_LIST]
 * @param {HTMLElement} el DOM element
 * @param {Array} events
 * @param {Function} listener
 */
var removeEventListeners = exports.removeEventListeners = function removeEventListeners(el, events, listener) {
  events.forEach(function (eventName) {
    var index = void 0;

    el.removeEventListener(eventName, listener, false);

    if (el[EVENT_LISTENER_LIST] && el[EVENT_LISTENER_LIST][eventName] && (index = el[EVENT_LISTENER_LIST][eventName].indexOf(listener)) > -1) {
      el[EVENT_LISTENER_LIST][eventName].splice(index, 1);
    }
  });
};

/**
 * Remove ALL event listeners which exists in el[EVENT_LISTENER_LIST]
 * @param {RangeSlider} instance
 * @param {HTMLElement} el DOM element
 */
var removeAllListenersFromEl = exports.removeAllListenersFromEl = function removeAllListenersFromEl(instance, el) {
  if (!el[EVENT_LISTENER_LIST]) {
    return;
  }

  /* jshint ignore:start */

  /**
   *
   * @callback listener
   * @this {Object} event name
   */
  function rm(listener) {
    if (listener === instance._startEventListener) {
      this.el.removeEventListener(this.eventName, listener, false);
    }
  }

  for (var eventName in el[EVENT_LISTENER_LIST]) {
    el[EVENT_LISTENER_LIST][eventName].forEach(rm, { eventName: eventName, el: el });
  }

  el[EVENT_LISTENER_LIST] = {};
  /* jshint ignore:end */
};

/**
 * Range feature detection
 * @return {Boolean}
 */
var supportsRange = exports.supportsRange = function supportsRange() {
  var input = document.createElement('input');

  input.setAttribute('type', 'range');
  return input.type !== 'text';
};

/***/ }),

/***/ "./src/utils/functions.js":
/*!********************************!*\
  !*** ./src/utils/functions.js ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Create a random uuid
 */
var uuid = exports.uuid = function uuid() {
  var s4 = function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  };
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
};

/**
 * Delays a function for the given number of milliseconds, and then calls
 * it with the arguments supplied.
 *
 * @param  {Function} fn   function
 * @param  {Number}   wait delay
 * @param  {Number}   args arguments
 * @return {Function}
 */
var delay = exports.delay = function delay(fn, wait) {
  for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    args[_key - 2] = arguments[_key];
  }

  return setTimeout(function () {
    return fn.apply(null, args);
  }, wait);
};

/**
 * Returns a debounced function that will make sure the given
 * function is not triggered too much.
 *
 * @param  {Function} fn Function to debounce.
 * @param  {Number}   debounceDuration OPTIONAL. The amount of time in milliseconds for which we will debounce the
 *         function. (defaults to 100ms)
 * @return {Function}
 */
var debounce = exports.debounce = function debounce(fn) {
  var debounceDuration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 100;
  return function () {
    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    if (!fn.debouncing) {
      fn.lastReturnVal = fn.apply(window, args);
      fn.debouncing = true;
    }
    clearTimeout(fn.debounceTimeout);
    fn.debounceTimeout = setTimeout(function () {
      fn.debouncing = false;
    }, debounceDuration);
    return fn.lastReturnVal;
  };
};

var isString = exports.isString = function isString(obj) {
  return obj === '' + obj;
};

var isArray = exports.isArray = function isArray(obj) {
  return Object.prototype.toString.call(obj) === '[object Array]';
};

var isNumberLike = exports.isNumberLike = function isNumberLike(obj) {
  return obj !== null && obj !== undefined && (isString(obj) && isFinite(parseFloat(obj)) || isFinite(obj));
};

var getFirsNumberLike = exports.getFirsNumberLike = function getFirsNumberLike() {
  for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    args[_key3] = arguments[_key3];
  }

  if (!args.length) {
    return null;
  }

  for (var i = 0, len = args.length; i < len; i++) {
    if (isNumberLike(args[i])) {
      return args[i];
    }
  }

  return null;
};

var isObject = exports.isObject = function isObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
};

var simpleExtend = exports.simpleExtend = function simpleExtend(defaultOpt, options) {
  var opt = {};

  for (var key in defaultOpt) {
    opt[key] = defaultOpt[key];
  }
  for (var _key4 in options) {
    opt[_key4] = options[_key4];
  }

  return opt;
};

var between = exports.between = function between(pos, min, max) {
  if (pos < min) {
    return min;
  }
  if (pos > max) {
    return max;
  }
  return pos;
};

/***/ })

/******/ });
});

},{}],3:[function(_dereq_,module,exports){

module.exports = {
    "init": "fontsampler.events.init",
    "skinInit": "fontsampler.events.skininit",
    "languageChanged": "fontsampler.events.languagechanged",
    "fontChanged": "fontsampler.events.fontchanged",
    "fontLoaded": "fontsampler.events.fontloaded",
    "fontRendered": "fontsampler.events.fontrendered",
    "fontsPreloaded": "fontsampler.events.fontspreloaded",
    "valueChanged": "fontsampler.events.valuechanged",
    "opentypeChanged": "fontsampler.events.opentypechanged",
    "focused": "fontsampler.events.focused",
    "blurred": "fontsampler.events.blurred",
}

},{}],4:[function(_dereq_,module,exports){
/**
 * DOM related helpers
 */

function pruneClass(className, classNames) {
    if (!classNames) {
        return ""
    }

    classNames = classNames.trim()

    if (!className) {
        return classNames
    }

    className = className.trim()

    var classes = classNames.split(" "),
        classIndex = classes.indexOf(className)

    if (classIndex !== -1) {
        classes.splice(classIndex, 1)
    }

    if (classes.length > 0) {
        return classes.join(" ")
    } else {
        return ""
    }
}

/**
 * 
 * @param str className 
 * @param str classNames - space separated
 */
function addClass(className, classNames) {
    if (!classNames) {
        classNames = ""
    }

    if (className === classNames) {
        return classNames
    }

    classNames = classNames.trim()

    if (!className) {
        return classNames
    }

    className = className.trim()

    var classes = classNames.split(" "),
        classIndex = classes.indexOf(className)

    if (classIndex === -1) {
        if (classNames) {
            return classNames + " " + className
        } else {
            return className
        }
    } else {
        return classNames
    }
}

function nodeAddClass(node, className) {
    if (!isNode(node) || typeof(className) !== "string") {
        return false
    }

    node.className = addClass(className, node.className)

    return true
}

function nodeAddClasses(node, classes) {
    if (!isNode(node) || !Array.isArray(classes) || classes.length < 1) {
        return false
    }

    for (var c = 0; c < classes.length; c++) {
        node.className = addClass(classes[c], node.className)
    }

    return true
}

function nodeRemoveClass(node, className) {
    if (!isNode(node) || typeof(className) !== "string") {
        return false
    }

    node.className = pruneClass(className, node.className)

    return true
}

/**
 * Really just an approximation of a check
 * 
 * @param {*} node 
 */
function isNode(node) {
    return typeof(node) === "object" && node !== null && "nodeType" in node
}

module.exports = {
    nodeAddClass: nodeAddClass,
    nodeAddClasses: nodeAddClasses,
    nodeRemoveClass: nodeRemoveClass,
    isNode: isNode
}
},{}],5:[function(_dereq_,module,exports){
var rangeSlider = _dereq_("../node_modules/rangeslider-pure/dist/range-slider")
var Dropkick = _dereq_("../node_modules/dropkickjs/dist/dropkick").default
var events = _dereq_("./constants/events")
var dom = _dereq_("./helpers/dom")

function Skin(FS) {

    FS.root.addEventListener(events.init, init)

    function init() {
        console.debug("Skin.init()", FS)

        if (FS.initialized === true) {
            console.error(FS.root)
            throw new Error("FontsamplerSkin: Cannot apply skin to a Fontsampler that is already initialized.")
        }

        dom.nodeAddClass(FS.root, "fsjs-skin")

        var rangeInputs = FS.root.querySelectorAll("input[type=range][data-fsjs-ui='slider']")
        if (rangeInputs.length) {
            rangeSlider.create(rangeInputs, {
                polyfill: true,
                // utilise the more granular events offered by the skin
                // default html range inputs only trigger on change
                onSlide: updateSlider,
                onSlideEnd: updateSlider
            })
        }

        var selectInputs = FS.root.querySelectorAll("select[data-fsjs-ui='dropdown']")
        var dropdowns = []
        if (selectInputs.length) {
            for (var i = 0; i < selectInputs.length; i++) {
                var dropdown = new Dropkick(selectInputs[i], {
                    mobile: true
                })
                dropdowns.push(dropdown)
                
                // listen for and trigger updates on native change event on select
                selectInputs[i].dataset.i = i
                selectInputs[i].addEventListener("change", function () {
                    dropdowns[this.dataset.i].refresh()
                })
            }
        }

        // Provide a hook for when the UI has finished setting up
        FS.root.dispatchEvent(new CustomEvent(events.skinInit, {
            detail: {
                fontsampler: FS
            }
        }))
    }

    function updateSlider(position /*, value*/ ) {
        var key = this.element.dataset.fsjs,
            opt = {};

        // Catch special case for variable font axis sliders
        if (typeof(key) === "undefined") {
            key = this.element.dataset.axis
            opt[key] = position
            FS.setValue("variation", opt)
        } else {
            FS.setValue(key, position)
        }
    }

}

module.exports = Skin
},{"../node_modules/dropkickjs/dist/dropkick":1,"../node_modules/rangeslider-pure/dist/range-slider":2,"./constants/events":3,"./helpers/dom":4}]},{},[5])(5)
});

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
(function (global){(function (){
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Fontsampler = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
'use strict';

var hasOwn = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;
var defineProperty = Object.defineProperty;
var gOPD = Object.getOwnPropertyDescriptor;

var isArray = function isArray(arr) {
	if (typeof Array.isArray === 'function') {
		return Array.isArray(arr);
	}

	return toStr.call(arr) === '[object Array]';
};

var isPlainObject = function isPlainObject(obj) {
	if (!obj || toStr.call(obj) !== '[object Object]') {
		return false;
	}

	var hasOwnConstructor = hasOwn.call(obj, 'constructor');
	var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) { /**/ }

	return typeof key === 'undefined' || hasOwn.call(obj, key);
};

// If name is '__proto__', and Object.defineProperty is available, define __proto__ as an own property on target
var setProperty = function setProperty(target, options) {
	if (defineProperty && options.name === '__proto__') {
		defineProperty(target, options.name, {
			enumerable: true,
			configurable: true,
			value: options.newValue,
			writable: true
		});
	} else {
		target[options.name] = options.newValue;
	}
};

// Return undefined instead of __proto__ if '__proto__' is not an own property
var getProperty = function getProperty(obj, name) {
	if (name === '__proto__') {
		if (!hasOwn.call(obj, name)) {
			return void 0;
		} else if (gOPD) {
			// In early versions of node, obj['__proto__'] is buggy when obj has
			// __proto__ as an own property. Object.getOwnPropertyDescriptor() works.
			return gOPD(obj, name).value;
		}
	}

	return obj[name];
};

module.exports = function extend() {
	var options, name, src, copy, copyIsArray, clone;
	var target = arguments[0];
	var i = 1;
	var length = arguments.length;
	var deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}
	if (target == null || (typeof target !== 'object' && typeof target !== 'function')) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = getProperty(target, name);
				copy = getProperty(options, name);

				// Prevent never-ending loop
				if (target !== copy) {
					// Recurse if we're merging plain objects or arrays
					if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && isArray(src) ? src : [];
						} else {
							clone = src && isPlainObject(src) ? src : {};
						}

						// Never move original objects, clone them
						setProperty(target, { name: name, newValue: extend(deep, clone, copy) });

					// Don't bring in undefined values
					} else if (typeof copy !== 'undefined') {
						setProperty(target, { name: name, newValue: copy });
					}
				}
			}
		}
	}

	// Return the modified object
	return target;
};

},{}],2:[function(_dereq_,module,exports){
/* Font Face Observer v2.3.0 - © Bram Stein. License: BSD-3-Clause */(function(){function p(a,c){document.addEventListener?a.addEventListener("scroll",c,!1):a.attachEvent("scroll",c)}function u(a){document.body?a():document.addEventListener?document.addEventListener("DOMContentLoaded",function b(){document.removeEventListener("DOMContentLoaded",b);a()}):document.attachEvent("onreadystatechange",function g(){if("interactive"==document.readyState||"complete"==document.readyState)document.detachEvent("onreadystatechange",g),a()})};function w(a){this.g=document.createElement("div");this.g.setAttribute("aria-hidden","true");this.g.appendChild(document.createTextNode(a));this.h=document.createElement("span");this.i=document.createElement("span");this.m=document.createElement("span");this.j=document.createElement("span");this.l=-1;this.h.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";this.i.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";
this.j.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";this.m.style.cssText="display:inline-block;width:200%;height:200%;font-size:16px;max-width:none;";this.h.appendChild(this.m);this.i.appendChild(this.j);this.g.appendChild(this.h);this.g.appendChild(this.i)}
function x(a,c){a.g.style.cssText="max-width:none;min-width:20px;min-height:20px;display:inline-block;overflow:hidden;position:absolute;width:auto;margin:0;padding:0;top:-999px;white-space:nowrap;font-synthesis:none;font:"+c+";"}function B(a){var c=a.g.offsetWidth,b=c+100;a.j.style.width=b+"px";a.i.scrollLeft=b;a.h.scrollLeft=a.h.scrollWidth+100;return a.l!==c?(a.l=c,!0):!1}function C(a,c){function b(){var e=g;B(e)&&null!==e.g.parentNode&&c(e.l)}var g=a;p(a.h,b);p(a.i,b);B(a)};function D(a,c,b){c=c||{};b=b||window;this.family=a;this.style=c.style||"normal";this.weight=c.weight||"normal";this.stretch=c.stretch||"normal";this.context=b}var E=null,F=null,G=null,H=null;function I(a){null===F&&(M(a)&&/Apple/.test(window.navigator.vendor)?(a=/AppleWebKit\/([0-9]+)(?:\.([0-9]+))(?:\.([0-9]+))/.exec(window.navigator.userAgent),F=!!a&&603>parseInt(a[1],10)):F=!1);return F}function M(a){null===H&&(H=!!a.document.fonts);return H}
function N(a,c){var b=a.style,g=a.weight;if(null===G){var e=document.createElement("div");try{e.style.font="condensed 100px sans-serif"}catch(q){}G=""!==e.style.font}return[b,g,G?a.stretch:"","100px",c].join(" ")}
D.prototype.load=function(a,c){var b=this,g=a||"BESbswy",e=0,q=c||3E3,J=(new Date).getTime();return new Promise(function(K,L){if(M(b.context)&&!I(b.context)){var O=new Promise(function(r,t){function h(){(new Date).getTime()-J>=q?t(Error(""+q+"ms timeout exceeded")):b.context.document.fonts.load(N(b,'"'+b.family+'"'),g).then(function(n){1<=n.length?r():setTimeout(h,25)},t)}h()}),P=new Promise(function(r,t){e=setTimeout(function(){t(Error(""+q+"ms timeout exceeded"))},q)});Promise.race([P,O]).then(function(){clearTimeout(e);
K(b)},L)}else u(function(){function r(){var d;if(d=-1!=k&&-1!=l||-1!=k&&-1!=m||-1!=l&&-1!=m)(d=k!=l&&k!=m&&l!=m)||(null===E&&(d=/AppleWebKit\/([0-9]+)(?:\.([0-9]+))/.exec(window.navigator.userAgent),E=!!d&&(536>parseInt(d[1],10)||536===parseInt(d[1],10)&&11>=parseInt(d[2],10))),d=E&&(k==y&&l==y&&m==y||k==z&&l==z&&m==z||k==A&&l==A&&m==A)),d=!d;d&&(null!==f.parentNode&&f.parentNode.removeChild(f),clearTimeout(e),K(b))}function t(){if((new Date).getTime()-J>=q)null!==f.parentNode&&f.parentNode.removeChild(f),
L(Error(""+q+"ms timeout exceeded"));else{var d=b.context.document.hidden;if(!0===d||void 0===d)k=h.g.offsetWidth,l=n.g.offsetWidth,m=v.g.offsetWidth,r();e=setTimeout(t,50)}}var h=new w(g),n=new w(g),v=new w(g),k=-1,l=-1,m=-1,y=-1,z=-1,A=-1,f=document.createElement("div");f.dir="ltr";x(h,N(b,"sans-serif"));x(n,N(b,"serif"));x(v,N(b,"monospace"));f.appendChild(h.g);f.appendChild(n.g);f.appendChild(v.g);b.context.document.body.appendChild(f);y=h.g.offsetWidth;z=n.g.offsetWidth;A=v.g.offsetWidth;t();
C(h,function(d){k=d;r()});x(h,N(b,'"'+b.family+'",sans-serif'));C(n,function(d){l=d;r()});x(n,N(b,'"'+b.family+'",serif'));C(v,function(d){m=d;r()});x(v,N(b,'"'+b.family+'",monospace'))})})};"object"===typeof module?module.exports=D:(window.FontFaceObserver=D,window.FontFaceObserver.prototype.load=D.prototype.load);}());

},{}],3:[function(_dereq_,module,exports){
// A minimal default setup requiring only passed in font(s) and not generating any
// interface elements except a tester input
module.exports = {
    initialText: "",
    multiline: true,
    lazyload: false,
    generate: false,
    timeout: 3000, // the default loading timeout after which to fail
    classes: {
        rootClass: "fontsamplerjs",
        
        initClass: "fsjs-initialized",
        loadingClass: "fsjs-loading",
        timeoutClass: "fsjs-timeout",
        preloadingClass: "fsjs-preloading",

        wrapperClass: "fsjs-wrapper",
        blockClass: "fsjs-block",
        blockClassAxis: "fsjs-block-axis",
        elementClass: "fsjs-element",

        labelClass: "fsjs-label",
        labelTextClass: "fsjs-label-text",
        labelValueClass: "fsjs-label-value",
        labelUnitClass: "fsjs-label-unit",

        buttonClass: "fsjs-button",
        buttonSelectedClass: "fsjs-button-selected",

        disabledClass: "fsjs-disabled",
        focusedClass: "fsjs-focused",
    },
    order: [
        // ["fontsize", "lineheight", "letterspacing"],
        // ["fontfamily", "language"],
        // ["alignment", "direction", "opentype"],
        "tester"
    ],
    config: {
        tester: {
            editable: true,
            label: false,
            render: true,
        },
        fontfamily: {
            label: "Font",
            init: "",
            render: true,
        },
        fontsize: {
            unit: "px",
            init: 36,
            min: 8,
            max: 96,
            step: 1,
            label: "Size",
            render: true,
        },
        lineheight: {
            unit: "%",
            init: 100,
            min: 60,
            max: 120,
            step: 5,
            label: "Leading",
            render: true,
        },
        letterspacing: {
            unit: "em",
            init: 0,
            min: -0.1,
            max: 0.1,
            step: 0.01,
            label: "Letterspacing",
            render: true,
        },
        alignment: {
            choices: ["left|Left", "center|Centered", "right|Right"],
            init: "left",
            label: "Alignment",
            render: true,
        },
        direction: {
            choices: ["ltr|Left to right", "rtl|Right to left"],
            init: "ltr",
            label: "Direction",
            render: true,
        },
        language: {
            choices: ["en-GB|English", "de-De|Deutsch", "nl-NL|Dutch"],
            init: "en-Gb",
            label: "Language",
            render: true,
        },
        opentype: {
            choices: ["liga|Ligatures", "frac|Fractions"],
            init: ["liga"],
            label: "Opentype features",
            render: true,
        },
    }
}

},{}],4:[function(_dereq_,module,exports){

module.exports = {
    "noFonts": "Fontsampler: No fonts were passed in.",
    "initFontFormatting": "Fontsampler: Passed in fonts are not in expected format. Expected [ { name: 'Font Name', files: [ 'fontfile.woff', 'fontfile.woff2' ] }, … ]",
    "fileNotfound": "Fontsampler: The passed in file could not be loaded.",

    "missingRoot": "Fontsampler: Passed in root element invalid: ",
    "missingFonts": "Fontsampler: No fonts passed in",
    
    "tooManyFiles": "Fontsampler: Supplied more than one woff or woff2 for a font: ",
    "invalidUIItem": "Fontsampler: The supplied UI item is not supported: ",
    "invalidEvent": "Fontsampler: Invalid event type. You can only register Fontsampler events on the Fontsampler instance.",
    "newInit": "Fontsampler: Instantiated Fontsampler without 'new' keyword. Create Fontsamplers using new Fontsampler(…)",
    "dataFontsJsonInvalid": "Fontsampler: The data-fonts JSON failed to parse.",
    "invalidDOMOptions": "Fontsampler: Could not parse data-options on Fontsampler root node. Make sure it is valid JSON and follows the default options structure.",
    "invalidVariation": "Fontsampler: Invalid variation instance values"
}

},{}],5:[function(_dereq_,module,exports){

module.exports = {
    "init": "fontsampler.events.init",
    "skinInit": "fontsampler.events.skininit",
    "languageChanged": "fontsampler.events.languagechanged",
    "fontChanged": "fontsampler.events.fontchanged",
    "fontLoaded": "fontsampler.events.fontloaded",
    "fontRendered": "fontsampler.events.fontrendered",
    "fontsPreloaded": "fontsampler.events.fontspreloaded",
    "valueChanged": "fontsampler.events.valuechanged",
    "opentypeChanged": "fontsampler.events.opentypechanged",
    "focused": "fontsampler.events.focused",
    "blurred": "fontsampler.events.blurred",
}

},{}],6:[function(_dereq_,module,exports){
var FontFaceObserver = _dereq_("../node_modules/fontfaceobserver/fontfaceobserver.standalone")
var errors = _dereq_("./constants/errors")
var supports = _dereq_("./helpers/supports")
var helpers = _dereq_("./helpers/helpers")


/**
 * To avoid initiating simultanouse file load requests for the same font file
 * orchestrate font loading through this global load queuer
 */
function GlobalLoader() {

    var queue = [], // array of loading fonts
        done = {}, // object with fontface objects
        callbacks = {} // object with family name index and lists of success/error
        // callbacks to do when loaded

    function onFontDone(family, file, success, error, timeout) {

        // If Is font loaded? -> to cb responses, return true
        // El Is font loading? -> add responses to queue, return true
        // El Add font to loading, add responses to queue, return false (init loading)

        if (family in done === true) {
            // font is loaded
            if (done[family].isLoaded === true) {
                success(done[family])
            } else {
                error(done[family])
            }

        } else if (queue.indexOf(family) !== -1) {
            // font in load queue but not loaded
            callbacks[family].success.push(success)
            callbacks[family].error.push(error)

        } else {
            queue.push(family)
            callbacks[family] = {
                success: [success],
                error: [error]
            }

            load(family, file, timeout)
        }
    }

    /**
     * When a font is loaded remove it from the queue, call all listeners’
     * callbacks and save it’s FontFace in `done` for later-coming requests
     * 
     * @param {obj} fontface 
     */
    function onSuccess(fontface) {

        queue.splice(queue.indexOf(fontface.family), 1)

        // Order matters here; the callbacks might rely on this family
        // as being marked loaded (e.g. lazyloading)
        fontface.isLoaded = true
        done[fontface.family] = fontface

        if (fontface.family in callbacks && "success" in callbacks[fontface.family]) {
            for (var i = 0; i < callbacks[fontface.family].success.length; i++) {
                callbacks[fontface.family].success[i](fontface)
            }
            callbacks[fontface.family] = {}
        }
    }

    function onError(family, file, e) {
        console.error(family, file, e)
        console.error(new Error(errors.fileNotfound))
        if (typeof(error) === "function") {
            error(e)
        }
    }

    /**
     * The actual load logic with FontFace API or @font-face fallback
     * 
     * @param {str} family 
     * @param {str} file 
     * @param {int} timeout 
     */
    function load(family, file, timeout) {
        if (typeof(timeout) === "undefined") {
            timeout = 3000
        }

        if ("FontFace" in window) {
            var ff = new FontFace(family, "url(" + file + ")", {})
            ff.load().then(function() {
                document.fonts.add(ff)
                onSuccess(ff)
            }, function(e) {
                onError(family, file, e)
            })
        } else {
            // Fallback to loading via @font-face and manually inserted style tag
            // Utlize the FontFaceObserver to detect when the font is available
            var font = new FontFaceObserver(family)
            font.load(null, timeout).then(function(ff) {
                onSuccess(ff)
            }, function(e) {
                onError(family, file, e)
            })

            var newStyle = document.createElement("style");
            newStyle.appendChild(document.createTextNode("@font-face { font-family: '" + family + "'; src: url('" + file + "'); }"));
            document.head.appendChild(newStyle);
        }
    }

    return {
        onFontDone: onFontDone
    }
}

function loadFont(file, callback, error, timeout) {
    if (!file) {
        return false
    }

    var family = file.substring(file.lastIndexOf("/") + 1)
    family = family.substring(0, family.lastIndexOf("."))
    family = family.replace(/\W/gm, "")

    // Create or get global Loader queuer, append request
    if ("FontsamplerFontloader" in window === false) {
        window.FontsamplerFontloader = GlobalLoader()
    }
    window.FontsamplerFontloader.onFontDone(family, file, callback, error, timeout)
}

/**
 * A convenience wrapper around loadFont picking the best font format
 * in @param files
 * 
 * @param {Array} files 
 * @param {function} callback 
 * @param {object} error 
 * @param {int} timeout 
 */
function fromFiles(files, callback, error, timeout) {
    font = helpers.bestWoff(files)
    loadFont(font, callback, error, timeout)
}

module.exports = {
    "loadFont": loadFont,
    "fromFiles": fromFiles,
}
},{"../node_modules/fontfaceobserver/fontfaceobserver.standalone":2,"./constants/errors":4,"./helpers/helpers":9,"./helpers/supports":11}],7:[function(_dereq_,module,exports){
/**
 * Fontsampler.js
 * 
 * A configurable standalone webfont type tester for displaying and manipulating sample text.
 * 
 * @author Johannes Neumeier <hello@underscoretype.com>
 * @copyright 2019-2022 Johannes Neumeier
 * @license GNU GPLv3
 */
var extend = _dereq_("../node_modules/extend")

var Fontloader = _dereq_("./fontloader")
var Interface = _dereq_("./ui")
var Preloader = _dereq_("./preloader")

var errors = _dereq_("./constants/errors")
var events = _dereq_("./constants/events")
var _defaults = _dereq_("./constants/defaults")

var helpers = _dereq_("./helpers/helpers")
var utils = _dereq_("./helpers/utils")
var dom = _dereq_("./helpers/dom")
var supports = _dereq_("./helpers/supports")

/**
 * The main constructor for setting up a new Fontsampler instance
 * @param Node root 
 * @param Object | null fonts 
 * @param Object | null opt 
 */
function Fontsampler(_root, _fonts, _options) {
    console.debug("Fontsampler()", _root, _fonts, _options)

    var ui, options, fonts,
        preloader = new Preloader(),
        passedInOptions = false,
        // deep clone the _defaults
        defaults = (JSON.parse(JSON.stringify(_defaults))),
        that = this

    // Make sure new instances are create with new Fontsampler
    // this will === window if Fontsampler() is used without
    // the new keyword
    if (this === window) {
        throw new Error(errors.newInit)
    }

    // At the very least confirm a valid root element to render to
    if (!_root) {
        throw new Error(errors.missingRoot + _root)
    }
    
    if (!Array.isArray(_fonts) || _fonts.length < 1) {
        throw new Error(errors.missingFonts)
    }
    this.root = _root
    this.initialized = false
    this.currentFont = false
    this.loadedFonts = []

    // Parse fonts and options from the passed in objects or possibly
    // from the root node data attributes
    options = parseOptions.call(this, _options)
    fonts = parseFonts.call(this, _fonts)
    ui = Interface(this, fonts, options)


    function parseFonts(fonts) {

        // Store each font's axes and parse instance definitions into obj form
        for (var i = 0; i < fonts.length; i++) {
            var font = fonts[i];

            if (Object.keys(font).indexOf("instance") !== -1) {
                font.instance = helpers.parseVariation(font.instance)
                font.axes = Object.keys(font.instance)
            } else {
                font.axes = []
            }
        }

        return fonts
    }

    /**
     * 
     * @param {*} opt 
     * By default:
     * - dont generate any DOM
     * - if an element is set either in ui.xxx or order is set, generate those
     * - if anything is present in the dom, validate and use those
     * ALWAYS append tester if it is not present
     */
    function parseOptions(opt) {
        var extractedOptions = false,
            nodesInDom = this.root.querySelectorAll("[data-fsjs]"),
            blocksInDom = [],
            blocksInOrder = [],
            blocksInUI = [],
            blocks = []

        // Extend or use the default options in order of:
        // defaults < options < data-options
        if ("options" in this.root.dataset) {
            try {
                extractedOptions = JSON.parse(this.root.dataset.options)
            } catch (e) {
                console.error(e)
            }
        }

        // Determine if we got any passed in options at all
        if (typeof(opt) === "object" && typeof(extractedOptions) === "object") {
            passedInOptions = extend(true, opt, extractedOptions)
        } else if (typeof(opt) === "object") {
            passedInOptions = opt
        } else if (typeof(extractedOptions) === "object") {
            passedInOptions = extractedOptions
        }

        if (typeof(passedInOptions) === "object") {
            // If any of the passed in options.config.xxx are simply "true" instead of
            // an boolean let’s copy the default values for this ui element
            // if ("ui" in passedInOptions === true) {
            //     for (var u in passedInOptions.config) {
            //         if (passedInOptions.config.hasOwnProperty(u)) {
            //             if (typeof(passedInOptions.config[u]) !== "object") {
            //                 passedInOptions.config[u] = defaults.ui[u]
            //             }
            //         }
            //     }
            // }
            // Extend the defaults
            options = extend(true, defaults, passedInOptions)
        } else {
            options = defaults
        }

        // Go through all DOM UI nodes, passed in ui ´order´ options and ´ui´ options
        // to determine what blocks are in the Fontsampler, and make sure all defined
        // blocks get rendered. "Defined" can be a combination of:
        // · block in the DOM
        // · block in options.order
        // · block in options.config
        if (nodesInDom.length > 0) {
            for (var b = 0; b < nodesInDom.length; b++) {
                blocksInDom[b] = nodesInDom[b].dataset.fsjs
            }
        }
        blocksInOrder = typeof(opt) === "object" && "order" in opt ? utils.flattenDeep(opt.order) : []
        blocksInUI = typeof(opt) === "object" && "ui" in opt ? Object.keys(opt.ui) : []
        blocks = blocksInDom.concat(blocksInOrder, blocksInUI)
        blocks = utils.arrayUnique(blocks)

        // Always make sure we are rendering at least a tester, no matter the configuration
        if (blocks.indexOf("tester") === -1) {
            blocks.push("tester")
        }

        // A passed in UI order superseeds, not extends!, the default
        if (typeof opt === "object" && "order" in opt && Array.isArray(opt.order) && opt.order.length) {
            options.order = opt.order
        } else if (
            typeof extractedOptions === "object" && "order" in extractedOptions &&
            Array.isArray(extractedOptions.order) && extractedOptions.order.length) {
            options.order = extractedOptions.order
        }

        // Then: check DOM and UI for any other present blocks and append them
        // in case they are missing
        var blocksInOrderNow = utils.flattenDeep(options.order)
        for (var i = 0; i < blocks.length; i++) {
            if (blocksInOrderNow.indexOf(blocks[i]) === -1) {
                options.order.push(blocks[i])
            }
        }

        return options
    }

    // Setup the interface listeners and delegate events back to the interface
    function setupUIEvents() {

        // checkbox
        this.root.addEventListener(events.opentypeChanged, function() {
            var val = ui.getOpentype()
            ui.setInputOpentype(val)
        })

        // dropdowns
        var that = this
        this.root.addEventListener(events.fontChanged, function(e) {
            if (e.detail.font) {
                if (typeof(this.currentFont) === "undefined") {
                    that.showFont(e.detail.font)
                }
            }
        })
    }

    /**
     * Encapuslation for what should happen on a font switch, either
     * after the font has loaded or after the already current font
     * has received this update (e.g. dropdown select of a variable
     * font instance)
     */
    function initFont(fontface) {
        that.currentFont.fontface = fontface

        ui.setStatusClass(options.classes.loadingClass, false)

        // Update the css font family
        var family = fontface.family
        if ("fallback" in that.currentFont) {
            family += "," + that.currentFont.fallback
        }
        ui.setInputCss("fontFamily", family)

        // Update active axes and set variation of this instance
        ui.setActiveAxes(that.currentFont.axes)
        if ("instance" in that.currentFont === true) {
            for (var tag in that.currentFont.instance) {
                ui.setValue(tag, that.currentFont.instance[tag])
            }
        }

        // Update available OT features for this font
        ui.setActiveOpentype(that.currentFont.features)

        // Update the currently select language if the font defines one
        if (typeof(that.currentFont.language) === "string") {
            ui.setActiveLanguage(that.currentFont.language)
        }

        ui.setActiveFont(that.currentFont.name)

        preloader.resume()

        // Set the is-instance or is-static class on the root
        dom.nodeRemoveClass(that.root, "is-instance")
        dom.nodeRemoveClass(that.root, "is-static")
        dom.nodeAddClass(that.root, !!that.currentFont.instance ? "is-instance": "is-static")
        _root.dispatchEvent(new CustomEvent(events.fontRendered, {
            detail: {
                fontsampler: that
            }
        }))

    }

    /**
     * PUBLIC API
     */

    this.init = function() {
        console.debug("Fontsampler.init()", this, this.root)

        var that = this,
            initialFont = 0;

        if ("fontfamily" in options.config &&
            "init" in options.config.fontfamily === true &&
            typeof(options.config.fontfamily.init) === "string" &&
            options.config.fontfamily.init !== "") {

            initialFont = options.config.fontfamily.init
        } else {
            // If the initial font was not set explicity and we have variable
            // axes, then their init values should be set once the font has
            // loaded
            var axesInits = {}
            for (var key in options.config) {
                if (ui.isAxisKey(key) && "init" in options.config[key]) {
                    axesInits[key] = options.config[key].init
                }
            }
            if (axesInits !== {}) {
                function setAxesInits() {
                    for (var axis in axesInits) {
                        ui.setValue(axis, axesInits[axis])
                    }
                    that.root.removeEventListener(events.fontRendered, setAxesInits)
                }
                that.root.addEventListener(events.fontRendered, setAxesInits)
            }
        }

        ui.init()
        setupUIEvents.call(this)
        this.showFont.call(this, initialFont)

        if (options.lazyload) {
            ui.setStatusClass(options.classes.preloadingClass, true)
            preloader.load(fonts, function() {
                ui.setStatusClass(options.classes.preloadingClass, false)
                _root.dispatchEvent(new CustomEvent(events.fontsPreloaded))
            })
        }

        dom.nodeAddClass(this.root, options.classes.initClass)
        dom.nodeAddClass(this.root, supports.woff2 ? "fsjs-woff2" : "fsjs-woff")
        dom.nodeAddClass(this.root, supports.variableFonts ? "fsjs-variable-fonts" : "fsjs-no-variable-fonts")

        this.root.dispatchEvent(new CustomEvent(events.init))
        this.initialized = true

        // For convenience also have the init method return the instance
        // This way you can create the object and init it, e.g.
        // var fs = new Fontsampler().init()
        return this
    }

    /**
     * The public interface for showing (and possibly loading) a font
     */
    this.showFont = function(indexOrKey) {
        console.debug("Fontsampler.showFont", indexOrKey)
        var font;

        preloader.pause()
        ui.setStatusClass(options.classes.loadingClass, true)
        ui.setStatusClass(options.classes.timeoutClass, false)

        if (typeof(indexOrKey) === "string") {
            font = fonts.filter(function(value, index) {
                return fonts[index].name === indexOrKey
            }).pop()
            // If no font or instance of that name is found in fonts default to first
            if (!font) {
                console.warn("Fontsampler.showFont(" + indexOrKey + ") - font not found, using first font.", fonts)
                font = fonts[0]
            }
        } else if (typeof(indexOrKey) === "number" && indexOrKey >= 0 && indexOrKey <= fonts.length) {
            font = fonts[indexOrKey]
        }

        if (this.currentFont && this.currentFont.files && JSON.stringify(this.currentFont.files) === JSON.stringify(font.files)) {
            // Same font file (Variation might be different)
            // Skip straight to "fontLoaded" procedure, but retain the fontface
            // of the currentFont
            font.fontface = this.currentFont.fontface
            this.currentFont = font
            initFont(this.currentFont.fontface)

        } else {
            // Load a new font file
            this.currentFont = font

            // The actual font load
            Fontloader.fromFiles(font.files, function(fontface) {
                var fjson = JSON.stringify(fontface)

                if (that.loadedFonts.indexOf(fjson) === -1) {
                    that.loadedFonts.push(fjson)
                    _root.dispatchEvent(new CustomEvent(events.fontLoaded, { detail: fontface }))
                }

                initFont(fontface)
            }, function( /* fontface */ ) {
                ui.setStatusClass(options.classes.loadingClass, false)
                ui.setStatusClass(options.classes.timeoutClass, true)
                that.currentFont = false
            }, options.timeout)
        }
    }

    this.setText = function(text) {
        ui.setInputText(text)
    }

    this.getValue = function(key) {
        return ui.getValue(key)
    }

    this.setValue = function(key, value) {
        return ui.setValue(key, value)
    }

    this.setLabel = function(key, value) {
        return ui.setLabelValue(key, value)
    }

    this.addEventListener = function(event, listener) {
        this.root.addEventListener(event, listener)
    }

    return this
}

module.exports = Fontsampler
},{"../node_modules/extend":1,"./constants/defaults":3,"./constants/errors":4,"./constants/events":5,"./fontloader":6,"./helpers/dom":8,"./helpers/helpers":9,"./helpers/supports":11,"./helpers/utils":12,"./preloader":13,"./ui":14}],8:[function(_dereq_,module,exports){
/**
 * DOM related helpers
 */

function pruneClass(className, classNames) {
    if (!classNames) {
        return ""
    }

    classNames = classNames.trim()

    if (!className) {
        return classNames
    }

    className = className.trim()

    var classes = classNames.split(" "),
        classIndex = classes.indexOf(className)

    if (classIndex !== -1) {
        classes.splice(classIndex, 1)
    }

    if (classes.length > 0) {
        return classes.join(" ")
    } else {
        return ""
    }
}

/**
 * 
 * @param str className 
 * @param str classNames - space separated
 */
function addClass(className, classNames) {
    if (!classNames) {
        classNames = ""
    }

    if (className === classNames) {
        return classNames
    }

    classNames = classNames.trim()

    if (!className) {
        return classNames
    }

    className = className.trim()

    var classes = classNames.split(" "),
        classIndex = classes.indexOf(className)

    if (classIndex === -1) {
        if (classNames) {
            return classNames + " " + className
        } else {
            return className
        }
    } else {
        return classNames
    }
}

function nodeAddClass(node, className) {
    if (!isNode(node) || typeof(className) !== "string") {
        return false
    }

    node.className = addClass(className, node.className)

    return true
}

function nodeAddClasses(node, classes) {
    if (!isNode(node) || !Array.isArray(classes) || classes.length < 1) {
        return false
    }

    for (var c = 0; c < classes.length; c++) {
        node.className = addClass(classes[c], node.className)
    }

    return true
}

function nodeRemoveClass(node, className) {
    if (!isNode(node) || typeof(className) !== "string") {
        return false
    }

    node.className = pruneClass(className, node.className)

    return true
}

/**
 * Really just an approximation of a check
 * 
 * @param {*} node 
 */
function isNode(node) {
    return typeof(node) === "object" && node !== null && "nodeType" in node
}

module.exports = {
    nodeAddClass: nodeAddClass,
    nodeAddClasses: nodeAddClasses,
    nodeRemoveClass: nodeRemoveClass,
    isNode: isNode
}
},{}],9:[function(_dereq_,module,exports){

var supports = _dereq_("./supports")
var errors = _dereq_("../constants/errors")

/**
 * App specific helpers
 */


/**
 * Check fonts are passed in with correct structure, e.g.
 * fonts: [ { "Font Name" : [ "fontfile.woff", "fontfile.woff2" ] } ]
 * 
 * TODO: Check that at most only one woff and one woff2 is passed in
 * TODO: Check in passed in axes axes are defined
 * 
 * @param {*} fonts
 */
function validateFontsFormatting(fonts) {
    if (typeof(fonts) !== "object" || !Array.isArray(fonts)) {
        return false
    }

    for (var i = 0; i < fonts.length; i++) {
        var font = fonts[i]
        if (typeof(font) !== "object") {
            return false
        }

        if (!font.name || !font.files || !Array.isArray(font.files) || font.files.length <= 0) {
            return false
        }
    }

    return true
}

function extractFontsFromDOM(root) {
    var select = root.querySelector("[data-fsjs='fontfamily']"),
        options = [],
        fonts = []

    // First try to get data-fonts or data-woff/2 on the root element
    // If such are found, return them
    var rootFonts = extractFontsFromNode(root, true)
    if (rootFonts) {
        return rootFonts
    }

    // Otherwise check if there is a dropdown with options that have
    // data-woff/2 elements
    if (!select) {
        return false
    }

    options = select.querySelectorAll("option")
    for (i = 0; i < options.length; i++) {
        var opt = options[i],
            extractedFonts = extractFontsFromNode(opt, false)

        if (fonts) {
            fonts = fonts.concat(extractedFonts)
        }
    }

    if (fonts) {
        return fonts
    }

    return false
}

function extractFontsFromNode(node, ignoreName) {
    var fonts = [],
        singleFont = {
            "name": "Default",
            "files": []
        }

    // prever a data-fonts json_encoded array
    if (node.dataset.fonts) {
        try {
            fonts = JSON.parse(node.dataset.fonts)
            return fonts
        } catch (error) {
            console.error(node.dataset.fonts)
            throw new Error(errors.dataFontsJsonInvalid)
        }
    }

    // else see if a single font can be extracted
    if (node.dataset.name) {
        singleFont.name = node.dataset.name
    }

    if (node.dataset.woff) {
        singleFont.files.push(node.dataset.woff)
    }

    if (node.dataset.woff2) {
        singleFont.files.push(node.dataset.woff2)
    }

    if ((singleFont.name || (!singleFont.name && ignoreName)) && singleFont.files.length > 0) {
        return [singleFont]
    }

    return false
}

/**
 * Split an input choice into value and text or return only the value as 
 * both if no separator is used to provide a readable label
 * e.g. "ltr|Left" to right becomes { val: "ltr", text: "Left to right"}
 * but: "left" becomes { val: "left", text: "left"}
 * @param string choice 
 * @return obj {val, text}
 */
function parseParts(choice) {
    var parts, val, text

    if (choice.indexOf("|") !== -1) {
        parts = choice.split("|")
        val = parts[0]
        text = parts[1]
    } else {
        val = choice
        text = choice
    }

    return {
        val: val,
        text: text
    }
}

function getExtension(path) {
    return path.substring(path.lastIndexOf(".") + 1)
}


function bestWoff(files) {
    if (typeof(files) !== "object" || !Array.isArray(files)) {
        return false
    }

    var woffs = files.filter(function(value) {
            return getExtension(value) === "woff"
        }),
        woff2s = files.filter(function(value) {
            return getExtension(value) === "woff2"
        })

    if (woffs.length > 1 || woff2s.length > 1) {
        throw new Error(errors.tooManyFiles + files)
    }

    if (woff2s.length > 0 && supports.woff2) {
        return woff2s.shift()
    }

    if (woffs.length > 0) {
        return woffs.shift()
    }

    return false
}


function parseVariation(stringOrObj) {
    var variations = {},
        parts;
        
    if (typeof(stringOrObj) === "string" && stringOrObj.trim() !== "") {
        // split all declarations by commas, then parse each axis to value pair
        stringOrObj = stringOrObj.replace(/'|"/gm, "")
        
        parts = stringOrObj.split(",")
        for (var i = 0; i < parts.length; i++) {
            try {
                var part = parts[i],
                    axis = part.match(/^\s?[A-z]{4}\s?/gm),
                    val = part.match(/\s?[0-9\.]+\s?/gm)
                if (axis.length > 0 && val.length > 0) {
                    variations[axis[0].trim()] = val[0].trim()
                }
            } catch (e) {
                error.log(e)
            }
        }
    } else {
        // TODO validate/parse
        variations = stringOrObj
    }
    return variations
}

module.exports = {
    getExtension: getExtension,   
    parseParts: parseParts,
    validateFontsFormatting: validateFontsFormatting,
    extractFontsFromDOM: extractFontsFromDOM,
    bestWoff: bestWoff,
    parseVariation: parseVariation
}
},{"../constants/errors":4,"./supports":11}],10:[function(_dereq_,module,exports){
/**
 * Helper module to deal with caret position
 */
function Selection () {

    // from https://stackoverflow.com/a/4812022/999162
    var setSelectionByCharacterOffsets = null;

    if (window.getSelection && document.createRange) {
        setSelectionByCharacterOffsets = function (containerEl, start, end) {
            var charIndex = 0,
                range = document.createRange();
            range.setStart(containerEl, 0);
            range.collapse(true);
            var nodeStack = [containerEl],
                node, foundStart = false,
                stop = false;

            while (!stop && (node = nodeStack.pop())) {
                if (node.nodeType == 3) {
                    var nextCharIndex = charIndex + node.length;
                    if (!foundStart && start >= charIndex && start <= nextCharIndex) {
                        range.setStart(node, start - charIndex);
                        foundStart = true;
                    }
                    if (foundStart && end >= charIndex && end <= nextCharIndex) {
                        range.setEnd(node, end - charIndex);
                        stop = true;
                    }
                    charIndex = nextCharIndex;
                } else {
                    var i = node.childNodes.length;
                    while (i--) {
                        nodeStack.push(node.childNodes[i]);
                    }
                }
            }

            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        };
    } else if (document.selection) {
        setSelectionByCharacterOffsets = function (containerEl, start, end) {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(containerEl);
            textRange.collapse(true);
            textRange.moveEnd("character", end);
            textRange.moveStart("character", start);
            textRange.select();
        };
    }


    // From https://stackoverflow.com/a/4812022/999162
    function getCaretCharacterOffsetWithin(element) {
        var caretOffset = 0;
        var doc = element.ownerDocument || element.document;
        var win = doc.defaultView || doc.parentWindow;
        var sel;
        if (typeof win.getSelection != "undefined") {
            sel = win.getSelection();
            if (sel.rangeCount > 0) {
                var range = win.getSelection().getRangeAt(0);
                var preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(element);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                caretOffset = preCaretRange.toString().length;
            }
        } else if ((sel = doc.selection) && sel.type != "Control") {
            var textRange = sel.createRange();
            var preCaretTextRange = doc.body.createTextRange();
            preCaretTextRange.moveToElementText(element);
            preCaretTextRange.setEndPoint("EndToEnd", textRange);
            caretOffset = preCaretTextRange.text.length;
        }
        return caretOffset;
    }

    return {
        setCaret: setSelectionByCharacterOffsets,
        getCaret: getCaretCharacterOffsetWithin
    };

}

module.exports = Selection
},{}],11:[function(_dereq_,module,exports){

/**
 * Just a centralized wrapper around the native CSS.supports, which
 * superseds variable font support, so it is a handy way to eliminate 
 * pre-variable font browsers
 */
function variableFonts() {
    if ("CSS" in window === false || "supports" in CSS === false) {
        return false
    }
    
    return CSS.supports("(font-variation-settings: normal)")
}

/**
 * Simple woff2 support detection with a shim font, copied from:
 * npm woff2-feature-test
 */
function woff2() {
    if ("FontFace" in window === false) {
        return false;
    }

    var f = new FontFace('t', 'url( "data:application/font-woff2;base64,d09GMgABAAAAAADwAAoAAAAAAiQAAACoAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmAALAogOAE2AiQDBgsGAAQgBSAHIBuDAciO1EZ3I/mL5/+5/rfPnTt9/9Qa8H4cUUZxaRbh36LiKJoVh61XGzw6ufkpoeZBW4KphwFYIJGHB4LAY4hby++gW+6N1EN94I49v86yCpUdYgqeZrOWN34CMQg2tAmthdli0eePIwAKNIIRS4AGZFzdX9lbBUAQlm//f262/61o8PlYO/D1/X4FrWFFgdCQD9DpGJSxmFyjOAGUU4P0qigcNb82GAAA" ) format( "woff2" )', {});
    f.load()['catch'](function() {});

    return f.status === 'loading' || f.status === 'loaded';
}

/**
 * Return the executed method returns as attributes of this module
 */
module.exports = {
    variableFonts: (variableFonts)(),
    woff2: (woff2)()
}
},{}],12:[function(_dereq_,module,exports){
/**
 * Non-app specific JS helpers
 */

/**
 * Number clamp to min—max with fallback for when any input value is not a number
 * @param {*} value 
 * @param {*} min 
 * @param {*} max 
 * @param {*} fallback 
 */
function clamp(value, min, max, fallback) {
    value = parseFloat(value)
    min = parseFloat(min)
    max = parseFloat(max)

    if (isNaN(value) || isNaN(min) || isNaN(max)) {
        if (typeof(fallback) !== "undefined") {
            value = fallback
        } else {
            return value
        }
    }

    return Math.min(max, Math.max(value, min))
}

/**
 * flatten an array recursively from https://stackoverflow.com/a/42916843/999162
 * @method flattenDeep
 * @param array {Array}
 * @return {Array} flatten array
 */
function flattenDeep(array) {
    try {
        return array.reduce(function(acc, current) {
            return Array.isArray(current) ? acc.concat(flattenDeep(current)) : acc.concat([current]);
        }, []);
    } catch (e) {
        console.error(e)
        return []
    }
}

function arrayUnique(a) {
    if (!Array.isArray(a)) {
        return false
    }
    return a.filter(function(value, index, self) {
        return self.indexOf(value) === index
    }, a)
}

module.exports = {
    flattenDeep: flattenDeep,
    arrayUnique: arrayUnique,
    clamp: clamp
}
},{}],13:[function(_dereq_,module,exports){
var Fontloader = _dereq_("./fontloader")

function Preloader() {

    var queue = [],
        autoload = true,
        finishedCallback = null

    function load(fonts, callback) {

        // clone the fonts array
        queue = fonts.slice(0)
        autoload = true

        if (typeof(callback) === "function") {
            finishedCallback = callback
        }

        loadNext()
    }

    function pause() {
        autoload = false
    }

    function resume() {
        autoload = true
        if (queue.length > 0) {
            loadNext()
        } else {
            if (finishedCallback) {
                finishedCallback()
            }
        }
    }

    function loadNext() {
        if (queue.length > 0 && autoload) {
            Fontloader.fromFiles(queue[0].files, function () {
                queue.shift()

                if (queue.length === 0 && finishedCallback) {
                    finishedCallback()
                }
                
                if (queue.length > 0 && autoload) {
                    loadNext()
                }
            }, function () {
            }, 5000)
        }
    }

    return {
        load: load,
        pause: pause,
        resume: resume
    }
}


module.exports = Preloader
},{"./fontloader":6}],14:[function(_dereq_,module,exports){
/**
 * A wrapper around the Fontsampler interface
 * 
 * 
 * Generally, the DOM is structured in such a way:
 * 
 * Each nested Array in ´order´ is enclosed in a
 * 
 * .fsjs-wrapper
 * 
 * In each (optional, e.g. without Array straight output) wrapper one more more:
 * 
 *  [data-fsjs-block=_property_].fsjs-block .fsjs-block-_property_ .fsjs-block-type-_type_
 * 
 * Nested in each block a variety of sub elements:
 *      Optional label with:
 *      [data-fsjs-for=_property_].fsjs-label
 *          [data-label-text=_property_].fsjs-label-text
 *          [data-label-value=_property_].fsjs-label-value (optional)
 *          [data-label-unit=_property_].fsjs-label-unit (optional)
 * 
 *      The actual ui control (input, select, buttongroup)
 *      [data-fsjs=_property_].fsjs-element-_property_
 * 
 * The terminology used in this class uses `block` for a wrapper of an UI element
 * and `element` for the actual UI element that has a value, e.g. the HTML input
 * or select etc.
 */
var selection = _dereq_("./helpers/selection")

var UIElements = _dereq_("./uielements")

// var errors = require("./constants/errors")
var events = _dereq_("./constants/events")
var defaults = _dereq_("./constants/defaults")

var dom = _dereq_("./helpers/dom")
var utils = _dereq_("./helpers/utils")
var supports = _dereq_("./helpers/supports")

function UI(fs, fonts, options) {

    var ui = {
        tester: "textfield",
        fontsize: "slider",
        lineheight: "slider",
        letterspacing: "slider",
        fontfamily: "dropdown",
        alignment: "buttongroup",
        direction: "buttongroup",
        language: "dropdown",
        opentype: "checkboxes"
    },
        keyToCss = {
            "fontsize": "fontSize",
            "lineheight": "lineHeight",
            "letterspacing": "letterSpacing",
            "alignment": "text-align"
        },
        blocks = {},
        uifactory = null, // instance of uielements
        input = null, // the tester text field
        originalText = "", // used to store textContent that was in the root node on init
        root = fs.root

    function init() {
        console.debug("Fontsampler.Interface.init()", root, fonts, options)

        dom.nodeAddClass(root, options.classes.rootClass)
        uifactory = UIElements(root, options)

        // The `fontfamily` UI option is just being defined without the options, which
        // are the fonts passed in. Let’s make this transformation behind
        // the scenes so we can use the re-usable "dropdown" ui by defining
        // the needed `choices` attribute
        if (options.config.fontfamily && typeof (options.config.fontfamily) === "boolean") {
            options.config.fontfamily = {}
        }
        options.config.fontfamily.choices = fonts.map(function (value) {
            return value.name
        })

        // Before modifying the root node, detect if it is containing only
        // text, and if so, store it to the options for later use
        // NOTE: This currently only extracts single nodes or text, not an
        // entire node tree possible nested in the root node
        if (root.childNodes.length === 1 && root.childNodes[0].nodeType === Node.TEXT_NODE) {
            originalText = root.childNodes[0].textContent
            root.removeChild(root.childNodes[0])
        }
        options.originalText = originalText

        // Clear the slate
        while (root.childNodes.length) {
            root.removeChild(root.childNodes[0])
        }

        // Process the possible nested order arrays in order one by one
        // · Existing DOM nodes will be validated and initiated (TBD drop or check implementation)
        // · UI elements defined via options but missing from the DOM will be created
        // · UI elements defined in ui option but not in order option will be 
        //   appended to the end
        // · Items neither in the DOM nor in options are skipped
        for (var i = 0; i < options.order.length; i++) {
            var elementA = parseOrder(options.order[i])
            if (dom.isNode(elementA) && elementA.childNodes.length > 0 && !elementA.isConnected) {
                root.appendChild(elementA)
            }
        }

        // Save the tester for convenience
        input = getElement("tester", blocks.tester)

        if (options.originalText) {
            this.setInputText(options.originalText.trim())
        }
        if ("initialText" in options && options.initialText !== "") {
            this.setInputText(options.initialText.trim())
        }

        // after all nodes are instantiated, update the tester to reflect
        // the current state
        for (var keyC in blocks) {
            if (blocks.hasOwnProperty(keyC)) {
                initBlock(keyC)
            }
        }

        // Set values for configs that are set but do not have a rendered block
        let block_keys = Object.keys(blocks),
            options_without_ui = Object.keys(options.config).filter(k => block_keys.indexOf(k) === -1);

        options_without_ui.forEach(key => {
            // Set the initial value
            setValue(key, options.config[key].init)
        })

        // prevent line breaks on single line instances
        if (!options.multiline) {
            var typeEvents = ["keypress", "keyup", "change", "paste"]
            for (var e in typeEvents) {
                if (typeEvents.hasOwnProperty(e)) {
                    blocks.tester.addEventListener(typeEvents[e], onKey)
                }
            }
        }

        // prevent pasting styled content
        blocks.tester.addEventListener('paste', function (e) {
            e.preventDefault();
            var text = '';
            if (e.clipboardData || e.originalEvent.clipboardData) {
                text = (e.originalEvent || e).clipboardData.getData('text/plain');
            } else if (window.clipboardData) {
                text = window.clipboardData.getData('Text');
            }

            if (!options.multiline) {
                text = text.replace(/(?:\r\n|\r|\n|<br>)/g, ' ')
            }

            if (document.queryCommandSupported('insertText')) {
                document.execCommand('insertText', false, text);
            } else {
                document.execCommand('paste', false, text);
            }
        });

        blocks.tester.addEventListener('focusin', function (e) {
            sendEvent(events.focused)
            dom.nodeAddClass(root, options.classes.focusedClass)
        })

        blocks.tester.addEventListener('focusout', function (e) {
            sendEvent(events.blurred)
            dom.nodeRemoveClass(root, options.classes.focusedClass)
        })
    }

    /**
     * Recursively go through an element in the options.order
     * @param string key
     * @param node parent
     */
    function parseOrder(key) {
        var child, wrapper

        if (typeof (key) === "string") {
            var block = createBlock(key)
            blocks[key] = block

            return block
        } else if (Array.isArray(key)) {
            wrapper = document.createElement("div")
            wrapper.className = options.classes.wrapperClass

            for (var i = 0; i < key.length; i++) {
                child = parseOrder(key[i])
                if (child) {
                    wrapper.appendChild(child)
                }
            }

            if (wrapper.children.length < 1) {
                return false
            }

            return wrapper
        } else if (key instanceof HTMLElement) {
            wrapper = document.createElement("div")
            if (key.classList) {
                wrapper.classList = key.classList
                key.className = ""
            }
            wrapper.className += " " + options.classes.blockClass

            if (key.hasAttribute("id")) {
                wrapper.setAttribute("id", key.getAttribute("id"))
                key.removeAttribute("id")
            }
            wrapper.appendChild(key)

            return wrapper
        } else {
            // Skipping not defined UI element
            console.warn("Skipping unspecified 'order' item, not a known Fontsampler JS element nor a valid DOM node: " + key)

            return false
        }
    }

    /**
     * Create a block wrapper and the UI element it contains
     * 
     * @param {string} key 
     */
    function createBlock(key) {
        var block = document.createElement("div"),
            element = false,
            label = false,
            opt = null;

        if (key in options.config === false) {
            console.error("No options defined for block", key)
            return false
        }

        opt = options.config[key]

        if (opt.label) {
            label = uifactory.label(opt.label, opt.unit, opt.init, key)
            block.appendChild(label)
            addLabelClasses(label, key)
        }

        element = createElement(key)

        addElementClasses(element, key)
        addBlockClasses(block, key)

        block.appendChild(element)

        if (label) {
            // Make the label value a some of usable input
            let labelValue = label.querySelector(".fsjs-label-value")
            if (opt.label && labelValue) {
                // Select all on focus
                labelValue.addEventListener("focus", function (e) {
                    window.getSelection().selectAllChildren( e.currentTarget );
                })

                // Limit typing input to apply only when within min max
                labelValue.addEventListener("keyup", function (e) {
                    let val = parseFloat(e.currentTarget.innerText);
                    if (val > opt.min && val < opt.max) {
                        setValue(key, val)
                    }
                    
                })

                // On blur clamp value to winthin min max
                labelValue.addEventListener("blur", function (e) {
                    let val = parseFloat(e.currentTarget.innerText)
                    setValue(key, Math.max(opt.min, Math.min(opt.max, val)))
                })
            }
        }

        return block
    }

    /**
     * Create the actual UI element for a key
     * 
     * @param {string} key 
     */
    function createElement(key) {
        var element

        if (isAxisKey(key)) {
            element = uifactory.slider(key, options.config[key])
        } else {
            element = uifactory[ui[key]](key, options.config[key])
        }
        addElementClasses(element, key)

        return element
    }

    /**
     * Make sure a UI wrapper block has the classes and attributes
     * expected
     * 
     * @param {node} block 
     * @param {string} key 
     */
    function addBlockClasses(block, key) {
        var type = ui[key]
        if (isAxisKey(key)) {
            type = "slider"
        }
        var classes = [
            options.classes.blockClass,
            options.classes.blockClass + "-" + key,
            options.classes.blockClass + "-type-" + type
        ]
        if (isAxisKey(key)) {
            classes.push(options.classes.blockClassAxis)
        }

        if (key in options.config && "classes" in options.config[key]) {
            classes.push(options.config[key].classes)
        }

        dom.nodeAddClasses(block, classes)
        block.dataset.fsjsBlock = key
    }

    /**
     * Make sure a UI element has the classes and attributes expected
     * 
     * @param {node} element 
     * @param {string} key 
     */
    function addElementClasses(element, key) {
        try {
            var type = ""
            if (isAxisKey(key)) {
                type = "slider"
            } else {
                type = ui[key]
            }
            element = uifactory[type](key, options.config[key], element)

            dom.nodeAddClass(element, options.classes.elementClass)

            element.dataset.fsjs = key
            element.dataset.fsjsUi = type
        } catch (e) {
            console.warn("Failed in addElementClasses()", element, key, e)
        }
    }

    /**
     * If a UI element has a label, make sure it conforms to the DOM structure
     * and attributes expected of it
     * 
     * @param {node} label 
     * @param {string} key 
     */
    function addLabelClasses(label, key) {
        var text = label.querySelector("." + options.classes.labelTextClass),
            value = label.querySelector("." + options.classes.labelValueClass),
            unit = label.querySelector("." + options.classes.labelUnitClass),
            element = getElement(key)

        if (dom.isNode(text) && text.textContent === "") {
            text.textContent = options.config[key].label
        }

        if (dom.isNode(value) && ["slider"].indexOf(ui[key]) === -1) {
            value.textContent = ""
        }

        if (dom.isNode(value) && value && value.textContent === "") {
            // If set in already set in DOM the above validate will have set it
            value.textContent = element.value
        }

        if (dom.isNode(unit) && unit && unit.textContent === "") {
            // If set in already set in DOM the above validate will have set it
            unit.textContent = element.dataset.unit
        }

        dom.nodeAddClass(label, options.classes.labelClass)
        label.dataset.fsjsFor = key
    }

    /**
     * Init a UI element with values (update DOM to options)
     * 
     * @param {node} node 
     * @param {object} opt 
     * @return boolean
     */
    function initBlock(key) {
        // TODO set values if passed in and different on node
        var block = getBlock(key),
            element = getElement(key, block),
            type = ui[key],
            opt = options.config[key]

        if (!block) {
            return
        }

        if (type === "slider" || isAxisKey(key)) {
            setValue(key, opt.init)
            element.addEventListener("change", onSlide)
        } else if (type === "dropdown") {
            element.addEventListener("change", onChange)
            setValue(key, opt.init)
        } else if (type === "buttongroup") {
            var buttons = element.querySelectorAll("[data-choice]")

            if (buttons.length > 0) {
                for (var b = 0; b < buttons.length; b++) {
                    buttons[b].addEventListener("click", onClick)
                    if (buttons[b].dataset.choice === options.config[key].init) {
                        dom.nodeAddClass(buttons[b], options.classes.buttonSelectedClass)
                    } else {
                        dom.nodeRemoveClass(buttons[b], options.classes.buttonSelectedClass)
                    }
                }
            }
            setValue(key, options.config[key].init)
        } else if (type === "checkboxes") {
            // currently only opentype feature checkboxes
            var checkboxes = element.querySelectorAll("[data-feature]")
            if (checkboxes.length > 0) {
                var features = {}
                for (var c = 0; c < checkboxes.length; c++) {
                    var checkbox = checkboxes[c]
                    checkbox.addEventListener("change", onCheck)
                    if ("features" in checkbox.dataset) {
                        features[checkbox.dataset.features] = checkbox.checked ? "1" : "0"
                    }
                }
                setInputOpentype(features)
            }
        }

        return true
    }

    /**
     * Checks if a variable font axis value is on any of the defined
     * axes
     * 
     * @param {string} axis 
     * @param {mixed} value 
     */
    // function isValidAxisAndValue(axis, value) {
    //     // if (!Array.isArray(options.config.variation.axes)) {
    //     //     return false
    //     // }
    //     if (isAxisKey(axis)) {
    //         return false
    //     }

    //     var axes = getAxisKeys()

    //     for (var a = 0; a < axes.length; a++) {
    //         var axisoptions = axes[a]

    //         if (axisoptions.tag !== axis) {
    //             continue
    //         }
    //         if (parseFloat(value) < parseFloat(axisoptions.min) || parseFloat(value) > parseFloat(axisoptions.max)) {
    //             return false
    //         } else {
    //             return true
    //         }
    //     }

    //     return false
    // }

    function isAxisKey(key) {
        return Object.keys(options.config).indexOf(key) !== -1 && String(key).length === 4
    }

    function getAxisKeys() {
        // Get all config keys which are not present in defaults and look like
        // axis keys (4 letter)
        var defaultKeys = Object.keys(defaults.config),
            allKeys = Object.keys(options.config),
            axisKeys = []

        for (var i = 0; i < allKeys.length; i++) {
            var key = allKeys[i]
            if (defaultKeys.indexOf(key) === -1 && isAxisKey(key)) {
                axisKeys.push(key)
            }
        }

        return axisKeys
    }

    function getDefaultVariations() {
        var variations = false
        if ("ui" in options && "variation" in options.config && "axes" in options.config.variation) {
            variations = {}
            for (var i in options.config.variation.axes) {
                var o = options.config.variation.axes[i]
                variations[o.tag] = o.init
            }
            return variations
        } else {

            return {}
        }
    }

    function getElement(key, node) {
        if (typeof (node) === "undefined" || key in ui === false) {
            node = root
        }
        var element = root.querySelector("[data-fsjs='" + key + "']")

        return dom.isNode(element) ? element : false
    }

    function getBlock(key, node) {
        if (typeof (node) === "undefined" || key in ui === false) {
            node = root
        }
        var block = root.querySelector("[data-fsjs-block='" + key + "']")

        return dom.isNode(block) ? block : false
    }

    /**
     * Internal event listeners reacting to different UI element’s events
     * and passing them on to trigger the appropriate changes
     */
    function onChange(e) {
        setValue(e.target.dataset.fsjs, e.target.value)
    }

    function onSlide(e) {
        try {
            setValue(e.target.dataset.fsjs)
        } catch (e) {
            console.warn("Could not set slider value:", e)
        }
    }

    function onCheck() {
        // Currently this is only used for opentype checkboxes
        sendEvent(events.opentypeChanged)
    }

    /**
     * Currently only reacting to buttongroup nested buttons’ clicks
     * @param {*} e 
     */
    function onClick(e) {
        var parent = e.currentTarget.parentNode,
            property = parent.dataset.fsjs,
            buttons = parent.querySelectorAll("[data-choice]")

        if (property in ui && ui[property] === "buttongroup") {
            for (var b = 0; b < buttons.length; b++) {
                dom.nodeRemoveClass(buttons[b], options.classes.buttonSelectedClass)
            }
            dom.nodeAddClass(e.currentTarget, options.classes.buttonSelectedClass)
            setValue(property, e.currentTarget.dataset.choice)
        }
    }

    function sendEvent(type, opt) {
        if (typeof (opt) === "undefined") {
            var opt = {}
        }
        opt.fontsampler = fs
        root.dispatchEvent(new CustomEvent(type, { detail: opt }))
    }

    function sendNativeEvent(type, node) {
        console.debug("sendNativeEvent", type, node)
        if (!type || !node) {
            console.error("Fontsampler.ui.sendNativeEvent: type or node not defined", type, node)
            return
        }
        // TODO maybe have fallback for deprecated Event.init way of sending
        // native browser events?
        node.dispatchEvent(new Event(type))
    }

    function onKey(event) {
        if (event.type === "keypress") {
            // for keypress events immediately block pressing enter for line break
            if (event.keyCode === 13) {
                event.preventDefault()
                return false;
            }
        } else {
            // allow other events, filter any html with $.text() and replace linebreaks
            // TODO fix paste event from setting the caret to the front of the non-input non-textarea
            var text = blocks.tester.textContent,
                hasLinebreaks = text.indexOf("\n")

            if (-1 !== hasLinebreaks) {
                blocks.tester.innerHTML(text.replace('/\n/gi', ''));
                selection.setCaret(blocks.tester, blocks.tester.textContent.length, 0);
            }
        }
    }

    /**
     * Get a UI element value
     * @param {*} property 
     */
    function getValue(key) {
        var element = getElement(key)

        if (element) {
            return element.value
        } else {
            return false
        }
    }

    /**
     * Get a UI element value with CSS unit
     * @param {*} key 
     */
    function getCssValue(key) {
        var element = getElement(key)

        return element ? element.value + element.dataset.unit : ""
    }

    function getOpentype() {
        if (!blocks.opentype) {
            return false
        }

        var features = blocks.opentype.querySelectorAll("[data-feature]")

        if (features) {
            var re = {}

            for (var f = 0; f < features.length; f++) {
                var input = features[f]
                re[input.dataset.feature] = input.checked
            }

            return re
        }
    }

    /**
     * Return the current variation settings as object
     * 
     * If Axis is passed, only that axis’ numerical value is returned
     * @param {*} axis 
     */
    function getVariation(axis) {

        var axes = getAxisKeys(),
            input,
            va = {};

        if (axes) {
            for (var v = 0; v < axes.length; v++) {
                input = getElement(axes[v])
                if (!input) {
                    console.warn("No axis element found for:", axes[v])
                } else {
                    va[input.dataset.fsjs] = input.value
                }
            }
        }

        if (typeof (axis) === "string" && axis in va) {
            return va[axis]
        }

        return va
    }

    function getButtongroupValue(key) {
        var element = getElement(key),
            selected

        if (element) {
            selected = element.querySelector("." + options.classes.buttonSelectedClass)
        }

        if (selected) {
            return selected.dataset.choice
        } else {
            return ""
        }
    }

    function getCssAttrForKey(key) {
        if (key in keyToCss) {
            return keyToCss[key]
        }

        return false
    }

    function getKeyForCssAttr(attr) {
        for (var key in keyToCss) {
            if (keyToCss.hasOwnProperty(key)) {
                if (keyToCss[key] === attr) {
                    return key
                }
            }
        }

        return false
    }

    function _updateSlider(key, value) {
        var element = getElement(key)
        if (parseFloat(element.value) !== parseFloat(value)) {
            element.value = value
            sendNativeEvent("change", element)
        }
    }

    function setValue(key, value) {
        console.debug("Fontsampler.ui.setValue()", key, value)
        var element = getElement(key),
            has_ui = Object.keys(blocks).indexOf(key) !== -1;

        switch (key) {
            case "fontsize":
            case "lineheight":
            case "letterspacing":
                if (typeof (value) === "undefined") {
                    // no value means get and use the element value
                    value = getValue(key)
                } else {
                    // if a value was passed in check if it is within bounds,
                    // valid and if the slider needs an update (via native event)
                    value = utils.clamp(value, options.config[key].min,
                        options.config[key].max, options.config[key].init)

                }

                if (parseFloat(element.value) !== parseFloat(value) &&
                    has_ui) {
                    // Trigger native input element change only if this is an
                    // config value that has a UI rendered
                    sendNativeEvent("change", element)
                }

                if (has_ui) {
                    // Trigger UI change only if this is an
                    // config value that has a UI rendered
                    _updateSlider(key, value)
                    setLabelValue(key, value)
                }

                setInputCss(keyToCss[key], value + options.config[key].unit)
                break;

            case "opentype":
                setInputOpentype(value)
                break;

            case "language":
                setInputAttr("lang", value)
                break;

            case "fontfamily":
                // Trigger an event that will start the loading process in the
                // Fontsampler instance
                sendEvent(events.fontChanged, { font: value })
                break;

            case "alignment":
                setInputCss(keyToCss[key], value)
                break;

            case "direction":
                setInputAttr("dir", value)
                break;

            case "tester":
                break;

            default:
                if (isAxisKey(key)) {
                    var updateVariation = {}

                    // onSlide triggers an update of just the axis without
                    // value to propagate Skin interaction, so on "first" call
                    // this should use the init value, if existing, otherwise
                    // simply "set" the current value of the axis slider
                    if (typeof (value) === "undefined") {
                        value = element.value
                    }

                    if (typeof (value) !== "object") {
                        updateVariation[key] = value
                    }

                    for (var axis in updateVariation) {
                        if (updateVariation.hasOwnProperty(axis)) {
                            val = setVariation(key, updateVariation[axis],
                                has_ui)
                        }
                    }
                }
                break;
        }
        var obj = {}
        obj[key] = value
        sendEvent(events.valueChanged, obj)
    }

    /**
     * Update a single variation axis and UI
     */
    function setVariation(axis, val, has_ui) {
        console.debug("Fontsampler.ui.setVariation()", axis, val)
        var v = getVariation(),
            opt = null,
            has_ui = typeof (has_ui) === "undefined" ? true : !!has_ui;

        if (isAxisKey(axis)) {
            // TODO refactor to: getAxisOptions() and also use
            // it on axis setup / options parsing
            opt = getAxisOptions(axis)
            v[axis] = utils.clamp(val, opt.min, opt.max)

            if (has_ui) {
                _updateSlider(axis, v[axis])
                setLabelValue(axis, v[axis])
            }
            setInputVariation(v)

            return v[axis]
        }
    }

    function getAxisOptions(axis) {
        opt = options.config[axis]
        if (!opt || typeof (opt) === "undefined") {
            opt = {
                min: 100,
                max: 900
            }
        }

        if (typeof (opt.min) === "undefined") {
            opt.min = 100
        }
        if (typeof (opt.max) === "undefined") {
            opt.max = 900
        }
        return opt
    }

    // /**
    //  * Bulk update several variations from object
    //  * 
    //  * @param object vals with variation:value pairs 
    //  */
    // function setVariations(vals) {
    //     if (typeof(vals) !== "object") {
    //         return false
    //     }

    //     for (var axis in vals) {
    //         if (vals.hasOwnProperty(axis)) {
    //             setVariation(axis, vals[axis])
    //         }
    //     }
    // }

    function fontIsInstance(variation, fontname) {
        if (typeof (variation) !== "object") {
            return false
        }

        for (var v in variation) {
            // for now just ignore values that are not a number, don't throw an error
            if (!isNaN(parseInt(variation[v]))) {
                variation[v] = variation[v].toString()
            }
        }

        for (var i = 0; i < fonts.length; i++) {
            var f = fonts[i]

            if ("instance" in f === false) {
                continue
            }

            try {
                var parts = f.instance.split(","),
                    vars = {}
                for (var k = 0; k < parts.length; k++) {
                    var p = parts[k].trim().split(" ")
                    vars[p[0]] = p[1].toString()
                }

                // check if all variation keys and values match
                if (Object.keys(variation).length !== Object.keys(vars).length) {
                    continue
                }

                // elegant compare equal for objects, if equal return font
                if (JSON.stringify(vars) === JSON.stringify(variation) &&
                    fontname === f.name) {
                    return f
                }
            } catch (e) {
                continue
            }
        }

        return false
    }

    /**
     * Set the tester’s text
     * @param {*} attr 
     * @param {*} val 
     */
    function setInputCss(attr, val) {
        input.style[attr] = val
    }

    function setInputAttr(attr, val) {
        input.setAttribute(attr, val)
    }

    function setInputOpentype(features) {
        var parsed = [],
            val
        for (var key in features) {
            if (features.hasOwnProperty(key) && key && typeof (key) !== "undefined") {
                parsed.push('"' + key + '" ' + (features[key] ? "1" : "0"))
            }
        }
        val = parsed.join(",")

        input.style["font-feature-settings"] = val
    }

    function setInputVariation(variations) {
        var parsed = []
        for (var key in variations) {
            if (variations.hasOwnProperty(key) && key && typeof (key) !== "undefined") {
                parsed.push('"' + key + '" ' + (variations[key]))
            }
        }
        val = parsed.join(",")

        input.style["font-variation-settings"] = val

        // Update fontfamily select if it exists
        // When a variable font is updated check if the selected values
        // match a defined instance, and if set it active in the font family
        if (dom.isNode(blocks.fontfamily)) {
            var fontname = getElement("fontfamily", blocks.fontfamily).value
            var instanceFont = fontIsInstance(variations, fontname)
            if (instanceFont === false) {
                dom.nodeAddClass(blocks.fontfamily, options.classes.disabledClass)
            } else {
                dom.nodeRemoveClass(blocks.fontfamily, options.classes.disabledClass)
                var element = getElement("fontfamily"),
                    option

                if (element.value !== instanceFont.name) {
                    option = element.querySelector("option[value='" + instanceFont.name + "']")
                    if (dom.isNode(option)) {
                        option.selected = true
                    }
                    element.value = instanceFont.name
                }
            }
        }
    }

    function setActiveFont(name) {
        if (dom.isNode(blocks.fontfamily)) {
            var element = getElement("fontfamily", blocks.fontfamily),
                option

            dom.nodeRemoveClass(blocks.fontfamily, options.classes.disabledClass)

            if (dom.isNode(element)) {
                // Only update if it is not the selected fontfamily value
                if (element.value !== name) {
                    option = element.querySelectorAll("option[value='" + name + "']")
                    if (dom.isNode(option)) {
                        option.selected = true
                    }
                    element.value = name
                    sendNativeEvent("change", element)
                }
            }
        }
    }

    function setActiveAxes(axes) {
        if (dom.isNode(blocks.variation)) {
            var sliders = blocks.variation.querySelectorAll("[data-axis]")

            if (sliders) {
                for (var s = 0; s < sliders.length; s++) {
                    if (!Array.isArray(axes) || axes.length < 1 ||
                        axes.indexOf(sliders[s].dataset.axis) === -1 ||
                        supports.woff2 === false ||
                        supports.variableFonts === false
                    ) {
                        dom.nodeAddClass(sliders[s].parentNode, options.classes.disabledClass)
                    } else {
                        dom.nodeRemoveClass(sliders[s].parentNode, options.classes.disabledClass)
                    }
                }
            }
        }
    }

    function setActiveLanguage(lang) {
        if (dom.isNode(blocks.language) && typeof (lang) === "string") {
            var languageChoices = options.config.language.choices.map(function (value) {
                return value.split("|")[0]
            })

            if (languageChoices.length !== -1) {
                var option = blocks.language.querySelector("option[value='" + lang + "']")

                if (dom.isNode(option)) {
                    // Trigger the change on the native input
                    blocks.language.value = lang
                    option.selected = true
                    sendNativeEvent("change", blocks.language)

                    sendEvent(events.languageChanged)
                }
            }
        }
    }

    function setActiveOpentype(features) {
        var checkboxes = false

        if (dom.isNode(blocks.opentype)) {
            checkboxes = blocks.opentype.querySelectorAll("[data-feature]")
        }
        if (checkboxes) {
            for (var c = 0; c < checkboxes.length; c++) {
                if (Array.isArray(features)) {
                    if (features.indexOf(checkboxes[c].dataset.feature) === -1) {
                        dom.nodeAddClass(checkboxes[c].parentNode, "fsjs-checkbox-inactive")
                    } else {
                        dom.nodeRemoveClass(checkboxes[c].parentNode, "fsjs-checkbox-inactive")
                    }
                } else {
                    dom.nodeRemoveClass(checkboxes[c].parentNode, "fsjs-checkbox-inactive")
                }
            }
        }
    }

    function setInputText(text) {
        if (text && input) {
            input.innerHTML = text
        }
    }

    function setLabelValue(key, value) {
        var labelValue = root.querySelector("[data-fsjs-for='" + key + "'] ." + options.classes.labelValueClass)

        if (labelValue) {
            labelValue.textContent = value
        }
    }

    function setStatusClass(classString, status) {
        if (status === true) {
            dom.nodeAddClass(root, classString)
        } else if (status === false) {
            dom.nodeRemoveClass(root, classString)
        }
    }

    return {
        init: init,
        getValue: getValue,
        setValue: setValue,

        getCssValue: getCssValue,
        getButtongroupValue: getButtongroupValue,
        getOpentype: getOpentype,
        getVariation: getVariation,
        getCssAttrForKey: getCssAttrForKey,
        getKeyForCssAttr: getKeyForCssAttr,
        setInputCss: setInputCss,
        // setInputAttr: setInputAttr,
        setInputOpentype: setInputOpentype,
        // setInputVariation: setInputVariation,
        setInputText: setInputText,

        setStatusClass: setStatusClass,

        setActiveFont: setActiveFont,
        setActiveAxes: setActiveAxes,
        setActiveLanguage: setActiveLanguage,
        setActiveOpentype: setActiveOpentype,
        setLabelValue: setLabelValue,

        isAxisKey: isAxisKey,

        sendEvent: sendEvent,
        sendNativeEvent: sendNativeEvent
    }
}
module.exports = UI
},{"./constants/defaults":3,"./constants/events":5,"./helpers/dom":8,"./helpers/selection":10,"./helpers/supports":11,"./helpers/utils":12,"./uielements":15}],15:[function(_dereq_,module,exports){
var helpers = _dereq_("./helpers/helpers")
var dom = _dereq_("./helpers/dom")

/**
 * Wrapper to provide global root, options and fonts to all methods (UI Elements)
 * 
 * @param {*} root 
 * @param {*} options 
 * @param {*} fonts 
 */
function UIElements(root, options) {

    function label(labelText, labelUnit, labelValue, relatedInput) {
        var label = document.createElement("label"),
            text = document.createElement("span"),
            val, unit

        if (labelText === false) {
            return false
        }

        label.dataset.fsjsFor = relatedInput
        dom.nodeAddClass(label, options.classes.labelClass)

        text.className = options.classes.labelTextClass
        text.appendChild(document.createTextNode(labelText))
        label.appendChild(text)

        if (labelValue !== "") {
            val = document.createElement("span")
            val.className = options.classes.labelValueClass
            val.contentEditable = true
            val.appendChild(document.createTextNode(labelValue))
            label.appendChild(val)

            // Register event propagation for the editable value
            // val.addEventListener("keyup", function () {
            //     console.log("label val keyup", val.innerText)
            //     label.dispatchEvent(new Event("keyup"))
            // })
            // val.addEventListener("blur", function () {
            //     console.log("label val blur", val.innerText)
            //     label.dispatchEvent(new Event("blur"))
            // })
        }

        if (typeof(labelUnit) === "string") {
            unit = document.createElement("span")
            unit.className = options.classes.labelUnitClass
            unit.appendChild(document.createTextNode(labelUnit))
            label.appendChild(unit)
        }

        return label
    }

    function slider(key, opt, node) {
        var input = dom.isNode(node) ? node : document.createElement("input")

        var attributes = {
            type: "range",
            min: opt.min,
            max: opt.max,
            value: opt.init,
            step: opt.step
        }

        input.setAttribute("autocomplete", "off")
        setMissingAttributes(input, attributes)

        if (typeof(input.value) === "undefined") {
            input.value = opt.init
            input.setAttribute("value", opt.init)
        }

        if ("unit" in input.dataset === false) {
            input.dataset.unit = opt.unit
        }
        if ("init" in input.dataset === false) {
            input.dataset.init = opt.init
        }

        // only main element get the data-fsjs; key missing means this is 
        // a nested slider
        if (key) {
            input.dataset.fsjs = key
        }

        return input
    }

    function dropdown(key, opt, node) {
        var dropdown = dom.isNode(node) ? node : document.createElement("select")
        if ("choices" in opt === false || opt.choices.length < 1) {
            return false
        }

        for (var c = 0; c < opt.choices.length; c++) {
            var choice = helpers.parseParts(opt.choices[c]),
                option = dropdown.querySelector("option[value='" + choice.val + "']")

            if (!dom.isNode(option)) {
                option = document.createElement("option")
                option.appendChild(document.createTextNode(choice.text))
                dropdown.appendChild(option)
            }

            option.value = choice.val

            if ("init" in opt && opt.init === choice.text) {
                option.selected = true
                dropdown.value = option.value
            }

            if ("instance" in opt) {
                option.dataset.instance = opt.instance
            }
        }

        dropdown.dataset.fsjs = key

        return dropdown
    }

    function textfield(key, opt, node) {
        var tester = typeof(node) === "undefined" || node === null ? document.createElement("div") : node,
            attr = {
                autocomplete: "off",
                autocorrect: "off",
                autocapitalize: "off",
                spellcheck: "false",
                contenteditable: opt.editable
            }

        setMissingAttributes(tester, attr)

        tester.dataset.fsjs = key

        // If the original root element was a single DOM element with some text, copy that
        // text into the tester
        // TODO move this to interface and on tester node init
        if (!tester.dataset.replaceText) {
            if (options.initialText) {
                tester.appendChild(document.createTextNode(options.initialText))
            } else if (!options.initialText && options.originalText) {
                tester.appendChild(document.createTextNode(options.originalText))
            }
            tester.dataset.replaceText = true
        }

        return tester
    }

    function buttongroup(key, opt) {
        var group = document.createElement("div")

        for (var o in opt.choices) {
            var button = document.createElement("button"),
                choice = helpers.parseParts(opt.choices[o])

            button.dataset.choice = choice.val
            button.appendChild(document.createTextNode(choice.text))
            dom.nodeAddClass(options.classes.buttonClass)
            if (opt.init === choice.val) {
                button.className = options.classes.buttonSelectedClass
            }
            group.appendChild(button)
        }

        group.dataset.fsjs = key

        return group
    }

    function checkboxes(key, opt) {
        var group = document.createElement("div")

        group.dataset.fsjs = key

        for (var o in opt.choices) {
            if (opt.choices.hasOwnProperty(o)) {
                var choice = helpers.parseParts(opt.choices[o]),
                    label = document.createElement("label"),
                    checkbox = document.createElement("input"),
                    text = document.createElement("span")

                checkbox.setAttribute("type", "checkbox")
                checkbox.dataset.feature = choice.val

                if (opt.init.indexOf(Object.values(choice)[0]) !== -1) {
                    checkbox.checked = true
                }

                text.appendChild(document.createTextNode(choice.text))

                label.appendChild(checkbox)
                label.appendChild(text)

                group.append(label)
            }
        }

        return group
    }

    function setMissingAttributes(node, attributes) {
        if (typeof(node) === "undefined" || node === null || typeof(attributes) !== "object") {
            return
        }

        for (var a in attributes) {
            if (attributes.hasOwnProperty(a)) {
                if (!node.hasAttribute(a)) {
                    node.setAttribute(a, attributes[a])
                }
            }
        }
    }

    return {
        dropdown: dropdown,
        slider: slider,
        label: label,
        textfield: textfield,
        buttongroup: buttongroup,
        checkboxes: checkboxes
    }
}

module.exports = UIElements
},{"./helpers/dom":8,"./helpers/helpers":9}]},{},[7])(7)
});

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1])(1)
});
