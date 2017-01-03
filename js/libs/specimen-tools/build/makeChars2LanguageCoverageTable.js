#! /usr/bin/env node


var path = require('path')
 , fs = require('fs')
 , dirName = path.dirname(__filename)
 , cldrMiscPath = dirName + '/cldr-misc-modern/main'
 , charactersFile = 'characters.json'
 , languagesFile = dirName + '/cldr-localenames-modern/main/en/languages.json'
 , languages = JSON.parse(fs.readFileSync(languagesFile)).main.en.localeDisplayNames.languages
 ;



function AssertionError(message) {
    this.message = message;
    this.name = AssertionError;
}
AssertionError.prototype = Object.create(Error);

function assert(val, message) {
    if(val) return;
    throw new AssertionError(message || '(No Message)');
}

function parseCharList(liststr, charSet) {
    if (charSet === undefined)
        charSet = new Set();
    assert(liststr[0] === '[' && liststr[liststr.length-1] === ']',
                        'CharList is expected to be enclosed in brackets.');
    function toChar(item) {
        if(item.length === 1) return [item];
        if(item[0] === '{' && item[item.length-1] === '}')
            // Cluster, these glyphs always appear together in the language,
            // we still need to have all of the chars in the font
            return item.slice(1, -1).split('');
        // opening brackets etc. are escaped using two backslashes, e.g. \\[
        if (item.indexOf('\\\\') === 0)
            return [item.slice(2)];
        if(item.indexOf('-') !== -1 && item.length > 2) {
            // range
            var chars = []
              , range = item.split('')
              , current, end
              ;
            assert(range.length === 3,
                    'A range must consist of 2 chars and a hyphen in the middle.');
            current = range[0];
            end = range[2];
            while(current !== end) {
                chars.push(current);
                current = String.fromCodePoint(current.charCodeAt(current) + 1)
            }
            chars.push(end)
            return chars;
        }
        if (item.indexOf('\\u') === 0)
            return  [String.fromCodePoint(parseInt(item.slice(2), 16))];
        // hope this is legit
        return item.split('');
    }
    liststr.slice(1,-1).split(' ')
                        .map(toChar).reduce(function(prev, value) {
                            for(var i=0,l=value.length;i<l;i++)
                                prev.add(value[i]);
                            return prev;
                        }, charSet);
    // add uppercases!
    for(item of Array.from(charSet))
        charSet.add(item.toUpperCase());
    return charSet;
}

function getCharacters(languageDir){
    var chrFileName = [cldrMiscPath, languageDir, charactersFile].join('/')
      , charactersDataJson = fs.readFileSync(chrFileName)
      , charactersData = JSON.parse(charactersDataJson)
        // hmm the usage of languageDir in here could lead to problems
        // e.g. what if we have  a language-region languageDir here?
      , characters = charactersData.main[languageDir].characters
      , charSet = new Set()
      ;

    parseCharList(characters.exemplarCharacters, charSet);
    parseCharList(characters.punctuation, charSet);
    // we don't include these for language detection
    // charSet = parseCharList(characters.exemplarCharacters);
    return [languageDir, languages[languageDir], Array.from(charSet).join('')];
}

function main() {
    //if (arguments.length === 0) {
    //    console.log('Usage: $' , path.basename(__filename));
    //    console.warn('Missing Arguments:')
    //    process.exit(1)
    //}
    var languageDirs = fs.readdirSync(cldrMiscPath)
                     // remove sublocales, too much resolution for our purpose
                     // also remove the 'root' locale
                     // TODO: is this certainly OK?
                     .filter(name => name.indexOf('-') === -1 && name !== 'root')

      , result = {}
      ;

    languageDirs.map(getCharacters).forEach(function(item) {
                                    this[item[1]] = item[2]; }, result);
    console.log(JSON.stringify(result));
}


if (require.main === module)
    main.apply(null, process.argv.slice(2));
