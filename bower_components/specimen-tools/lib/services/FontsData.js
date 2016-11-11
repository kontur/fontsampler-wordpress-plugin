define([
    'specimenTools/_BaseWidget'
  , '!require/text!specimenTools/services/languageCharSets.json'
], function(
    Parent
  , languageCharSetsJson
) {
    "use strict";
    /*jshint esnext:true*/

    var weight2weightName = {
            250: 'Thin'
          , 275: 'ExtraLight'
          , 300: 'Light'
          , 400: 'Regular'
          , 500: 'Medium'
          , 600: 'SemiBold'
          , 700: 'Bold'
          , 800: 'ExtraBold'
          , 900: 'Black'
        }
      , weight2cssWeight = {
            250: '100'
          , 275: '200'
          , 300: '300'
          , 400: '400'
          , 500: '500'
          , 600: '600'
          , 700: '700'
          , 800: '800'
          , 900: '900'
        }
      ;

    function FontsData(pubsub, options) {
        Parent.call(this, options);
        this._pubSub = pubsub;
        this._pubSub.subscribe('loadFont', this._onLoadFont.bind(this));
        this._data = [];
    }

    var _p = FontsData.prototype = Object.create(Parent.prototype);
    _p.constructor = FontsData;

    FontsData.defaultOptions = {
        // This should be set explicitly to true (or a string containing
        // glyphs that are allowed to miss despite of being required in
        // languageCharSetsJson.
        // The builtin FontsData.DEFAULT_LAX_CHAR_LIST is there for
        // convenience but may cause trouble!
        useLaxDetection: false
    };

    FontsData._cacheDecorator = function (k) {
        return function(fontIndex) {
            /*jshint validthis:true*/
            var args = [], i, l, data, cached;



            for(i=0,l=arguments.length;i<l;i++)
                args[i] = arguments[i];

            data = this._aquireFontData(fontIndex);
            if(!(k in data.cache))
                cached = data.cache[k] = this[k].apply(this, args);
            else
                cached = data.cache[k];
            return cached;
        };
    };

    FontsData._installPublicCachedInterface = function(_p) {
        var k, newk;
        for(k in _p) {
            newk = k.slice(1);
            if(k.indexOf('_get') !== 0
                        || typeof _p[k] !== 'function'
                        // don't override if it is defined
                        || newk in _p)
                continue;
            _p[newk] = FontsData._cacheDecorator(k);
        }
    };

    FontsData._getFeatures = function _getFeatures(features, langSys, featureIndexes) {
        /*jshint validthis:true*/
        var i,l, idx, tag;
        for(i=0,l=featureIndexes.length;i<l;i++) {
            idx = featureIndexes[i];
            tag = features[idx].tag;
            if(!this[tag])
                this[tag] = [];
            this[tag].push(langSys);
        }
    };

    FontsData.getFeatures = function getFeatures(font) {
        // get all gsub features:
        if('gsub' in font.tables) {
            var table = font.tables.gsub
              , scripts = font.tables.gsub.scripts
              , features = {/*tag: ["{script:lang}", {script:lang}]*/}
              , i, l, j, m, script, scriptTag, lang
              ;

            if (scripts) {
                for(i=0,l=scripts.length;i<l;i++) {
                    script = scripts[i].script;
                    scriptTag = scripts[i].tag;
                    if(script.defaultLangSys) {
                        lang = 'Default';
                        FontsData._getFeatures.call(features
                          , table.features
                          , [scriptTag, lang].join(':')
                          , script.defaultLangSys.featureIndexes
                        );
                    }
                    if(script.langSysRecords) {
                        for(j = 0, m = script.langSysRecords.length; j < m; j++) {
                            lang = script.langSysRecords[j].tag;
                            FontsData._getFeatures.call(features
                              , table.features
                              , [scriptTag, lang].join(':')
                              , script.langSysRecords[j].langSys.featureIndexes
                            );
                        }
                    }
                }
            }
            return features;
        }
        // when supported by opentype.js, get all gpos features:
    };

    FontsData.languageCharSets = JSON.parse(languageCharSetsJson);

    FontsData.sortCoverage = function sortCoverage(a, b) {
        if(a[1] === b[1])
            // compare the names of the languages, to sort by alphabetical;
            return a[0].localeCompare(b[0]);
        return b[1] - a[1] ;
    };

    // These are characters that appear in the CLDR data as needed for
    // some languages, but we decided that they are not exactly needed
    // for language support.
    // These are all punctuation characters currently.
    // Don't just trust this list, and if something is terribly wrong
    // for your language, please complain!
    FontsData.DEFAULT_LAX_CHAR_LIST = new Set([
        0x2010 // HYPHEN -> we usually use/include HYPHEN-MINUS: 0x002D
      , 0x2032 // PRIME
      , 0x2033 // DOUBLE PRIME
      , 0x27e8 // MATHEMATICAL LEFT ANGLE BRACKET
      , 0x27e9 // MATHEMATICAL RIGHT ANGLE BRACKET
      , 0x2052 // COMMERCIAL MINUS SIGN
    ]);

    FontsData.getLanguageCoverage = function getLanguageCoverage(font, useLaxDetection) {
        var result = []
          , included, missing, laxSkipped
          , language, chars, charCode, found, i, l, total
          , laxCharList
          ;

        if(typeof useLaxDetection === 'string') {
            laxCharList = new Set();
            for(i=0,l=useLaxDetection.length;i<l;i++)
                laxCharList.add(useLaxDetection.codePointAt(i));
        }
        else
            laxCharList = FontsData.DEFAULT_LAX_CHAR_LIST;

        for(language in FontsData.languageCharSets) {
            // chars is a string
            chars = FontsData.languageCharSets[language];
            found = 0;
            total = l = chars.length;
            included = [];
            missing = [];
            laxSkipped = [];
            for(i=0;i<l;i++) {
                charCode = chars.codePointAt(i);
                if(charCode in font.encoding.cmap.glyphIndexMap) {
                    found += 1;
                    included.push(charCode);
                }
                else if(useLaxDetection && laxCharList.has(charCode)) {
                    total = total-1;
                    laxSkipped.push(charCode);
                }
                else
                    missing.push(charCode);
            }
            result.push([language, found/total, found, total, missing, included, laxSkipped]);
        }

        result.sort(FontsData.sortCoverage);
        return result;
    };

    _p._aquireFontData = function(fontIndex) {
        var data = this._data[fontIndex];
        if(!data)
            throw new Error('FontIndex "'+fontIndex+'" is not available.');
        return data;
    };

    _p._onLoadFont = function(fontIndex, fontFileName, font, originalArraybuffer) {
        this._data[fontIndex] = {
            font: font
          , fileName: fontFileName
          , originalArraybuffer: originalArraybuffer
          , cache: Object.create(null)
        };
    };

    _p._getLanguageCoverage = function(fontIndex) {
        return FontsData.getLanguageCoverage(this._data[fontIndex].font, this._options.useLaxDetection);
    };

    _p._getSupportedLanguages = function(fontIndex) {
        var coverage = this.getLanguageCoverage(fontIndex)
          , i, l
          , result = [], language, support
          ;
        for(i=0,l=coverage.length;i<l;i++) {
            language = coverage[i][0];
            support = coverage[i][1];
            if(support === 1)
                result.push(language);
        }
        result.sort();
        return result;
    };

    _p._getNumberGlyphs = function(fontIndex) {
        return this._data[fontIndex].font.glyphNames.names.length;
    };

    _p._getFeatures = function(fontIndex) {
        return FontsData.getFeatures(this._data[fontIndex].font);
    };

    _p._getFamilyName  = function(fontIndex) {
        var font = this._data[fontIndex].font
          , fontFamily
          ;

        fontFamily = font.names.postScriptName.en
                        || Object.values(font.names.postScriptName)[0]
                        || font.names.fontFamily
                        ;
        fontFamily = fontFamily.split('-')[0];
        return fontFamily;
    };

    _p._getOS2FontWeight = function(fontIndex) {
        var font = this._data[fontIndex].font;
        return font.tables.os2.usWeightClass;
    };

    // Keeping this, maybe we'll have to transform this name further for CSS?
    _p._getCSSFamilyName = _p._getFamilyName;

    _p._getIsItalic = function(fontIndex) {
        var font = this._data[fontIndex].font;
        return !!(font.tables.os2.fsSelection & font.fsSelectionValues.ITALIC);
    };

    // no need to cache these: No underscore will prevent
    //_installPublicCachedInterface from doing anything.
    _p.getNumberSupportedLanguages = function(fontIndex) {
        return this.getSupportedLanguages(fontIndex).length;
    };

    _p.getFont = function(fontIndex) {
        return this._aquireFontData(fontIndex).font;
    };

    _p.getFileName = function(fontIndex) {
        return this._aquireFontData(fontIndex).fileName;
    };

    _p.getOriginalArraybuffer = function(fontIndex) {
        return this._aquireFontData(fontIndex).originalArraybuffer;
    };

    _p.getCSSWeight = function(fontIndex) {
        return weight2cssWeight[this.getOS2FontWeight(fontIndex)];
    };

    _p.getWeightName = function(fontIndex) {
        return weight2weightName[this.getOS2FontWeight(fontIndex)];
    };

    _p.getCSSStyle = function(fontIndex) {
        return this.getIsItalic(fontIndex) ? 'italic' : 'normal';
    };

    _p.getPostScriptName = function(fontIndex) {
        return this._aquireFontData(fontIndex).font.names.postScriptName;
    }

    FontsData._installPublicCachedInterface(_p);
    return FontsData;
});
