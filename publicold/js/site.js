(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module unless amdModuleId is set
    define([], function () {
      return (root['Autolinker'] = factory());
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    root['Autolinker'] = factory();
  }
}(this, function () {

/*!
 * Autolinker.js
 * 0.17.1
 *
 * Copyright(c) 2015 Gregory Jacobs <greg@greg-jacobs.com>
 * MIT Licensed. http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/gregjacobs/Autolinker.js
 */
/**
 * @class Autolinker
 * @extends Object
 *
 * Utility class used to process a given string of text, and wrap the matches in
 * the appropriate anchor (&lt;a&gt;) tags to turn them into links.
 *
 * Any of the configuration options may be provided in an Object (map) provided
 * to the Autolinker constructor, which will configure how the {@link #link link()}
 * method will process the links.
 *
 * For example:
 *
 *     var autolinker = new Autolinker( {
 *         newWindow : false,
 *         truncate  : 30
 *     } );
 *
 *     var html = autolinker.link( "Joe went to www.yahoo.com" );
 *     // produces: 'Joe went to <a href="http://www.yahoo.com">yahoo.com</a>'
 *
 *
 * The {@link #static-link static link()} method may also be used to inline options into a single call, which may
 * be more convenient for one-off uses. For example:
 *
 *     var html = Autolinker.link( "Joe went to www.yahoo.com", {
 *         newWindow : false,
 *         truncate  : 30
 *     } );
 *     // produces: 'Joe went to <a href="http://www.yahoo.com">yahoo.com</a>'
 *
 *
 * ## Custom Replacements of Links
 *
 * If the configuration options do not provide enough flexibility, a {@link #replaceFn}
 * may be provided to fully customize the output of Autolinker. This function is
 * called once for each URL/Email/Phone#/Twitter Handle/Hashtag match that is
 * encountered.
 *
 * For example:
 *
 *     var input = "...";  // string with URLs, Email Addresses, Phone #s, Twitter Handles, and Hashtags
 *
 *     var linkedText = Autolinker.link( input, {
 *         replaceFn : function( autolinker, match ) {
 *             console.log( "href = ", match.getAnchorHref() );
 *             console.log( "text = ", match.getAnchorText() );
 *
 *             switch( match.getType() ) {
 *                 case 'url' :
 *                     console.log( "url: ", match.getUrl() );
 *
 *                     if( match.getUrl().indexOf( 'mysite.com' ) === -1 ) {
 *                         var tag = autolinker.getTagBuilder().build( match );  // returns an `Autolinker.HtmlTag` instance, which provides mutator methods for easy changes
 *                         tag.setAttr( 'rel', 'nofollow' );
 *                         tag.addClass( 'external-link' );
 *
 *                         return tag;
 *
 *                     } else {
 *                         return true;  // let Autolinker perform its normal anchor tag replacement
 *                     }
 *
 *                 case 'email' :
 *                     var email = match.getEmail();
 *                     console.log( "email: ", email );
 *
 *                     if( email === "my@own.address" ) {
 *                         return false;  // don't auto-link this particular email address; leave as-is
 *                     } else {
 *                         return;  // no return value will have Autolinker perform its normal anchor tag replacement (same as returning `true`)
 *                     }
 *
 *                 case 'phone' :
 *                     var phoneNumber = match.getPhoneNumber();
 *                     console.log( phoneNumber );
 *
 *                     return '<a href="http://newplace.to.link.phone.numbers.to/">' + phoneNumber + '</a>';
 *
 *                 case 'twitter' :
 *                     var twitterHandle = match.getTwitterHandle();
 *                     console.log( twitterHandle );
 *
 *                     return '<a href="http://newplace.to.link.twitter.handles.to/">' + twitterHandle + '</a>';
 *
 *                 case 'hashtag' :
 *                     var hashtag = match.getHashtag();
 *                     console.log( hashtag );
 *
 *                     return '<a href="http://newplace.to.link.hashtag.handles.to/">' + hashtag + '</a>';
 *             }
 *         }
 *     } );
 *
 *
 * The function may return the following values:
 *
 * - `true` (Boolean): Allow Autolinker to replace the match as it normally would.
 * - `false` (Boolean): Do not replace the current match at all - leave as-is.
 * - Any String: If a string is returned from the function, the string will be used directly as the replacement HTML for
 *   the match.
 * - An {@link Autolinker.HtmlTag} instance, which can be used to build/modify an HTML tag before writing out its HTML text.
 *
 * @constructor
 * @param {Object} [config] The configuration options for the Autolinker instance, specified in an Object (map).
 */
var Autolinker = function( cfg ) {
	Autolinker.Util.assign( this, cfg );  // assign the properties of `cfg` onto the Autolinker instance. Prototype properties will be used for missing configs.

	// Validate the value of the `hashtag` cfg.
	var hashtag = this.hashtag;
	if( hashtag !== false && hashtag !== 'twitter' && hashtag !== 'facebook' ) {
		throw new Error( "invalid `hashtag` cfg - see docs" );
	}
};

Autolinker.prototype = {
	constructor : Autolinker,  // fix constructor property

	/**
	 * @cfg {Boolean} urls
	 *
	 * `true` if miscellaneous URLs should be automatically linked, `false` if they should not be.
	 */
	urls : true,

	/**
	 * @cfg {Boolean} email
	 *
	 * `true` if email addresses should be automatically linked, `false` if they should not be.
	 */
	email : true,

	/**
	 * @cfg {Boolean} twitter
	 *
	 * `true` if Twitter handles ("@example") should be automatically linked, `false` if they should not be.
	 */
	twitter : true,

	/**
	 * @cfg {Boolean} phone
	 *
	 * `true` if Phone numbers ("(555)555-5555") should be automatically linked, `false` if they should not be.
	 */
	phone: true,

	/**
	 * @cfg {Boolean/String} hashtag
	 *
	 * A string for the service name to have hashtags (ex: "#myHashtag")
	 * auto-linked to. The currently-supported values are:
	 *
	 * - 'twitter'
	 * - 'facebook'
	 *
	 * Pass `false` to skip auto-linking of hashtags.
	 */
	hashtag : false,

	/**
	 * @cfg {Boolean} newWindow
	 *
	 * `true` if the links should open in a new window, `false` otherwise.
	 */
	newWindow : true,

	/**
	 * @cfg {Boolean} stripPrefix
	 *
	 * `true` if 'http://' or 'https://' and/or the 'www.' should be stripped
	 * from the beginning of URL links' text, `false` otherwise.
	 */
	stripPrefix : true,

	/**
	 * @cfg {Number} truncate
	 *
	 * A number for how many characters long matched text should be truncated to inside the text of
	 * a link. If the matched text is over this number of characters, it will be truncated to this length by
	 * adding a two period ellipsis ('..') to the end of the string.
	 *
	 * For example: A url like 'http://www.yahoo.com/some/long/path/to/a/file' truncated to 25 characters might look
	 * something like this: 'yahoo.com/some/long/pat..'
	 */
	truncate : undefined,

	/**
	 * @cfg {String} className
	 *
	 * A CSS class name to add to the generated links. This class will be added to all links, as well as this class
	 * plus match suffixes for styling url/email/phone/twitter/hashtag links differently.
	 *
	 * For example, if this config is provided as "myLink", then:
	 *
	 * - URL links will have the CSS classes: "myLink myLink-url"
	 * - Email links will have the CSS classes: "myLink myLink-email", and
	 * - Twitter links will have the CSS classes: "myLink myLink-twitter"
	 * - Phone links will have the CSS classes: "myLink myLink-phone"
	 * - Hashtag links will have the CSS classes: "myLink myLink-hashtag"
	 */
	className : "",

	/**
	 * @cfg {Function} replaceFn
	 *
	 * A function to individually process each match found in the input string.
	 *
	 * See the class's description for usage.
	 *
	 * This function is called with the following parameters:
	 *
	 * @cfg {Autolinker} replaceFn.autolinker The Autolinker instance, which may be used to retrieve child objects from (such
	 *   as the instance's {@link #getTagBuilder tag builder}).
	 * @cfg {Autolinker.match.Match} replaceFn.match The Match instance which can be used to retrieve information about the
	 *   match that the `replaceFn` is currently processing. See {@link Autolinker.match.Match} subclasses for details.
	 */


	/**
	 * @private
	 * @property {Autolinker.htmlParser.HtmlParser} htmlParser
	 *
	 * The HtmlParser instance used to skip over HTML tags, while finding text nodes to process. This is lazily instantiated
	 * in the {@link #getHtmlParser} method.
	 */
	htmlParser : undefined,

	/**
	 * @private
	 * @property {Autolinker.matchParser.MatchParser} matchParser
	 *
	 * The MatchParser instance used to find matches in the text nodes of an input string passed to
	 * {@link #link}. This is lazily instantiated in the {@link #getMatchParser} method.
	 */
	matchParser : undefined,

	/**
	 * @private
	 * @property {Autolinker.AnchorTagBuilder} tagBuilder
	 *
	 * The AnchorTagBuilder instance used to build match replacement anchor tags. Note: this is lazily instantiated
	 * in the {@link #getTagBuilder} method.
	 */
	tagBuilder : undefined,

	/**
	 * Automatically links URLs, Email addresses, Phone numbers, Twitter
	 * handles, and Hashtags found in the given chunk of HTML. Does not link
	 * URLs found within HTML tags.
	 *
	 * For instance, if given the text: `You should go to http://www.yahoo.com`,
	 * then the result will be `You should go to
	 * &lt;a href="http://www.yahoo.com"&gt;http://www.yahoo.com&lt;/a&gt;`
	 *
	 * This method finds the text around any HTML elements in the input
	 * `textOrHtml`, which will be the text that is processed. Any original HTML
	 * elements will be left as-is, as well as the text that is already wrapped
	 * in anchor (&lt;a&gt;) tags.
	 *
	 * @param {String} textOrHtml The HTML or text to autolink matches within
	 *   (depending on if the {@link #urls}, {@link #email}, {@link #phone},
	 *   {@link #twitter}, and {@link #hashtag} options are enabled).
	 * @return {String} The HTML, with matches automatically linked.
	 */
	link : function( textOrHtml ) {
		var htmlParser = this.getHtmlParser(),
		    htmlNodes = htmlParser.parse( textOrHtml ),
		    anchorTagStackCount = 0,  // used to only process text around anchor tags, and any inner text/html they may have
		    resultHtml = [];

		for( var i = 0, len = htmlNodes.length; i < len; i++ ) {
			var node = htmlNodes[ i ],
			    nodeType = node.getType(),
			    nodeText = node.getText();

			if( nodeType === 'element' ) {
				// Process HTML nodes in the input `textOrHtml`
				if( node.getTagName() === 'a' ) {
					if( !node.isClosing() ) {  // it's the start <a> tag
						anchorTagStackCount++;
					} else {   // it's the end </a> tag
						anchorTagStackCount = Math.max( anchorTagStackCount - 1, 0 );  // attempt to handle extraneous </a> tags by making sure the stack count never goes below 0
					}
				}
				resultHtml.push( nodeText );  // now add the text of the tag itself verbatim

			} else if( nodeType === 'entity' || nodeType === 'comment' ) {
				resultHtml.push( nodeText );  // append HTML entity nodes (such as '&nbsp;') or HTML comments (such as '<!-- Comment -->') verbatim

			} else {
				// Process text nodes in the input `textOrHtml`
				if( anchorTagStackCount === 0 ) {
					// If we're not within an <a> tag, process the text node to linkify
					var linkifiedStr = this.linkifyStr( nodeText );
					resultHtml.push( linkifiedStr );

				} else {
					// `text` is within an <a> tag, simply append the text - we do not want to autolink anything
					// already within an <a>...</a> tag
					resultHtml.push( nodeText );
				}
			}
		}

		return resultHtml.join( "" );
	},

	/**
	 * Process the text that lies in between HTML tags, performing the anchor
	 * tag replacements for the matches, and returns the string with the
	 * replacements made.
	 *
	 * This method does the actual wrapping of matches with anchor tags.
	 *
	 * @private
	 * @param {String} str The string of text to auto-link.
	 * @return {String} The text with anchor tags auto-filled.
	 */
	linkifyStr : function( str ) {
		return this.getMatchParser().replace( str, this.createMatchReturnVal, this );
	},


	/**
	 * Creates the return string value for a given match in the input string,
	 * for the {@link #linkifyStr} method.
	 *
	 * This method handles the {@link #replaceFn}, if one was provided.
	 *
	 * @private
	 * @param {Autolinker.match.Match} match The Match object that represents the match.
	 * @return {String} The string that the `match` should be replaced with. This is usually the anchor tag string, but
	 *   may be the `matchStr` itself if the match is not to be replaced.
	 */
	createMatchReturnVal : function( match ) {
		// Handle a custom `replaceFn` being provided
		var replaceFnResult;
		if( this.replaceFn ) {
			replaceFnResult = this.replaceFn.call( this, this, match );  // Autolinker instance is the context, and the first arg
		}

		if( typeof replaceFnResult === 'string' ) {
			return replaceFnResult;  // `replaceFn` returned a string, use that

		} else if( replaceFnResult === false ) {
			return match.getMatchedText();  // no replacement for the match

		} else if( replaceFnResult instanceof Autolinker.HtmlTag ) {
			return replaceFnResult.toAnchorString();

		} else {  // replaceFnResult === true, or no/unknown return value from function
			// Perform Autolinker's default anchor tag generation
			var tagBuilder = this.getTagBuilder(),
			    anchorTag = tagBuilder.build( match );  // returns an Autolinker.HtmlTag instance

			return anchorTag.toAnchorString();
		}
	},


	/**
	 * Lazily instantiates and returns the {@link #htmlParser} instance for this Autolinker instance.
	 *
	 * @protected
	 * @return {Autolinker.htmlParser.HtmlParser}
	 */
	getHtmlParser : function() {
		var htmlParser = this.htmlParser;

		if( !htmlParser ) {
			htmlParser = this.htmlParser = new Autolinker.htmlParser.HtmlParser();
		}

		return htmlParser;
	},


	/**
	 * Lazily instantiates and returns the {@link #matchParser} instance for this Autolinker instance.
	 *
	 * @protected
	 * @return {Autolinker.matchParser.MatchParser}
	 */
	getMatchParser : function() {
		var matchParser = this.matchParser;

		if( !matchParser ) {
			matchParser = this.matchParser = new Autolinker.matchParser.MatchParser( {
				urls        : this.urls,
				email       : this.email,
				twitter     : this.twitter,
				phone       : this.phone,
				hashtag     : this.hashtag,
				stripPrefix : this.stripPrefix
			} );
		}

		return matchParser;
	},


	/**
	 * Returns the {@link #tagBuilder} instance for this Autolinker instance, lazily instantiating it
	 * if it does not yet exist.
	 *
	 * This method may be used in a {@link #replaceFn} to generate the {@link Autolinker.HtmlTag HtmlTag} instance that
	 * Autolinker would normally generate, and then allow for modifications before returning it. For example:
	 *
	 *     var html = Autolinker.link( "Test google.com", {
	 *         replaceFn : function( autolinker, match ) {
	 *             var tag = autolinker.getTagBuilder().build( match );  // returns an {@link Autolinker.HtmlTag} instance
	 *             tag.setAttr( 'rel', 'nofollow' );
	 *
	 *             return tag;
	 *         }
	 *     } );
	 *
	 *     // generated html:
	 *     //   Test <a href="http://google.com" target="_blank" rel="nofollow">google.com</a>
	 *
	 * @return {Autolinker.AnchorTagBuilder}
	 */
	getTagBuilder : function() {
		var tagBuilder = this.tagBuilder;

		if( !tagBuilder ) {
			tagBuilder = this.tagBuilder = new Autolinker.AnchorTagBuilder( {
				newWindow   : this.newWindow,
				truncate    : this.truncate,
				className   : this.className
			} );
		}

		return tagBuilder;
	}

};


/**
 * Automatically links URLs, Email addresses, Phone Numbers, Twitter handles,
 * and Hashtags found in the given chunk of HTML. Does not link URLs found
 * within HTML tags.
 *
 * For instance, if given the text: `You should go to http://www.yahoo.com`,
 * then the result will be `You should go to &lt;a href="http://www.yahoo.com"&gt;http://www.yahoo.com&lt;/a&gt;`
 *
 * Example:
 *
 *     var linkedText = Autolinker.link( "Go to google.com", { newWindow: false } );
 *     // Produces: "Go to <a href="http://google.com">google.com</a>"
 *
 * @static
 * @param {String} textOrHtml The HTML or text to find matches within (depending
 *   on if the {@link #urls}, {@link #email}, {@link #phone}, {@link #twitter},
 *   and {@link #hashtag} options are enabled).
 * @param {Object} [options] Any of the configuration options for the Autolinker
 *   class, specified in an Object (map). See the class description for an
 *   example call.
 * @return {String} The HTML text, with matches automatically linked.
 */
Autolinker.link = function( textOrHtml, options ) {
	var autolinker = new Autolinker( options );
	return autolinker.link( textOrHtml );
};


// Autolinker Namespaces
Autolinker.match = {};
Autolinker.htmlParser = {};
Autolinker.matchParser = {};

/*global Autolinker */
/*jshint eqnull:true, boss:true */
/**
 * @class Autolinker.Util
 * @singleton
 *
 * A few utility methods for Autolinker.
 */
Autolinker.Util = {

	/**
	 * @property {Function} abstractMethod
	 *
	 * A function object which represents an abstract method.
	 */
	abstractMethod : function() { throw "abstract"; },


	/**
	 * @private
	 * @property {RegExp} trimRegex
	 *
	 * The regular expression used to trim the leading and trailing whitespace
	 * from a string.
	 */
	trimRegex : /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,


	/**
	 * Assigns (shallow copies) the properties of `src` onto `dest`.
	 *
	 * @param {Object} dest The destination object.
	 * @param {Object} src The source object.
	 * @return {Object} The destination object (`dest`)
	 */
	assign : function( dest, src ) {
		for( var prop in src ) {
			if( src.hasOwnProperty( prop ) ) {
				dest[ prop ] = src[ prop ];
			}
		}

		return dest;
	},


	/**
	 * Extends `superclass` to create a new subclass, adding the `protoProps` to the new subclass's prototype.
	 *
	 * @param {Function} superclass The constructor function for the superclass.
	 * @param {Object} protoProps The methods/properties to add to the subclass's prototype. This may contain the
	 *   special property `constructor`, which will be used as the new subclass's constructor function.
	 * @return {Function} The new subclass function.
	 */
	extend : function( superclass, protoProps ) {
		var superclassProto = superclass.prototype;

		var F = function() {};
		F.prototype = superclassProto;

		var subclass;
		if( protoProps.hasOwnProperty( 'constructor' ) ) {
			subclass = protoProps.constructor;
		} else {
			subclass = function() { superclassProto.constructor.apply( this, arguments ); };
		}

		var subclassProto = subclass.prototype = new F();  // set up prototype chain
		subclassProto.constructor = subclass;  // fix constructor property
		subclassProto.superclass = superclassProto;

		delete protoProps.constructor;  // don't re-assign constructor property to the prototype, since a new function may have been created (`subclass`), which is now already there
		Autolinker.Util.assign( subclassProto, protoProps );

		return subclass;
	},


	/**
	 * Truncates the `str` at `len - ellipsisChars.length`, and adds the `ellipsisChars` to the
	 * end of the string (by default, two periods: '..'). If the `str` length does not exceed
	 * `len`, the string will be returned unchanged.
	 *
	 * @param {String} str The string to truncate and add an ellipsis to.
	 * @param {Number} truncateLen The length to truncate the string at.
	 * @param {String} [ellipsisChars=..] The ellipsis character(s) to add to the end of `str`
	 *   when truncated. Defaults to '..'
	 */
	ellipsis : function( str, truncateLen, ellipsisChars ) {
		if( str.length > truncateLen ) {
			ellipsisChars = ( ellipsisChars == null ) ? '..' : ellipsisChars;
			str = str.substring( 0, truncateLen - ellipsisChars.length ) + ellipsisChars;
		}
		return str;
	},


	/**
	 * Supports `Array.prototype.indexOf()` functionality for old IE (IE8 and below).
	 *
	 * @param {Array} arr The array to find an element of.
	 * @param {*} element The element to find in the array, and return the index of.
	 * @return {Number} The index of the `element`, or -1 if it was not found.
	 */
	indexOf : function( arr, element ) {
		if( Array.prototype.indexOf ) {
			return arr.indexOf( element );

		} else {
			for( var i = 0, len = arr.length; i < len; i++ ) {
				if( arr[ i ] === element ) return i;
			}
			return -1;
		}
	},



	/**
	 * Performs the functionality of what modern browsers do when `String.prototype.split()` is called
	 * with a regular expression that contains capturing parenthesis.
	 *
	 * For example:
	 *
	 *     // Modern browsers:
	 *     "a,b,c".split( /(,)/ );  // --> [ 'a', ',', 'b', ',', 'c' ]
	 *
	 *     // Old IE (including IE8):
	 *     "a,b,c".split( /(,)/ );  // --> [ 'a', 'b', 'c' ]
	 *
	 * This method emulates the functionality of modern browsers for the old IE case.
	 *
	 * @param {String} str The string to split.
	 * @param {RegExp} splitRegex The regular expression to split the input `str` on. The splitting
	 *   character(s) will be spliced into the array, as in the "modern browsers" example in the
	 *   description of this method.
	 *   Note #1: the supplied regular expression **must** have the 'g' flag specified.
	 *   Note #2: for simplicity's sake, the regular expression does not need
	 *   to contain capturing parenthesis - it will be assumed that any match has them.
	 * @return {String[]} The split array of strings, with the splitting character(s) included.
	 */
	splitAndCapture : function( str, splitRegex ) {
		if( !splitRegex.global ) throw new Error( "`splitRegex` must have the 'g' flag set" );

		var result = [],
		    lastIdx = 0,
		    match;

		while( match = splitRegex.exec( str ) ) {
			result.push( str.substring( lastIdx, match.index ) );
			result.push( match[ 0 ] );  // push the splitting char(s)

			lastIdx = match.index + match[ 0 ].length;
		}
		result.push( str.substring( lastIdx ) );

		return result;
	},


	/**
	 * Trims the leading and trailing whitespace from a string.
	 *
	 * @param {String} str The string to trim.
	 * @return {String}
	 */
	trim : function( str ) {
		return str.replace( this.trimRegex, '' );
	}

};
/*global Autolinker */
/*jshint boss:true */
/**
 * @class Autolinker.HtmlTag
 * @extends Object
 *
 * Represents an HTML tag, which can be used to easily build/modify HTML tags programmatically.
 *
 * Autolinker uses this abstraction to create HTML tags, and then write them out as strings. You may also use
 * this class in your code, especially within a {@link Autolinker#replaceFn replaceFn}.
 *
 * ## Examples
 *
 * Example instantiation:
 *
 *     var tag = new Autolinker.HtmlTag( {
 *         tagName : 'a',
 *         attrs   : { 'href': 'http://google.com', 'class': 'external-link' },
 *         innerHtml : 'Google'
 *     } );
 *
 *     tag.toAnchorString();  // <a href="http://google.com" class="external-link">Google</a>
 *
 *     // Individual accessor methods
 *     tag.getTagName();                 // 'a'
 *     tag.getAttr( 'href' );            // 'http://google.com'
 *     tag.hasClass( 'external-link' );  // true
 *
 *
 * Using mutator methods (which may be used in combination with instantiation config properties):
 *
 *     var tag = new Autolinker.HtmlTag();
 *     tag.setTagName( 'a' );
 *     tag.setAttr( 'href', 'http://google.com' );
 *     tag.addClass( 'external-link' );
 *     tag.setInnerHtml( 'Google' );
 *
 *     tag.getTagName();                 // 'a'
 *     tag.getAttr( 'href' );            // 'http://google.com'
 *     tag.hasClass( 'external-link' );  // true
 *
 *     tag.toAnchorString();  // <a href="http://google.com" class="external-link">Google</a>
 *
 *
 * ## Example use within a {@link Autolinker#replaceFn replaceFn}
 *
 *     var html = Autolinker.link( "Test google.com", {
 *         replaceFn : function( autolinker, match ) {
 *             var tag = autolinker.getTagBuilder().build( match );  // returns an {@link Autolinker.HtmlTag} instance, configured with the Match's href and anchor text
 *             tag.setAttr( 'rel', 'nofollow' );
 *
 *             return tag;
 *         }
 *     } );
 *
 *     // generated html:
 *     //   Test <a href="http://google.com" target="_blank" rel="nofollow">google.com</a>
 *
 *
 * ## Example use with a new tag for the replacement
 *
 *     var html = Autolinker.link( "Test google.com", {
 *         replaceFn : function( autolinker, match ) {
 *             var tag = new Autolinker.HtmlTag( {
 *                 tagName : 'button',
 *                 attrs   : { 'title': 'Load URL: ' + match.getAnchorHref() },
 *                 innerHtml : 'Load URL: ' + match.getAnchorText()
 *             } );
 *
 *             return tag;
 *         }
 *     } );
 *
 *     // generated html:
 *     //   Test <button title="Load URL: http://google.com">Load URL: google.com</button>
 */
Autolinker.HtmlTag = Autolinker.Util.extend( Object, {

	/**
	 * @cfg {String} tagName
	 *
	 * The tag name. Ex: 'a', 'button', etc.
	 *
	 * Not required at instantiation time, but should be set using {@link #setTagName} before {@link #toAnchorString}
	 * is executed.
	 */

	/**
	 * @cfg {Object.<String, String>} attrs
	 *
	 * An key/value Object (map) of attributes to create the tag with. The keys are the attribute names, and the
	 * values are the attribute values.
	 */

	/**
	 * @cfg {String} innerHtml
	 *
	 * The inner HTML for the tag.
	 *
	 * Note the camel case name on `innerHtml`. Acronyms are camelCased in this utility (such as not to run into the acronym
	 * naming inconsistency that the DOM developers created with `XMLHttpRequest`). You may alternatively use {@link #innerHTML}
	 * if you prefer, but this one is recommended.
	 */

	/**
	 * @cfg {String} innerHTML
	 *
	 * Alias of {@link #innerHtml}, accepted for consistency with the browser DOM api, but prefer the camelCased version
	 * for acronym names.
	 */


	/**
	 * @protected
	 * @property {RegExp} whitespaceRegex
	 *
	 * Regular expression used to match whitespace in a string of CSS classes.
	 */
	whitespaceRegex : /\s+/,


	/**
	 * @constructor
	 * @param {Object} [cfg] The configuration properties for this class, in an Object (map)
	 */
	constructor : function( cfg ) {
		Autolinker.Util.assign( this, cfg );

		this.innerHtml = this.innerHtml || this.innerHTML;  // accept either the camelCased form or the fully capitalized acronym
	},


	/**
	 * Sets the tag name that will be used to generate the tag with.
	 *
	 * @param {String} tagName
	 * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
	 */
	setTagName : function( tagName ) {
		this.tagName = tagName;
		return this;
	},


	/**
	 * Retrieves the tag name.
	 *
	 * @return {String}
	 */
	getTagName : function() {
		return this.tagName || "";
	},


	/**
	 * Sets an attribute on the HtmlTag.
	 *
	 * @param {String} attrName The attribute name to set.
	 * @param {String} attrValue The attribute value to set.
	 * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
	 */
	setAttr : function( attrName, attrValue ) {
		var tagAttrs = this.getAttrs();
		tagAttrs[ attrName ] = attrValue;

		return this;
	},


	/**
	 * Retrieves an attribute from the HtmlTag. If the attribute does not exist, returns `undefined`.
	 *
	 * @param {String} name The attribute name to retrieve.
	 * @return {String} The attribute's value, or `undefined` if it does not exist on the HtmlTag.
	 */
	getAttr : function( attrName ) {
		return this.getAttrs()[ attrName ];
	},


	/**
	 * Sets one or more attributes on the HtmlTag.
	 *
	 * @param {Object.<String, String>} attrs A key/value Object (map) of the attributes to set.
	 * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
	 */
	setAttrs : function( attrs ) {
		var tagAttrs = this.getAttrs();
		Autolinker.Util.assign( tagAttrs, attrs );

		return this;
	},


	/**
	 * Retrieves the attributes Object (map) for the HtmlTag.
	 *
	 * @return {Object.<String, String>} A key/value object of the attributes for the HtmlTag.
	 */
	getAttrs : function() {
		return this.attrs || ( this.attrs = {} );
	},


	/**
	 * Sets the provided `cssClass`, overwriting any current CSS classes on the HtmlTag.
	 *
	 * @param {String} cssClass One or more space-separated CSS classes to set (overwrite).
	 * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
	 */
	setClass : function( cssClass ) {
		return this.setAttr( 'class', cssClass );
	},


	/**
	 * Convenience method to add one or more CSS classes to the HtmlTag. Will not add duplicate CSS classes.
	 *
	 * @param {String} cssClass One or more space-separated CSS classes to add.
	 * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
	 */
	addClass : function( cssClass ) {
		var classAttr = this.getClass(),
		    whitespaceRegex = this.whitespaceRegex,
		    indexOf = Autolinker.Util.indexOf,  // to support IE8 and below
		    classes = ( !classAttr ) ? [] : classAttr.split( whitespaceRegex ),
		    newClasses = cssClass.split( whitespaceRegex ),
		    newClass;

		while( newClass = newClasses.shift() ) {
			if( indexOf( classes, newClass ) === -1 ) {
				classes.push( newClass );
			}
		}

		this.getAttrs()[ 'class' ] = classes.join( " " );
		return this;
	},


	/**
	 * Convenience method to remove one or more CSS classes from the HtmlTag.
	 *
	 * @param {String} cssClass One or more space-separated CSS classes to remove.
	 * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
	 */
	removeClass : function( cssClass ) {
		var classAttr = this.getClass(),
		    whitespaceRegex = this.whitespaceRegex,
		    indexOf = Autolinker.Util.indexOf,  // to support IE8 and below
		    classes = ( !classAttr ) ? [] : classAttr.split( whitespaceRegex ),
		    removeClasses = cssClass.split( whitespaceRegex ),
		    removeClass;

		while( classes.length && ( removeClass = removeClasses.shift() ) ) {
			var idx = indexOf( classes, removeClass );
			if( idx !== -1 ) {
				classes.splice( idx, 1 );
			}
		}

		this.getAttrs()[ 'class' ] = classes.join( " " );
		return this;
	},


	/**
	 * Convenience method to retrieve the CSS class(es) for the HtmlTag, which will each be separated by spaces when
	 * there are multiple.
	 *
	 * @return {String}
	 */
	getClass : function() {
		return this.getAttrs()[ 'class' ] || "";
	},


	/**
	 * Convenience method to check if the tag has a CSS class or not.
	 *
	 * @param {String} cssClass The CSS class to check for.
	 * @return {Boolean} `true` if the HtmlTag has the CSS class, `false` otherwise.
	 */
	hasClass : function( cssClass ) {
		return ( ' ' + this.getClass() + ' ' ).indexOf( ' ' + cssClass + ' ' ) !== -1;
	},


	/**
	 * Sets the inner HTML for the tag.
	 *
	 * @param {String} html The inner HTML to set.
	 * @return {Autolinker.HtmlTag} This HtmlTag instance, so that method calls may be chained.
	 */
	setInnerHtml : function( html ) {
		this.innerHtml = html;

		return this;
	},


	/**
	 * Retrieves the inner HTML for the tag.
	 *
	 * @return {String}
	 */
	getInnerHtml : function() {
		return this.innerHtml || "";
	},


	/**
	 * Override of superclass method used to generate the HTML string for the tag.
	 *
	 * @return {String}
	 */
	toAnchorString : function() {
		var tagName = this.getTagName(),
		    attrsStr = this.buildAttrsStr();

		attrsStr = ( attrsStr ) ? ' ' + attrsStr : '';  // prepend a space if there are actually attributes

		return [ '<', tagName, attrsStr, '>', this.getInnerHtml(), '</', tagName, '>' ].join( "" );
	},


	/**
	 * Support method for {@link #toAnchorString}, returns the string space-separated key="value" pairs, used to populate
	 * the stringified HtmlTag.
	 *
	 * @protected
	 * @return {String} Example return: `attr1="value1" attr2="value2"`
	 */
	buildAttrsStr : function() {
		if( !this.attrs ) return "";  // no `attrs` Object (map) has been set, return empty string

		var attrs = this.getAttrs(),
		    attrsArr = [];

		for( var prop in attrs ) {
			if( attrs.hasOwnProperty( prop ) ) {
				attrsArr.push( prop + '="' + attrs[ prop ] + '"' );
			}
		}
		return attrsArr.join( " " );
	}

} );

/*global Autolinker */
/*jshint sub:true */
/**
 * @protected
 * @class Autolinker.AnchorTagBuilder
 * @extends Object
 *
 * Builds anchor (&lt;a&gt;) tags for the Autolinker utility when a match is found.
 *
 * Normally this class is instantiated, configured, and used internally by an {@link Autolinker} instance, but may
 * actually be retrieved in a {@link Autolinker#replaceFn replaceFn} to create {@link Autolinker.HtmlTag HtmlTag} instances
 * which may be modified before returning from the {@link Autolinker#replaceFn replaceFn}. For example:
 *
 *     var html = Autolinker.link( "Test google.com", {
 *         replaceFn : function( autolinker, match ) {
 *             var tag = autolinker.getTagBuilder().build( match );  // returns an {@link Autolinker.HtmlTag} instance
 *             tag.setAttr( 'rel', 'nofollow' );
 *
 *             return tag;
 *         }
 *     } );
 *
 *     // generated html:
 *     //   Test <a href="http://google.com" target="_blank" rel="nofollow">google.com</a>
 */
Autolinker.AnchorTagBuilder = Autolinker.Util.extend( Object, {

	/**
	 * @cfg {Boolean} newWindow
	 * @inheritdoc Autolinker#newWindow
	 */

	/**
	 * @cfg {Number} truncate
	 * @inheritdoc Autolinker#truncate
	 */

	/**
	 * @cfg {String} className
	 * @inheritdoc Autolinker#className
	 */


	/**
	 * @constructor
	 * @param {Object} [cfg] The configuration options for the AnchorTagBuilder instance, specified in an Object (map).
	 */
	constructor : function( cfg ) {
		Autolinker.Util.assign( this, cfg );
	},


	/**
	 * Generates the actual anchor (&lt;a&gt;) tag to use in place of the
	 * matched text, via its `match` object.
	 *
	 * @param {Autolinker.match.Match} match The Match instance to generate an
	 *   anchor tag from.
	 * @return {Autolinker.HtmlTag} The HtmlTag instance for the anchor tag.
	 */
	build : function( match ) {
		var tag = new Autolinker.HtmlTag( {
			tagName   : 'a',
			attrs     : this.createAttrs( match.getType(), match.getAnchorHref() ),
			innerHtml : this.processAnchorText( match.getAnchorText() )
		} );

		return tag;
	},


	/**
	 * Creates the Object (map) of the HTML attributes for the anchor (&lt;a&gt;)
	 *   tag being generated.
	 *
	 * @protected
	 * @param {"url"/"email"/"phone"/"twitter"/"hashtag"} matchType The type of
	 *   match that an anchor tag is being generated for.
	 * @param {String} href The href for the anchor tag.
	 * @return {Object} A key/value Object (map) of the anchor tag's attributes.
	 */
	createAttrs : function( matchType, anchorHref ) {
		var attrs = {
			'href' : anchorHref  // we'll always have the `href` attribute
		};

		var cssClass = this.createCssClass( matchType );
		if( cssClass ) {
			attrs[ 'class' ] = cssClass;
		}
		if( this.newWindow ) {
			attrs[ 'target' ] = "_blank";
		}

		return attrs;
	},


	/**
	 * Creates the CSS class that will be used for a given anchor tag, based on
	 * the `matchType` and the {@link #className} config.
	 *
	 * @private
	 * @param {"url"/"email"/"phone"/"twitter"/"hashtag"} matchType The type of
	 *   match that an anchor tag is being generated for.
	 * @return {String} The CSS class string for the link. Example return:
	 *   "myLink myLink-url". If no {@link #className} was configured, returns
	 *   an empty string.
	 */
	createCssClass : function( matchType ) {
		var className = this.className;

		if( !className )
			return "";
		else
			return className + " " + className + "-" + matchType;  // ex: "myLink myLink-url", "myLink myLink-email", "myLink myLink-phone", "myLink myLink-twitter", or "myLink myLink-hashtag"
	},


	/**
	 * Processes the `anchorText` by truncating the text according to the
	 * {@link #truncate} config.
	 *
	 * @private
	 * @param {String} anchorText The anchor tag's text (i.e. what will be
	 *   displayed).
	 * @return {String} The processed `anchorText`.
	 */
	processAnchorText : function( anchorText ) {
		anchorText = this.doTruncate( anchorText );

		return anchorText;
	},


	/**
	 * Performs the truncation of the `anchorText`, if the `anchorText` is
	 * longer than the {@link #truncate} option. Truncates the text to 2
	 * characters fewer than the {@link #truncate} option, and adds ".." to the
	 * end.
	 *
	 * @private
	 * @param {String} text The anchor tag's text (i.e. what will be displayed).
	 * @return {String} The truncated anchor text.
	 */
	doTruncate : function( anchorText ) {
		return Autolinker.Util.ellipsis( anchorText, this.truncate || Number.POSITIVE_INFINITY );
	}

} );
/*global Autolinker */
/**
 * @private
 * @class Autolinker.htmlParser.HtmlParser
 * @extends Object
 *
 * An HTML parser implementation which simply walks an HTML string and returns an array of
 * {@link Autolinker.htmlParser.HtmlNode HtmlNodes} that represent the basic HTML structure of the input string.
 *
 * Autolinker uses this to only link URLs/emails/Twitter handles within text nodes, effectively ignoring / "walking
 * around" HTML tags.
 */
Autolinker.htmlParser.HtmlParser = Autolinker.Util.extend( Object, {

	/**
	 * @private
	 * @property {RegExp} htmlRegex
	 *
	 * The regular expression used to pull out HTML tags from a string. Handles namespaced HTML tags and
	 * attribute names, as specified by http://www.w3.org/TR/html-markup/syntax.html.
	 *
	 * Capturing groups:
	 *
	 * 1. The "!DOCTYPE" tag name, if a tag is a &lt;!DOCTYPE&gt; tag.
	 * 2. If it is an end tag, this group will have the '/'.
	 * 3. If it is a comment tag, this group will hold the comment text (i.e.
	 *    the text inside the `&lt;!--` and `--&gt;`.
	 * 4. The tag name for all tags (other than the &lt;!DOCTYPE&gt; tag)
	 */
	htmlRegex : (function() {
		var commentTagRegex = /!--([\s\S]+?)--/,
		    tagNameRegex = /[0-9a-zA-Z][0-9a-zA-Z:]*/,
		    attrNameRegex = /[^\s\0"'>\/=\x01-\x1F\x7F]+/,   // the unicode range accounts for excluding control chars, and the delete char
		    attrValueRegex = /(?:"[^"]*?"|'[^']*?'|[^'"=<>`\s]+)/, // double quoted, single quoted, or unquoted attribute values
		    nameEqualsValueRegex = attrNameRegex.source + '(?:\\s*=\\s*' + attrValueRegex.source + ')?';  // optional '=[value]'

		return new RegExp( [
			// for <!DOCTYPE> tag. Ex: <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">)
			'(?:',
				'<(!DOCTYPE)',  // *** Capturing Group 1 - If it's a doctype tag

					// Zero or more attributes following the tag name
					'(?:',
						'\\s+',  // one or more whitespace chars before an attribute

						// Either:
						// A. attr="value", or
						// B. "value" alone (To cover example doctype tag: <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">)
						'(?:', nameEqualsValueRegex, '|', attrValueRegex.source + ')',
					')*',
				'>',
			')',

			'|',

			// All other HTML tags (i.e. tags that are not <!DOCTYPE>)
			'(?:',
				'<(/)?',  // Beginning of a tag or comment. Either '<' for a start tag, or '</' for an end tag.
				          // *** Capturing Group 2: The slash or an empty string. Slash ('/') for end tag, empty string for start or self-closing tag.

					'(?:',
						commentTagRegex.source,  // *** Capturing Group 3 - A Comment Tag's Text

						'|',

						'(?:',

							// *** Capturing Group 4 - The tag name
							'(' + tagNameRegex.source + ')',

							// Zero or more attributes following the tag name
							'(?:',
								'\\s+',                // one or more whitespace chars before an attribute
								nameEqualsValueRegex,  // attr="value" (with optional ="value" part)
							')*',

							'\\s*/?',  // any trailing spaces and optional '/' before the closing '>'

						')',
					')',
				'>',
			')'
		].join( "" ), 'gi' );
	} )(),

	/**
	 * @private
	 * @property {RegExp} htmlCharacterEntitiesRegex
	 *
	 * The regular expression that matches common HTML character entities.
	 *
	 * Ignoring &amp; as it could be part of a query string -- handling it separately.
	 */
	htmlCharacterEntitiesRegex: /(&nbsp;|&#160;|&lt;|&#60;|&gt;|&#62;|&quot;|&#34;|&#39;)/gi,


	/**
	 * Parses an HTML string and returns a simple array of {@link Autolinker.htmlParser.HtmlNode HtmlNodes}
	 * to represent the HTML structure of the input string.
	 *
	 * @param {String} html The HTML to parse.
	 * @return {Autolinker.htmlParser.HtmlNode[]}
	 */
	parse : function( html ) {
		var htmlRegex = this.htmlRegex,
		    currentResult,
		    lastIndex = 0,
		    textAndEntityNodes,
		    nodes = [];  // will be the result of the method

		while( ( currentResult = htmlRegex.exec( html ) ) !== null ) {
			var tagText = currentResult[ 0 ],
			    commentText = currentResult[ 3 ], // if we've matched a comment
			    tagName = currentResult[ 1 ] || currentResult[ 4 ],  // The <!DOCTYPE> tag (ex: "!DOCTYPE"), or another tag (ex: "a" or "img")
			    isClosingTag = !!currentResult[ 2 ],
			    inBetweenTagsText = html.substring( lastIndex, currentResult.index );

			// Push TextNodes and EntityNodes for any text found between tags
			if( inBetweenTagsText ) {
				textAndEntityNodes = this.parseTextAndEntityNodes( inBetweenTagsText );
				nodes.push.apply( nodes, textAndEntityNodes );
			}

			// Push the CommentNode or ElementNode
			if( commentText ) {
				nodes.push( this.createCommentNode( tagText, commentText ) );
			} else {
				nodes.push( this.createElementNode( tagText, tagName, isClosingTag ) );
			}

			lastIndex = currentResult.index + tagText.length;
		}

		// Process any remaining text after the last HTML element. Will process all of the text if there were no HTML elements.
		if( lastIndex < html.length ) {
			var text = html.substring( lastIndex );

			// Push TextNodes and EntityNodes for any text found between tags
			if( text ) {
				textAndEntityNodes = this.parseTextAndEntityNodes( text );
				nodes.push.apply( nodes, textAndEntityNodes );
			}
		}

		return nodes;
	},


	/**
	 * Parses text and HTML entity nodes from a given string. The input string
	 * should not have any HTML tags (elements) within it.
	 *
	 * @private
	 * @param {String} text The text to parse.
	 * @return {Autolinker.htmlParser.HtmlNode[]} An array of HtmlNodes to
	 *   represent the {@link Autolinker.htmlParser.TextNode TextNodes} and
	 *   {@link Autolinker.htmlParser.EntityNode EntityNodes} found.
	 */
	parseTextAndEntityNodes : function( text ) {
		var nodes = [],
		    textAndEntityTokens = Autolinker.Util.splitAndCapture( text, this.htmlCharacterEntitiesRegex );  // split at HTML entities, but include the HTML entities in the results array

		// Every even numbered token is a TextNode, and every odd numbered token is an EntityNode
		// For example: an input `text` of "Test &quot;this&quot; today" would turn into the
		//   `textAndEntityTokens`: [ 'Test ', '&quot;', 'this', '&quot;', ' today' ]
		for( var i = 0, len = textAndEntityTokens.length; i < len; i += 2 ) {
			var textToken = textAndEntityTokens[ i ],
			    entityToken = textAndEntityTokens[ i + 1 ];

			if( textToken ) nodes.push( this.createTextNode( textToken ) );
			if( entityToken ) nodes.push( this.createEntityNode( entityToken ) );
		}
		return nodes;
	},


	/**
	 * Factory method to create an {@link Autolinker.htmlParser.CommentNode CommentNode}.
	 *
	 * @private
	 * @param {String} tagText The full text of the tag (comment) that was
	 *   matched, including its &lt;!-- and --&gt;.
	 * @param {String} comment The full text of the comment that was matched.
	 */
	createCommentNode : function( tagText, commentText ) {
		return new Autolinker.htmlParser.CommentNode( {
			text: tagText,
			comment: Autolinker.Util.trim( commentText )
		} );
	},


	/**
	 * Factory method to create an {@link Autolinker.htmlParser.ElementNode ElementNode}.
	 *
	 * @private
	 * @param {String} tagText The full text of the tag (element) that was
	 *   matched, including its attributes.
	 * @param {String} tagName The name of the tag. Ex: An &lt;img&gt; tag would
	 *   be passed to this method as "img".
	 * @param {Boolean} isClosingTag `true` if it's a closing tag, false
	 *   otherwise.
	 * @return {Autolinker.htmlParser.ElementNode}
	 */
	createElementNode : function( tagText, tagName, isClosingTag ) {
		return new Autolinker.htmlParser.ElementNode( {
			text    : tagText,
			tagName : tagName.toLowerCase(),
			closing : isClosingTag
		} );
	},


	/**
	 * Factory method to create a {@link Autolinker.htmlParser.EntityNode EntityNode}.
	 *
	 * @private
	 * @param {String} text The text that was matched for the HTML entity (such
	 *   as '&amp;nbsp;').
	 * @return {Autolinker.htmlParser.EntityNode}
	 */
	createEntityNode : function( text ) {
		return new Autolinker.htmlParser.EntityNode( { text: text } );
	},


	/**
	 * Factory method to create a {@link Autolinker.htmlParser.TextNode TextNode}.
	 *
	 * @private
	 * @param {String} text The text that was matched.
	 * @return {Autolinker.htmlParser.TextNode}
	 */
	createTextNode : function( text ) {
		return new Autolinker.htmlParser.TextNode( { text: text } );
	}

} );
/*global Autolinker */
/**
 * @abstract
 * @class Autolinker.htmlParser.HtmlNode
 * 
 * Represents an HTML node found in an input string. An HTML node is one of the following:
 * 
 * 1. An {@link Autolinker.htmlParser.ElementNode ElementNode}, which represents HTML tags.
 * 2. A {@link Autolinker.htmlParser.TextNode TextNode}, which represents text outside or within HTML tags.
 * 3. A {@link Autolinker.htmlParser.EntityNode EntityNode}, which represents one of the known HTML
 *    entities that Autolinker looks for. This includes common ones such as &amp;quot; and &amp;nbsp;
 */
Autolinker.htmlParser.HtmlNode = Autolinker.Util.extend( Object, {
	
	/**
	 * @cfg {String} text (required)
	 * 
	 * The original text that was matched for the HtmlNode. 
	 * 
	 * - In the case of an {@link Autolinker.htmlParser.ElementNode ElementNode}, this will be the tag's
	 *   text.
	 * - In the case of a {@link Autolinker.htmlParser.TextNode TextNode}, this will be the text itself.
	 * - In the case of a {@link Autolinker.htmlParser.EntityNode EntityNode}, this will be the text of
	 *   the HTML entity.
	 */
	text : "",
	
	
	/**
	 * @constructor
	 * @param {Object} cfg The configuration properties for the Match instance, specified in an Object (map).
	 */
	constructor : function( cfg ) {
		Autolinker.Util.assign( this, cfg );
	},

	
	/**
	 * Returns a string name for the type of node that this class represents.
	 * 
	 * @abstract
	 * @return {String}
	 */
	getType : Autolinker.Util.abstractMethod,
	
	
	/**
	 * Retrieves the {@link #text} for the HtmlNode.
	 * 
	 * @return {String}
	 */
	getText : function() {
		return this.text;
	}

} );
/*global Autolinker */
/**
 * @class Autolinker.htmlParser.CommentNode
 * @extends Autolinker.htmlParser.HtmlNode
 *
 * Represents an HTML comment node that has been parsed by the
 * {@link Autolinker.htmlParser.HtmlParser}.
 *
 * See this class's superclass ({@link Autolinker.htmlParser.HtmlNode}) for more
 * details.
 */
Autolinker.htmlParser.CommentNode = Autolinker.Util.extend( Autolinker.htmlParser.HtmlNode, {

	/**
	 * @cfg {String} comment (required)
	 *
	 * The text inside the comment tag. This text is stripped of any leading or
	 * trailing whitespace.
	 */
	comment : '',


	/**
	 * Returns a string name for the type of node that this class represents.
	 *
	 * @return {String}
	 */
	getType : function() {
		return 'comment';
	},


	/**
	 * Returns the comment inside the comment tag.
	 *
	 * @return {String}
	 */
	getComment : function() {
		return this.comment;
	}

} );
/*global Autolinker */
/**
 * @class Autolinker.htmlParser.ElementNode
 * @extends Autolinker.htmlParser.HtmlNode
 * 
 * Represents an HTML element node that has been parsed by the {@link Autolinker.htmlParser.HtmlParser}.
 * 
 * See this class's superclass ({@link Autolinker.htmlParser.HtmlNode}) for more details.
 */
Autolinker.htmlParser.ElementNode = Autolinker.Util.extend( Autolinker.htmlParser.HtmlNode, {
	
	/**
	 * @cfg {String} tagName (required)
	 * 
	 * The name of the tag that was matched.
	 */
	tagName : '',
	
	/**
	 * @cfg {Boolean} closing (required)
	 * 
	 * `true` if the element (tag) is a closing tag, `false` if its an opening tag.
	 */
	closing : false,

	
	/**
	 * Returns a string name for the type of node that this class represents.
	 * 
	 * @return {String}
	 */
	getType : function() {
		return 'element';
	},
	

	/**
	 * Returns the HTML element's (tag's) name. Ex: for an &lt;img&gt; tag, returns "img".
	 * 
	 * @return {String}
	 */
	getTagName : function() {
		return this.tagName;
	},
	
	
	/**
	 * Determines if the HTML element (tag) is a closing tag. Ex: &lt;div&gt; returns
	 * `false`, while &lt;/div&gt; returns `true`.
	 * 
	 * @return {Boolean}
	 */
	isClosing : function() {
		return this.closing;
	}
	
} );
/*global Autolinker */
/**
 * @class Autolinker.htmlParser.EntityNode
 * @extends Autolinker.htmlParser.HtmlNode
 * 
 * Represents a known HTML entity node that has been parsed by the {@link Autolinker.htmlParser.HtmlParser}.
 * Ex: '&amp;nbsp;', or '&amp#160;' (which will be retrievable from the {@link #getText} method.
 * 
 * Note that this class will only be returned from the HtmlParser for the set of checked HTML entity nodes 
 * defined by the {@link Autolinker.htmlParser.HtmlParser#htmlCharacterEntitiesRegex}.
 * 
 * See this class's superclass ({@link Autolinker.htmlParser.HtmlNode}) for more details.
 */
Autolinker.htmlParser.EntityNode = Autolinker.Util.extend( Autolinker.htmlParser.HtmlNode, {
	
	/**
	 * Returns a string name for the type of node that this class represents.
	 * 
	 * @return {String}
	 */
	getType : function() {
		return 'entity';
	}
	
} );
/*global Autolinker */
/**
 * @class Autolinker.htmlParser.TextNode
 * @extends Autolinker.htmlParser.HtmlNode
 * 
 * Represents a text node that has been parsed by the {@link Autolinker.htmlParser.HtmlParser}.
 * 
 * See this class's superclass ({@link Autolinker.htmlParser.HtmlNode}) for more details.
 */
Autolinker.htmlParser.TextNode = Autolinker.Util.extend( Autolinker.htmlParser.HtmlNode, {
	
	/**
	 * Returns a string name for the type of node that this class represents.
	 * 
	 * @return {String}
	 */
	getType : function() {
		return 'text';
	}
	
} );
/*global Autolinker */
/**
 * @private
 * @class Autolinker.matchParser.MatchParser
 * @extends Object
 *
 * Used by Autolinker to parse potential matches, given an input string of text.
 *
 * The MatchParser is fed a non-HTML string in order to search for matches.
 * Autolinker first uses the {@link Autolinker.htmlParser.HtmlParser} to "walk
 * around" HTML tags, and then the text around the HTML tags is passed into the
 * MatchParser in order to find the actual matches.
 */
Autolinker.matchParser.MatchParser = Autolinker.Util.extend( Object, {

	/**
	 * @cfg {Boolean} urls
	 * @inheritdoc Autolinker#urls
	 */
	urls : true,

	/**
	 * @cfg {Boolean} email
	 * @inheritdoc Autolinker#email
	 */
	email : true,

	/**
	 * @cfg {Boolean} twitter
	 * @inheritdoc Autolinker#twitter
	 */
	twitter : true,

	/**
	 * @cfg {Boolean} phone
	 * @inheritdoc Autolinker#phone
	 */
	phone: true,

	/**
	 * @cfg {Boolean/String} hashtag
	 * @inheritdoc Autolinker#hashtag
	 */
	hashtag : false,

	/**
	 * @cfg {Boolean} stripPrefix
	 * @inheritdoc Autolinker#stripPrefix
	 */
	stripPrefix : true,


	/**
	 * @private
	 * @property {RegExp} matcherRegex
	 *
	 * The regular expression that matches URLs, email addresses, phone #s,
	 * Twitter handles, and Hashtags.
	 *
	 * This regular expression has the following capturing groups:
	 *
	 * 1.  Group that is used to determine if there is a Twitter handle match
	 *     (i.e. \@someTwitterUser). Simply check for its existence to determine
	 *     if there is a Twitter handle match. The next couple of capturing
	 *     groups give information about the Twitter handle match.
	 * 2.  The whitespace character before the \@sign in a Twitter handle. This
	 *     is needed because there are no lookbehinds in JS regular expressions,
	 *     and can be used to reconstruct the original string in a replace().
	 * 3.  The Twitter handle itself in a Twitter match. If the match is
	 *     '@someTwitterUser', the handle is 'someTwitterUser'.
	 * 4.  Group that matches an email address. Used to determine if the match
	 *     is an email address, as well as holding the full address. Ex:
	 *     'me@my.com'
	 * 5.  Group that matches a URL in the input text. Ex: 'http://google.com',
	 *     'www.google.com', or just 'google.com'. This also includes a path,
	 *     url parameters, or hash anchors. Ex: google.com/path/to/file?q1=1&q2=2#myAnchor
	 * 6.  Group that matches a protocol URL (i.e. 'http://google.com'). This is
	 *     used to match protocol URLs with just a single word, like 'http://localhost',
	 *     where we won't double check that the domain name has at least one '.'
	 *     in it.
	 * 7.  A protocol-relative ('//') match for the case of a 'www.' prefixed
	 *     URL. Will be an empty string if it is not a protocol-relative match.
	 *     We need to know the character before the '//' in order to determine
	 *     if it is a valid match or the // was in a string we don't want to
	 *     auto-link.
	 * 8.  A protocol-relative ('//') match for the case of a known TLD prefixed
	 *     URL. Will be an empty string if it is not a protocol-relative match.
	 *     See #6 for more info.
	 * 9.  Group that is used to determine if there is a phone number match. The
	 *     next 3 groups give segments of the phone number.
	 * 10. Group that is used to determine if there is a Hashtag match
	 *     (i.e. \#someHashtag). Simply check for its existence to determine if
	 *     there is a Hashtag match. The next couple of capturing groups give
	 *     information about the Hashtag match.
	 * 11. The whitespace character before the #sign in a Hashtag handle. This
	 *     is needed because there are no look-behinds in JS regular
	 *     expressions, and can be used to reconstruct the original string in a
	 *     replace().
	 * 12. The Hashtag itself in a Hashtag match. If the match is
	 *     '#someHashtag', the hashtag is 'someHashtag'.
	 */
	matcherRegex : (function() {
		var twitterRegex = /(^|[^\w])@(\w{1,15})/,              // For matching a twitter handle. Ex: @gregory_jacobs

		    hashtagRegex = /(^|[^\w])#(\w{1,15})/,              // For matching a Hashtag. Ex: #games

		    emailRegex = /(?:[\-;:&=\+\$,\w\.]+@)/,             // something@ for email addresses (a.k.a. local-part)
		    phoneRegex = /(?:\+?\d{1,3}[-\s.])?\(?\d{3}\)?[-\s.]?\d{3}[-\s.]\d{4}/,  // ex: (123) 456-7890, 123 456 7890, 123-456-7890, etc.
		    protocolRegex = /(?:[A-Za-z][-.+A-Za-z0-9]+:(?![A-Za-z][-.+A-Za-z0-9]+:\/\/)(?!\d+\/?)(?:\/\/)?)/,  // match protocol, allow in format "http://" or "mailto:". However, do not match the first part of something like 'link:http://www.google.com' (i.e. don't match "link:"). Also, make sure we don't interpret 'google.com:8000' as if 'google.com' was a protocol here (i.e. ignore a trailing port number in this regex)
		    wwwRegex = /(?:www\.)/,                             // starting with 'www.'
		    domainNameRegex = /[A-Za-z0-9\.\-]*[A-Za-z0-9\-]/,  // anything looking at all like a domain, non-unicode domains, not ending in a period
		    tldRegex = /\.(?:international|construction|contractors|enterprises|photography|productions|foundation|immobilien|industries|management|properties|technology|christmas|community|directory|education|equipment|institute|marketing|solutions|vacations|bargains|boutique|builders|catering|cleaning|clothing|computer|democrat|diamonds|graphics|holdings|lighting|partners|plumbing|supplies|training|ventures|academy|careers|company|cruises|domains|exposed|flights|florist|gallery|guitars|holiday|kitchen|neustar|okinawa|recipes|rentals|reviews|shiksha|singles|support|systems|agency|berlin|camera|center|coffee|condos|dating|estate|events|expert|futbol|kaufen|luxury|maison|monash|museum|nagoya|photos|repair|report|social|supply|tattoo|tienda|travel|viajes|villas|vision|voting|voyage|actor|build|cards|cheap|codes|dance|email|glass|house|mango|ninja|parts|photo|shoes|solar|today|tokyo|tools|watch|works|aero|arpa|asia|best|bike|blue|buzz|camp|club|cool|coop|farm|fish|gift|guru|info|jobs|kiwi|kred|land|limo|link|menu|mobi|moda|name|pics|pink|post|qpon|rich|ruhr|sexy|tips|vote|voto|wang|wien|wiki|zone|bar|bid|biz|cab|cat|ceo|com|edu|gov|int|kim|mil|net|onl|org|pro|pub|red|tel|uno|wed|xxx|xyz|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cu|cv|cw|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|za|zm|zw)\b/,   // match our known top level domains (TLDs)

		    // Allow optional path, query string, and hash anchor, not ending in the following characters: "?!:,.;"
		    // http://blog.codinghorror.com/the-problem-with-urls/
		    urlSuffixRegex = /[\-A-Za-z0-9+&@#\/%=~_()|'$*\[\]?!:,.;]*[\-A-Za-z0-9+&@#\/%=~_()|'$*\[\]]/;

		return new RegExp( [
			'(',  // *** Capturing group $1, which can be used to check for a twitter handle match. Use group $3 for the actual twitter handle though. $2 may be used to reconstruct the original string in a replace()
				// *** Capturing group $2, which matches the whitespace character before the '@' sign (needed because of no lookbehinds), and
				// *** Capturing group $3, which matches the actual twitter handle
				twitterRegex.source,
			')',

			'|',

			'(',  // *** Capturing group $4, which is used to determine an email match
				emailRegex.source,
				domainNameRegex.source,
				tldRegex.source,
			')',

			'|',

			'(',  // *** Capturing group $5, which is used to match a URL
				'(?:', // parens to cover match for protocol (optional), and domain
					'(',  // *** Capturing group $6, for a protocol-prefixed url (ex: http://google.com)
						protocolRegex.source,
						domainNameRegex.source,
					')',

					'|',

					'(?:',  // non-capturing paren for a 'www.' prefixed url (ex: www.google.com)
						'(.?//)?',  // *** Capturing group $7 for an optional protocol-relative URL. Must be at the beginning of the string or start with a non-word character
						wwwRegex.source,
						domainNameRegex.source,
					')',

					'|',

					'(?:',  // non-capturing paren for known a TLD url (ex: google.com)
						'(.?//)?',  // *** Capturing group $8 for an optional protocol-relative URL. Must be at the beginning of the string or start with a non-word character
						domainNameRegex.source,
						tldRegex.source,
					')',
				')',

				'(?:' + urlSuffixRegex.source + ')?',  // match for path, query string, and/or hash anchor - optional
			')',

			'|',

			// this setup does not scale well for open extension :( Need to rethink design of autolinker...
			// ***  Capturing group $9, which matches a (USA for now) phone number
			'(',
				phoneRegex.source,
			')',

			'|',

			'(',  // *** Capturing group $10, which can be used to check for a Hashtag match. Use group $12 for the actual Hashtag though. $11 may be used to reconstruct the original string in a replace()
				// *** Capturing group $11, which matches the whitespace character before the '#' sign (needed because of no lookbehinds), and
				// *** Capturing group $12, which matches the actual Hashtag
				hashtagRegex.source,
			')'
		].join( "" ), 'gi' );
	} )(),

	/**
	 * @private
	 * @property {RegExp} charBeforeProtocolRelMatchRegex
	 *
	 * The regular expression used to retrieve the character before a
	 * protocol-relative URL match.
	 *
	 * This is used in conjunction with the {@link #matcherRegex}, which needs
	 * to grab the character before a protocol-relative '//' due to the lack of
	 * a negative look-behind in JavaScript regular expressions. The character
	 * before the match is stripped from the URL.
	 */
	charBeforeProtocolRelMatchRegex : /^(.)?\/\//,

	/**
	 * @private
	 * @property {Autolinker.MatchValidator} matchValidator
	 *
	 * The MatchValidator object, used to filter out any false positives from
	 * the {@link #matcherRegex}. See {@link Autolinker.MatchValidator} for details.
	 */


	/**
	 * @constructor
	 * @param {Object} [cfg] The configuration options for the AnchorTagBuilder
	 * instance, specified in an Object (map).
	 */
	constructor : function( cfg ) {
		Autolinker.Util.assign( this, cfg );

		this.matchValidator = new Autolinker.MatchValidator();
	},


	/**
	 * Parses the input `text` to search for matches, and calls the `replaceFn`
	 * to allow replacements of the matches. Returns the `text` with matches
	 * replaced.
	 *
	 * @param {String} text The text to search and repace matches in.
	 * @param {Function} replaceFn The iterator function to handle the
	 *   replacements. The function takes a single argument, a {@link Autolinker.match.Match}
	 *   object, and should return the text that should make the replacement.
	 * @param {Object} [contextObj=window] The context object ("scope") to run
	 *   the `replaceFn` in.
	 * @return {String}
	 */
	replace : function( text, replaceFn, contextObj ) {
		var me = this;  // for closure

		return text.replace( this.matcherRegex, function( matchStr, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12 ) {
			var matchDescObj = me.processCandidateMatch( matchStr, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12 );  // "match description" object

			// Return out with no changes for match types that are disabled (url,
			// email, phone, etc.), or for matches that are invalid (false
			// positives from the matcherRegex, which can't use look-behinds
			// since they are unavailable in JS).
			if( !matchDescObj ) {
				return matchStr;

			} else {
				// Generate replacement text for the match from the `replaceFn`
				var replaceStr = replaceFn.call( contextObj, matchDescObj.match );
				return matchDescObj.prefixStr + replaceStr + matchDescObj.suffixStr;
			}
		} );
	},


	/**
	 * Processes a candidate match from the {@link #matcherRegex}.
	 *
	 * Not all matches found by the regex are actual URL/Email/Phone/Twitter/Hashtag
	 * matches, as determined by the {@link #matchValidator}. In this case, the
	 * method returns `null`. Otherwise, a valid Object with `prefixStr`,
	 * `match`, and `suffixStr` is returned.
	 *
	 * @private
	 * @param {String} matchStr The full match that was found by the
	 *   {@link #matcherRegex}.
	 * @param {String} twitterMatch The matched text of a Twitter handle, if the
	 *   match is a Twitter match.
	 * @param {String} twitterHandlePrefixWhitespaceChar The whitespace char
	 *   before the @ sign in a Twitter handle match. This is needed because of
	 *   no lookbehinds in JS regexes, and is need to re-include the character
	 *   for the anchor tag replacement.
	 * @param {String} twitterHandle The actual Twitter user (i.e the word after
	 *   the @ sign in a Twitter match).
	 * @param {String} emailAddressMatch The matched email address for an email
	 *   address match.
	 * @param {String} urlMatch The matched URL string for a URL match.
	 * @param {String} protocolUrlMatch The match URL string for a protocol
	 *   match. Ex: 'http://yahoo.com'. This is used to match something like
	 *   'http://localhost', where we won't double check that the domain name
	 *   has at least one '.' in it.
	 * @param {String} wwwProtocolRelativeMatch The '//' for a protocol-relative
	 *   match from a 'www' url, with the character that comes before the '//'.
	 * @param {String} tldProtocolRelativeMatch The '//' for a protocol-relative
	 *   match from a TLD (top level domain) match, with the character that
	 *   comes before the '//'.
	 * @param {String} phoneMatch The matched text of a phone number
	 * @param {String} hashtagMatch The matched text of a Twitter
	 *   Hashtag, if the match is a Hashtag match.
	 * @param {String} hashtagPrefixWhitespaceChar The whitespace char
	 *   before the # sign in a Hashtag match. This is needed because of no
	 *   lookbehinds in JS regexes, and is need to re-include the character for
	 *   the anchor tag replacement.
	 * @param {String} hashtag The actual Hashtag (i.e the word
	 *   after the # sign in a Hashtag match).
	 *
	 * @return {Object} A "match description object". This will be `null` if the
	 *   match was invalid, or if a match type is disabled. Otherwise, this will
	 *   be an Object (map) with the following properties:
	 * @return {String} return.prefixStr The char(s) that should be prepended to
	 *   the replacement string. These are char(s) that were needed to be
	 *   included from the regex match that were ignored by processing code, and
	 *   should be re-inserted into the replacement stream.
	 * @return {String} return.suffixStr The char(s) that should be appended to
	 *   the replacement string. These are char(s) that were needed to be
	 *   included from the regex match that were ignored by processing code, and
	 *   should be re-inserted into the replacement stream.
	 * @return {Autolinker.match.Match} return.match The Match object that
	 *   represents the match that was found.
	 */
	processCandidateMatch : function(
		matchStr, twitterMatch, twitterHandlePrefixWhitespaceChar, twitterHandle,
		emailAddressMatch, urlMatch, protocolUrlMatch, wwwProtocolRelativeMatch,
		tldProtocolRelativeMatch, phoneMatch, hashtagMatch,
		hashtagPrefixWhitespaceChar, hashtag
	) {
		// Note: The `matchStr` variable wil be fixed up to remove characters that are no longer needed (which will
		// be added to `prefixStr` and `suffixStr`).

		var protocolRelativeMatch = wwwProtocolRelativeMatch || tldProtocolRelativeMatch,
		    match,  // Will be an Autolinker.match.Match object

		    prefixStr = "",  // A string to use to prefix the anchor tag that is created. This is needed for the Twitter and Hashtag matches.
		    suffixStr = "";  // A string to suffix the anchor tag that is created. This is used if there is a trailing parenthesis that should not be auto-linked.

		// Return out with `null` for match types that are disabled (url, email,
		// twitter, hashtag), or for matches that are invalid (false positives
		// from the matcherRegex, which can't use look-behinds since they are
		// unavailable in JS).
		if(
			( urlMatch && !this.urls ) ||
			( emailAddressMatch && !this.email ) ||
			( phoneMatch && !this.phone ) ||
			( twitterMatch && !this.twitter ) ||
			( hashtagMatch && !this.hashtag ) ||
			!this.matchValidator.isValidMatch( urlMatch, protocolUrlMatch, protocolRelativeMatch )
		) {
			return null;
		}

		// Handle a closing parenthesis at the end of the match, and exclude it
		// if there is not a matching open parenthesis
		// in the match itself.
		if( this.matchHasUnbalancedClosingParen( matchStr ) ) {
			matchStr = matchStr.substr( 0, matchStr.length - 1 );  // remove the trailing ")"
			suffixStr = ")";  // this will be added after the generated <a> tag
		}

		if( emailAddressMatch ) {
			match = new Autolinker.match.Email( { matchedText: matchStr, email: emailAddressMatch } );

		} else if( twitterMatch ) {
			// fix up the `matchStr` if there was a preceding whitespace char,
			// which was needed to determine the match itself (since there are
			// no look-behinds in JS regexes)
			if( twitterHandlePrefixWhitespaceChar ) {
				prefixStr = twitterHandlePrefixWhitespaceChar;
				matchStr = matchStr.slice( 1 );  // remove the prefixed whitespace char from the match
			}
			match = new Autolinker.match.Twitter( { matchedText: matchStr, twitterHandle: twitterHandle } );

		} else if( phoneMatch ) {
			// remove non-numeric values from phone number string
			var cleanNumber = matchStr.replace( /\D/g, '' );
 			match = new Autolinker.match.Phone( { matchedText: matchStr, number: cleanNumber } );

		} else if( hashtagMatch ) {
			// fix up the `matchStr` if there was a preceding whitespace char,
			// which was needed to determine the match itself (since there are
			// no look-behinds in JS regexes)
			if( hashtagPrefixWhitespaceChar ) {
				prefixStr = hashtagPrefixWhitespaceChar;
				matchStr = matchStr.slice( 1 );  // remove the prefixed whitespace char from the match
			}
			match = new Autolinker.match.Hashtag( { matchedText: matchStr, serviceName: this.hashtag, hashtag: hashtag } );

		} else {  // url match
			// If it's a protocol-relative '//' match, remove the character
			// before the '//' (which the matcherRegex needed to match due to
			// the lack of a negative look-behind in JavaScript regular
			// expressions)
			if( protocolRelativeMatch ) {
				var charBeforeMatch = protocolRelativeMatch.match( this.charBeforeProtocolRelMatchRegex )[ 1 ] || "";

				if( charBeforeMatch ) {  // fix up the `matchStr` if there was a preceding char before a protocol-relative match, which was needed to determine the match itself (since there are no look-behinds in JS regexes)
					prefixStr = charBeforeMatch;
					matchStr = matchStr.slice( 1 );  // remove the prefixed char from the match
				}
			}

			match = new Autolinker.match.Url( {
				matchedText : matchStr,
				url : matchStr,
				protocolUrlMatch : !!protocolUrlMatch,
				protocolRelativeMatch : !!protocolRelativeMatch,
				stripPrefix : this.stripPrefix
			} );
		}

		return {
			prefixStr : prefixStr,
			suffixStr : suffixStr,
			match     : match
		};
	},


	/**
	 * Determines if a match found has an unmatched closing parenthesis. If so,
	 * this parenthesis will be removed from the match itself, and appended
	 * after the generated anchor tag in {@link #processCandidateMatch}.
	 *
	 * A match may have an extra closing parenthesis at the end of the match
	 * because the regular expression must include parenthesis for URLs such as
	 * "wikipedia.com/something_(disambiguation)", which should be auto-linked.
	 *
	 * However, an extra parenthesis *will* be included when the URL itself is
	 * wrapped in parenthesis, such as in the case of "(wikipedia.com/something_(disambiguation))".
	 * In this case, the last closing parenthesis should *not* be part of the
	 * URL itself, and this method will return `true`.
	 *
	 * @private
	 * @param {String} matchStr The full match string from the {@link #matcherRegex}.
	 * @return {Boolean} `true` if there is an unbalanced closing parenthesis at
	 *   the end of the `matchStr`, `false` otherwise.
	 */
	matchHasUnbalancedClosingParen : function( matchStr ) {
		var lastChar = matchStr.charAt( matchStr.length - 1 );

		if( lastChar === ')' ) {
			var openParensMatch = matchStr.match( /\(/g ),
			    closeParensMatch = matchStr.match( /\)/g ),
			    numOpenParens = ( openParensMatch && openParensMatch.length ) || 0,
			    numCloseParens = ( closeParensMatch && closeParensMatch.length ) || 0;

			if( numOpenParens < numCloseParens ) {
				return true;
			}
		}

		return false;
	}

} );
/*global Autolinker */
/*jshint scripturl:true */
/**
 * @private
 * @class Autolinker.MatchValidator
 * @extends Object
 *
 * Used by Autolinker to filter out false positives from the
 * {@link Autolinker.matchParser.MatchParser#matcherRegex}.
 *
 * Due to the limitations of regular expressions (including the missing feature
 * of look-behinds in JS regular expressions), we cannot always determine the
 * validity of a given match. This class applies a bit of additional logic to
 * filter out any false positives that have been matched by the
 * {@link Autolinker.matchParser.MatchParser#matcherRegex}.
 */
Autolinker.MatchValidator = Autolinker.Util.extend( Object, {

	/**
	 * @private
	 * @property {RegExp} invalidProtocolRelMatchRegex
	 *
	 * The regular expression used to check a potential protocol-relative URL
	 * match, coming from the {@link Autolinker.matchParser.MatchParser#matcherRegex}.
	 * A protocol-relative URL is, for example, "//yahoo.com"
	 *
	 * This regular expression checks to see if there is a word character before
	 * the '//' match in order to determine if we should actually autolink a
	 * protocol-relative URL. This is needed because there is no negative
	 * look-behind in JavaScript regular expressions.
	 *
	 * For instance, we want to autolink something like "Go to: //google.com",
	 * but we don't want to autolink something like "abc//google.com"
	 */
	invalidProtocolRelMatchRegex : /^[\w]\/\//,

	/**
	 * Regex to test for a full protocol, with the two trailing slashes. Ex: 'http://'
	 *
	 * @private
	 * @property {RegExp} hasFullProtocolRegex
	 */
	hasFullProtocolRegex : /^[A-Za-z][-.+A-Za-z0-9]+:\/\//,

	/**
	 * Regex to find the URI scheme, such as 'mailto:'.
	 *
	 * This is used to filter out 'javascript:' and 'vbscript:' schemes.
	 *
	 * @private
	 * @property {RegExp} uriSchemeRegex
	 */
	uriSchemeRegex : /^[A-Za-z][-.+A-Za-z0-9]+:/,

	/**
	 * Regex to determine if at least one word char exists after the protocol (i.e. after the ':')
	 *
	 * @private
	 * @property {RegExp} hasWordCharAfterProtocolRegex
	 */
	hasWordCharAfterProtocolRegex : /:[^\s]*?[A-Za-z]/,


	/**
	 * Determines if a given match found by the {@link Autolinker.matchParser.MatchParser}
	 * is valid. Will return `false` for:
	 *
	 * 1) URL matches which do not have at least have one period ('.') in the
	 *    domain name (effectively skipping over matches like "abc:def").
	 *    However, URL matches with a protocol will be allowed (ex: 'http://localhost')
	 * 2) URL matches which do not have at least one word character in the
	 *    domain name (effectively skipping over matches like "git:1.0").
	 * 3) A protocol-relative url match (a URL beginning with '//') whose
	 *    previous character is a word character (effectively skipping over
	 *    strings like "abc//google.com")
	 *
	 * Otherwise, returns `true`.
	 *
	 * @param {String} urlMatch The matched URL, if there was one. Will be an
	 *   empty string if the match is not a URL match.
	 * @param {String} protocolUrlMatch The match URL string for a protocol
	 *   match. Ex: 'http://yahoo.com'. This is used to match something like
	 *   'http://localhost', where we won't double check that the domain name
	 *   has at least one '.' in it.
	 * @param {String} protocolRelativeMatch The protocol-relative string for a
	 *   URL match (i.e. '//'), possibly with a preceding character (ex, a
	 *   space, such as: ' //', or a letter, such as: 'a//'). The match is
	 *   invalid if there is a word character preceding the '//'.
	 * @return {Boolean} `true` if the match given is valid and should be
	 *   processed, or `false` if the match is invalid and/or should just not be
	 *   processed.
	 */
	isValidMatch : function( urlMatch, protocolUrlMatch, protocolRelativeMatch ) {
		if(
			( protocolUrlMatch && !this.isValidUriScheme( protocolUrlMatch ) ) ||
			this.urlMatchDoesNotHaveProtocolOrDot( urlMatch, protocolUrlMatch ) ||       // At least one period ('.') must exist in the URL match for us to consider it an actual URL, *unless* it was a full protocol match (like 'http://localhost')
			this.urlMatchDoesNotHaveAtLeastOneWordChar( urlMatch, protocolUrlMatch ) ||  // At least one letter character must exist in the domain name after a protocol match. Ex: skip over something like "git:1.0"
			this.isInvalidProtocolRelativeMatch( protocolRelativeMatch )                 // A protocol-relative match which has a word character in front of it (so we can skip something like "abc//google.com")
		) {
			return false;
		}

		return true;
	},


	/**
	 * Determines if the URI scheme is a valid scheme to be autolinked. Returns
	 * `false` if the scheme is 'javascript:' or 'vbscript:'
	 *
	 * @private
	 * @param {String} uriSchemeMatch The match URL string for a full URI scheme
	 *   match. Ex: 'http://yahoo.com' or 'mailto:a@a.com'.
	 * @return {Boolean} `true` if the scheme is a valid one, `false` otherwise.
	 */
	isValidUriScheme : function( uriSchemeMatch ) {
		var uriScheme = uriSchemeMatch.match( this.uriSchemeRegex )[ 0 ].toLowerCase();

		return ( uriScheme !== 'javascript:' && uriScheme !== 'vbscript:' );
	},


	/**
	 * Determines if a URL match does not have either:
	 *
	 * a) a full protocol (i.e. 'http://'), or
	 * b) at least one dot ('.') in the domain name (for a non-full-protocol
	 *    match).
	 *
	 * Either situation is considered an invalid URL (ex: 'git:d' does not have
	 * either the '://' part, or at least one dot in the domain name. If the
	 * match was 'git:abc.com', we would consider this valid.)
	 *
	 * @private
	 * @param {String} urlMatch The matched URL, if there was one. Will be an
	 *   empty string if the match is not a URL match.
	 * @param {String} protocolUrlMatch The match URL string for a protocol
	 *   match. Ex: 'http://yahoo.com'. This is used to match something like
	 *   'http://localhost', where we won't double check that the domain name
	 *   has at least one '.' in it.
	 * @return {Boolean} `true` if the URL match does not have a full protocol,
	 *   or at least one dot ('.') in a non-full-protocol match.
	 */
	urlMatchDoesNotHaveProtocolOrDot : function( urlMatch, protocolUrlMatch ) {
		return ( !!urlMatch && ( !protocolUrlMatch || !this.hasFullProtocolRegex.test( protocolUrlMatch ) ) && urlMatch.indexOf( '.' ) === -1 );
	},


	/**
	 * Determines if a URL match does not have at least one word character after
	 * the protocol (i.e. in the domain name).
	 *
	 * At least one letter character must exist in the domain name after a
	 * protocol match. Ex: skip over something like "git:1.0"
	 *
	 * @private
	 * @param {String} urlMatch The matched URL, if there was one. Will be an
	 *   empty string if the match is not a URL match.
	 * @param {String} protocolUrlMatch The match URL string for a protocol
	 *   match. Ex: 'http://yahoo.com'. This is used to know whether or not we
	 *   have a protocol in the URL string, in order to check for a word
	 *   character after the protocol separator (':').
	 * @return {Boolean} `true` if the URL match does not have at least one word
	 *   character in it after the protocol, `false` otherwise.
	 */
	urlMatchDoesNotHaveAtLeastOneWordChar : function( urlMatch, protocolUrlMatch ) {
		if( urlMatch && protocolUrlMatch ) {
			return !this.hasWordCharAfterProtocolRegex.test( urlMatch );
		} else {
			return false;
		}
	},


	/**
	 * Determines if a protocol-relative match is an invalid one. This method
	 * returns `true` if there is a `protocolRelativeMatch`, and that match
	 * contains a word character before the '//' (i.e. it must contain
	 * whitespace or nothing before the '//' in order to be considered valid).
	 *
	 * @private
	 * @param {String} protocolRelativeMatch The protocol-relative string for a
	 *   URL match (i.e. '//'), possibly with a preceding character (ex, a
	 *   space, such as: ' //', or a letter, such as: 'a//'). The match is
	 *   invalid if there is a word character preceding the '//'.
	 * @return {Boolean} `true` if it is an invalid protocol-relative match,
	 *   `false` otherwise.
	 */
	isInvalidProtocolRelativeMatch : function( protocolRelativeMatch ) {
		return ( !!protocolRelativeMatch && this.invalidProtocolRelMatchRegex.test( protocolRelativeMatch ) );
	}

} );
/*global Autolinker */
/**
 * @abstract
 * @class Autolinker.match.Match
 * 
 * Represents a match found in an input string which should be Autolinked. A Match object is what is provided in a 
 * {@link Autolinker#replaceFn replaceFn}, and may be used to query for details about the match.
 * 
 * For example:
 * 
 *     var input = "...";  // string with URLs, Email Addresses, and Twitter Handles
 *     
 *     var linkedText = Autolinker.link( input, {
 *         replaceFn : function( autolinker, match ) {
 *             console.log( "href = ", match.getAnchorHref() );
 *             console.log( "text = ", match.getAnchorText() );
 *         
 *             switch( match.getType() ) {
 *                 case 'url' : 
 *                     console.log( "url: ", match.getUrl() );
 *                     
 *                 case 'email' :
 *                     console.log( "email: ", match.getEmail() );
 *                     
 *                 case 'twitter' :
 *                     console.log( "twitter: ", match.getTwitterHandle() );
 *             }
 *         }
 *     } );
 *     
 * See the {@link Autolinker} class for more details on using the {@link Autolinker#replaceFn replaceFn}.
 */
Autolinker.match.Match = Autolinker.Util.extend( Object, {
	
	/**
	 * @cfg {String} matchedText (required)
	 * 
	 * The original text that was matched.
	 */
	
	
	/**
	 * @constructor
	 * @param {Object} cfg The configuration properties for the Match instance, specified in an Object (map).
	 */
	constructor : function( cfg ) {
		Autolinker.Util.assign( this, cfg );
	},

	
	/**
	 * Returns a string name for the type of match that this class represents.
	 * 
	 * @abstract
	 * @return {String}
	 */
	getType : Autolinker.Util.abstractMethod,
	
	
	/**
	 * Returns the original text that was matched.
	 * 
	 * @return {String}
	 */
	getMatchedText : function() {
		return this.matchedText;
	},
	

	/**
	 * Returns the anchor href that should be generated for the match.
	 * 
	 * @abstract
	 * @return {String}
	 */
	getAnchorHref : Autolinker.Util.abstractMethod,
	
	
	/**
	 * Returns the anchor text that should be generated for the match.
	 * 
	 * @abstract
	 * @return {String}
	 */
	getAnchorText : Autolinker.Util.abstractMethod

} );
/*global Autolinker */
/**
 * @class Autolinker.match.Email
 * @extends Autolinker.match.Match
 * 
 * Represents a Email match found in an input string which should be Autolinked.
 * 
 * See this class's superclass ({@link Autolinker.match.Match}) for more details.
 */
Autolinker.match.Email = Autolinker.Util.extend( Autolinker.match.Match, {
	
	/**
	 * @cfg {String} email (required)
	 * 
	 * The email address that was matched.
	 */
	

	/**
	 * Returns a string name for the type of match that this class represents.
	 * 
	 * @return {String}
	 */
	getType : function() {
		return 'email';
	},
	
	
	/**
	 * Returns the email address that was matched.
	 * 
	 * @return {String}
	 */
	getEmail : function() {
		return this.email;
	},
	

	/**
	 * Returns the anchor href that should be generated for the match.
	 * 
	 * @return {String}
	 */
	getAnchorHref : function() {
		return 'mailto:' + this.email;
	},
	
	
	/**
	 * Returns the anchor text that should be generated for the match.
	 * 
	 * @return {String}
	 */
	getAnchorText : function() {
		return this.email;
	}
	
} );
/*global Autolinker */
/**
 * @class Autolinker.match.Hashtag
 * @extends Autolinker.match.Match
 *
 * Represents a Hashtag match found in an input string which should be
 * Autolinked.
 *
 * See this class's superclass ({@link Autolinker.match.Match}) for more
 * details.
 */
Autolinker.match.Hashtag = Autolinker.Util.extend( Autolinker.match.Match, {

	/**
	 * @cfg {String} serviceName (required)
	 *
	 * The service to point hashtag matches to. See {@link Autolinker#hashtag}
	 * for available values.
	 */

	/**
	 * @cfg {String} hashtag (required)
	 *
	 * The Hashtag that was matched, without the '#'.
	 */


	/**
	 * Returns the type of match that this class represents.
	 *
	 * @return {String}
	 */
	getType : function() {
		return 'hashtag';
	},


	/**
	 * Returns the matched hashtag.
	 *
	 * @return {String}
	 */
	getHashtag : function() {
		return this.hashtag;
	},


	/**
	 * Returns the anchor href that should be generated for the match.
	 *
	 * @return {String}
	 */
	getAnchorHref : function() {
		var serviceName = this.serviceName,
		    hashtag = this.hashtag;

		switch( serviceName ) {
			case 'twitter' :
				return 'https://twitter.com/hashtag/' + hashtag;
			case 'facebook' :
				return 'https://www.facebook.com/hashtag/' + hashtag;

			default :  // Shouldn't happen because Autolinker's constructor should block any invalid values, but just in case.
				throw new Error( 'Unknown service name to point hashtag to: ', serviceName );
		}
	},


	/**
	 * Returns the anchor text that should be generated for the match.
	 *
	 * @return {String}
	 */
	getAnchorText : function() {
		return '#' + this.hashtag;
	}

} );
/*global Autolinker */
/**
 * @class Autolinker.match.Phone
 * @extends Autolinker.match.Match
 *
 * Represents a Phone number match found in an input string which should be
 * Autolinked.
 *
 * See this class's superclass ({@link Autolinker.match.Match}) for more
 * details.
 */
Autolinker.match.Phone = Autolinker.Util.extend( Autolinker.match.Match, {

	/**
	 * @cfg {String} number (required)
	 *
	 * The phone number that was matched.
	 */


	/**
	 * Returns a string name for the type of match that this class represents.
	 *
	 * @return {String}
	 */
	getType : function() {
		return 'phone';
	},


	/**
	 * Returns the phone number that was matched.
	 *
	 * @return {String}
	 */
	getNumber: function() {
		return this.number;
	},


	/**
	 * Returns the anchor href that should be generated for the match.
	 *
	 * @return {String}
	 */
	getAnchorHref : function() {
		return 'tel:' + this.number;
	},


	/**
	 * Returns the anchor text that should be generated for the match.
	 *
	 * @return {String}
	 */
	getAnchorText : function() {
		return this.matchedText;
	}

} );

/*global Autolinker */
/**
 * @class Autolinker.match.Twitter
 * @extends Autolinker.match.Match
 * 
 * Represents a Twitter match found in an input string which should be Autolinked.
 * 
 * See this class's superclass ({@link Autolinker.match.Match}) for more details.
 */
Autolinker.match.Twitter = Autolinker.Util.extend( Autolinker.match.Match, {
	
	/**
	 * @cfg {String} twitterHandle (required)
	 * 
	 * The Twitter handle that was matched.
	 */
	

	/**
	 * Returns the type of match that this class represents.
	 * 
	 * @return {String}
	 */
	getType : function() {
		return 'twitter';
	},
	
	
	/**
	 * Returns a string name for the type of match that this class represents.
	 * 
	 * @return {String}
	 */
	getTwitterHandle : function() {
		return this.twitterHandle;
	},
	

	/**
	 * Returns the anchor href that should be generated for the match.
	 * 
	 * @return {String}
	 */
	getAnchorHref : function() {
		return 'https://twitter.com/' + this.twitterHandle;
	},
	
	
	/**
	 * Returns the anchor text that should be generated for the match.
	 * 
	 * @return {String}
	 */
	getAnchorText : function() {
		return '@' + this.twitterHandle;
	}
	
} );
/*global Autolinker */
/**
 * @class Autolinker.match.Url
 * @extends Autolinker.match.Match
 * 
 * Represents a Url match found in an input string which should be Autolinked.
 * 
 * See this class's superclass ({@link Autolinker.match.Match}) for more details.
 */
Autolinker.match.Url = Autolinker.Util.extend( Autolinker.match.Match, {
	
	/**
	 * @cfg {String} url (required)
	 * 
	 * The url that was matched.
	 */
	
	/**
	 * @cfg {Boolean} protocolUrlMatch (required)
	 * 
	 * `true` if the URL is a match which already has a protocol (i.e. 'http://'), `false` if the match was from a 'www' or
	 * known TLD match.
	 */
	
	/**
	 * @cfg {Boolean} protocolRelativeMatch (required)
	 * 
	 * `true` if the URL is a protocol-relative match. A protocol-relative match is a URL that starts with '//',
	 * and will be either http:// or https:// based on the protocol that the site is loaded under.
	 */
	
	/**
	 * @cfg {Boolean} stripPrefix (required)
	 * @inheritdoc Autolinker#stripPrefix
	 */
	

	/**
	 * @private
	 * @property {RegExp} urlPrefixRegex
	 * 
	 * A regular expression used to remove the 'http://' or 'https://' and/or the 'www.' from URLs.
	 */
	urlPrefixRegex: /^(https?:\/\/)?(www\.)?/i,
	
	/**
	 * @private
	 * @property {RegExp} protocolRelativeRegex
	 * 
	 * The regular expression used to remove the protocol-relative '//' from the {@link #url} string, for purposes
	 * of {@link #getAnchorText}. A protocol-relative URL is, for example, "//yahoo.com"
	 */
	protocolRelativeRegex : /^\/\//,
	
	/**
	 * @private
	 * @property {Boolean} protocolPrepended
	 * 
	 * Will be set to `true` if the 'http://' protocol has been prepended to the {@link #url} (because the
	 * {@link #url} did not have a protocol)
	 */
	protocolPrepended : false,
	

	/**
	 * Returns a string name for the type of match that this class represents.
	 * 
	 * @return {String}
	 */
	getType : function() {
		return 'url';
	},
	
	
	/**
	 * Returns the url that was matched, assuming the protocol to be 'http://' if the original
	 * match was missing a protocol.
	 * 
	 * @return {String}
	 */
	getUrl : function() {
		var url = this.url;
		
		// if the url string doesn't begin with a protocol, assume 'http://'
		if( !this.protocolRelativeMatch && !this.protocolUrlMatch && !this.protocolPrepended ) {
			url = this.url = 'http://' + url;
			
			this.protocolPrepended = true;
		}
		
		return url;
	},
	

	/**
	 * Returns the anchor href that should be generated for the match.
	 * 
	 * @return {String}
	 */
	getAnchorHref : function() {
		var url = this.getUrl();
		
		return url.replace( /&amp;/g, '&' );  // any &amp;'s in the URL should be converted back to '&' if they were displayed as &amp; in the source html 
	},
	
	
	/**
	 * Returns the anchor text that should be generated for the match.
	 * 
	 * @return {String}
	 */
	getAnchorText : function() {
		var anchorText = this.getUrl();
		
		if( this.protocolRelativeMatch ) {
			// Strip off any protocol-relative '//' from the anchor text
			anchorText = this.stripProtocolRelativePrefix( anchorText );
		}
		if( this.stripPrefix ) {
			anchorText = this.stripUrlPrefix( anchorText );
		}
		anchorText = this.removeTrailingSlash( anchorText );  // remove trailing slash, if there is one
		
		return anchorText;
	},
	
	
	// ---------------------------------------
	
	// Utility Functionality
	
	/**
	 * Strips the URL prefix (such as "http://" or "https://") from the given text.
	 * 
	 * @private
	 * @param {String} text The text of the anchor that is being generated, for which to strip off the
	 *   url prefix (such as stripping off "http://")
	 * @return {String} The `anchorText`, with the prefix stripped.
	 */
	stripUrlPrefix : function( text ) {
		return text.replace( this.urlPrefixRegex, '' );
	},
	
	
	/**
	 * Strips any protocol-relative '//' from the anchor text.
	 * 
	 * @private
	 * @param {String} text The text of the anchor that is being generated, for which to strip off the
	 *   protocol-relative prefix (such as stripping off "//")
	 * @return {String} The `anchorText`, with the protocol-relative prefix stripped.
	 */
	stripProtocolRelativePrefix : function( text ) {
		return text.replace( this.protocolRelativeRegex, '' );
	},
	
	
	/**
	 * Removes any trailing slash from the given `anchorText`, in preparation for the text to be displayed.
	 * 
	 * @private
	 * @param {String} anchorText The text of the anchor that is being generated, for which to remove any trailing
	 *   slash ('/') that may exist.
	 * @return {String} The `anchorText`, with the trailing slash removed.
	 */
	removeTrailingSlash : function( anchorText ) {
		if( anchorText.charAt( anchorText.length - 1 ) === '/' ) {
			anchorText = anchorText.slice( 0, -1 );
		}
		return anchorText;
	}
	
} );
return Autolinker;

}));

/*!
 * imagesLoaded PACKAGED v3.1.8
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */


/*!
 * EventEmitter v4.2.6 - git.io/ee
 * Oliver Caldwell
 * MIT license
 * @preserve
 */

(function () {
  

  /**
   * Class for managing events.
   * Can be extended to provide event functionality in other classes.
   *
   * @class EventEmitter Manages event registering and emitting.
   */
  function EventEmitter() {}

  // Shortcuts to improve speed and size
  var proto = EventEmitter.prototype;
  var exports = this;
  var originalGlobalValue = exports.EventEmitter;

  /**
   * Finds the index of the listener for the event in it's storage array.
   *
   * @param {Function[]} listeners Array of listeners to search through.
   * @param {Function} listener Method to look for.
   * @return {Number} Index of the specified listener, -1 if not found
   * @api private
   */
  function indexOfListener(listeners, listener) {
    var i = listeners.length;
    while (i--) {
      if (listeners[i].listener === listener) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Alias a method while keeping the context correct, to allow for overwriting of target method.
   *
   * @param {String} name The name of the target method.
   * @return {Function} The aliased method
   * @api private
   */
  function alias(name) {
    return function aliasClosure() {
      return this[name].apply(this, arguments);
    };
  }

  /**
   * Returns the listener array for the specified event.
   * Will initialise the event object and listener arrays if required.
   * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
   * Each property in the object response is an array of listener functions.
   *
   * @param {String|RegExp} evt Name of the event to return the listeners from.
   * @return {Function[]|Object} All listener functions for the event.
   */
  proto.getListeners = function getListeners(evt) {
    var events = this._getEvents();
    var response;
    var key;

    // Return a concatenated array of all matching events if
    // the selector is a regular expression.
    if (typeof evt === 'object') {
      response = {};
      for (key in events) {
        if (events.hasOwnProperty(key) && evt.test(key)) {
          response[key] = events[key];
        }
      }
    }
    else {
      response = events[evt] || (events[evt] = []);
    }

    return response;
  };

  /**
   * Takes a list of listener objects and flattens it into a list of listener functions.
   *
   * @param {Object[]} listeners Raw listener objects.
   * @return {Function[]} Just the listener functions.
   */
  proto.flattenListeners = function flattenListeners(listeners) {
    var flatListeners = [];
    var i;

    for (i = 0; i < listeners.length; i += 1) {
      flatListeners.push(listeners[i].listener);
    }

    return flatListeners;
  };

  /**
   * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
   *
   * @param {String|RegExp} evt Name of the event to return the listeners from.
   * @return {Object} All listener functions for an event in an object.
   */
  proto.getListenersAsObject = function getListenersAsObject(evt) {
    var listeners = this.getListeners(evt);
    var response;

    if (listeners instanceof Array) {
      response = {};
      response[evt] = listeners;
    }

    return response || listeners;
  };

  /**
   * Adds a listener function to the specified event.
   * The listener will not be added if it is a duplicate.
   * If the listener returns true then it will be removed after it is called.
   * If you pass a regular expression as the event name then the listener will be added to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to attach the listener to.
   * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.addListener = function addListener(evt, listener) {
    var listeners = this.getListenersAsObject(evt);
    var listenerIsWrapped = typeof listener === 'object';
    var key;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
        listeners[key].push(listenerIsWrapped ? listener : {
          listener: listener,
          once: false
        });
      }
    }

    return this;
  };

  /**
   * Alias of addListener
   */
  proto.on = alias('addListener');

  /**
   * Semi-alias of addListener. It will add a listener that will be
   * automatically removed after it's first execution.
   *
   * @param {String|RegExp} evt Name of the event to attach the listener to.
   * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.addOnceListener = function addOnceListener(evt, listener) {
    return this.addListener(evt, {
      listener: listener,
      once: true
    });
  };

  /**
   * Alias of addOnceListener.
   */
  proto.once = alias('addOnceListener');

  /**
   * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
   * You need to tell it what event names should be matched by a regex.
   *
   * @param {String} evt Name of the event to create.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.defineEvent = function defineEvent(evt) {
    this.getListeners(evt);
    return this;
  };

  /**
   * Uses defineEvent to define multiple events.
   *
   * @param {String[]} evts An array of event names to define.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.defineEvents = function defineEvents(evts) {
    for (var i = 0; i < evts.length; i += 1) {
      this.defineEvent(evts[i]);
    }
    return this;
  };

  /**
   * Removes a listener function from the specified event.
   * When passed a regular expression as the event name, it will remove the listener from all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to remove the listener from.
   * @param {Function} listener Method to remove from the event.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.removeListener = function removeListener(evt, listener) {
    var listeners = this.getListenersAsObject(evt);
    var index;
    var key;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key)) {
        index = indexOfListener(listeners[key], listener);

        if (index !== -1) {
          listeners[key].splice(index, 1);
        }
      }
    }

    return this;
  };

  /**
   * Alias of removeListener
   */
  proto.off = alias('removeListener');

  /**
   * Adds listeners in bulk using the manipulateListeners method.
   * If you pass an object as the second argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
   * You can also pass it a regular expression to add the array of listeners to all events that match it.
   * Yeah, this function does quite a bit. That's probably a bad thing.
   *
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to add.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.addListeners = function addListeners(evt, listeners) {
    // Pass through to manipulateListeners
    return this.manipulateListeners(false, evt, listeners);
  };

  /**
   * Removes listeners in bulk using the manipulateListeners method.
   * If you pass an object as the second argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
   * You can also pass it an event name and an array of listeners to be removed.
   * You can also pass it a regular expression to remove the listeners from all events that match it.
   *
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to remove.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.removeListeners = function removeListeners(evt, listeners) {
    // Pass through to manipulateListeners
    return this.manipulateListeners(true, evt, listeners);
  };

  /**
   * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
   * The first argument will determine if the listeners are removed (true) or added (false).
   * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
   * You can also pass it an event name and an array of listeners to be added/removed.
   * You can also pass it a regular expression to manipulate the listeners of all events that match it.
   *
   * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
    var i;
    var value;
    var single = remove ? this.removeListener : this.addListener;
    var multiple = remove ? this.removeListeners : this.addListeners;

    // If evt is an object then pass each of it's properties to this method
    if (typeof evt === 'object' && !(evt instanceof RegExp)) {
      for (i in evt) {
        if (evt.hasOwnProperty(i) && (value = evt[i])) {
          // Pass the single listener straight through to the singular method
          if (typeof value === 'function') {
            single.call(this, i, value);
          }
          else {
            // Otherwise pass back to the multiple function
            multiple.call(this, i, value);
          }
        }
      }
    }
    else {
      // So evt must be a string
      // And listeners must be an array of listeners
      // Loop over it and pass each one to the multiple method
      i = listeners.length;
      while (i--) {
        single.call(this, evt, listeners[i]);
      }
    }

    return this;
  };

  /**
   * Removes all listeners from a specified event.
   * If you do not specify an event then all listeners will be removed.
   * That means every event will be emptied.
   * You can also pass a regex to remove all events that match it.
   *
   * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.removeEvent = function removeEvent(evt) {
    var type = typeof evt;
    var events = this._getEvents();
    var key;

    // Remove different things depending on the state of evt
    if (type === 'string') {
      // Remove all listeners for the specified event
      delete events[evt];
    }
    else if (type === 'object') {
      // Remove all events matching the regex.
      for (key in events) {
        if (events.hasOwnProperty(key) && evt.test(key)) {
          delete events[key];
        }
      }
    }
    else {
      // Remove all listeners in all events
      delete this._events;
    }

    return this;
  };

  /**
   * Alias of removeEvent.
   *
   * Added to mirror the node API.
   */
  proto.removeAllListeners = alias('removeEvent');

  /**
   * Emits an event of your choice.
   * When emitted, every listener attached to that event will be executed.
   * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
   * Because it uses apply, your array of arguments will be passed as if you wrote them out separately.
   * So they will not arrive within the array on the other side, they will be separate.
   * You can also pass a regular expression to emit to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
   * @param {Array} [args] Optional array of arguments to be passed to each listener.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.emitEvent = function emitEvent(evt, args) {
    var listeners = this.getListenersAsObject(evt);
    var listener;
    var i;
    var key;
    var response;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key)) {
        i = listeners[key].length;

        while (i--) {
          // If the listener returns true then it shall be removed from the event
          // The function is executed either with a basic call or an apply if there is an args array
          listener = listeners[key][i];

          if (listener.once === true) {
            this.removeListener(evt, listener.listener);
          }

          response = listener.listener.apply(this, args || []);

          if (response === this._getOnceReturnValue()) {
            this.removeListener(evt, listener.listener);
          }
        }
      }
    }

    return this;
  };

  /**
   * Alias of emitEvent
   */
  proto.trigger = alias('emitEvent');

  /**
   * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
   * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
   * @param {...*} Optional additional arguments to be passed to each listener.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.emit = function emit(evt) {
    var args = Array.prototype.slice.call(arguments, 1);
    return this.emitEvent(evt, args);
  };

  /**
   * Sets the current value to check against when executing listeners. If a
   * listeners return value matches the one set here then it will be removed
   * after execution. This value defaults to true.
   *
   * @param {*} value The new value to check for when executing listeners.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.setOnceReturnValue = function setOnceReturnValue(value) {
    this._onceReturnValue = value;
    return this;
  };

  /**
   * Fetches the current value to check against when executing listeners. If
   * the listeners return value matches this one then it should be removed
   * automatically. It will return true by default.
   *
   * @return {*|Boolean} The current value to check for or the default, true.
   * @api private
   */
  proto._getOnceReturnValue = function _getOnceReturnValue() {
    if (this.hasOwnProperty('_onceReturnValue')) {
      return this._onceReturnValue;
    }
    else {
      return true;
    }
  };

  /**
   * Fetches the events object and creates one if required.
   *
   * @return {Object} The events storage object.
   * @api private
   */
  proto._getEvents = function _getEvents() {
    return this._events || (this._events = {});
  };

  /**
   * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
   *
   * @return {Function} Non conflicting EventEmitter class.
   */
  EventEmitter.noConflict = function noConflict() {
    exports.EventEmitter = originalGlobalValue;
    return EventEmitter;
  };

  // Expose the class either via AMD, CommonJS or the global object
  if (typeof define === 'function' && define.amd) {
    define('eventEmitter/EventEmitter',[],function () {
      return EventEmitter;
    });
  }
  else if (typeof module === 'object' && module.exports){
    module.exports = EventEmitter;
  }
  else {
    this.EventEmitter = EventEmitter;
  }
}.call(this));

/*!
 * eventie v1.0.4
 * event binding helper
 *   eventie.bind( elem, 'click', myFn )
 *   eventie.unbind( elem, 'click', myFn )
 */

/*jshint browser: true, undef: true, unused: true */
/*global define: false */

( function( window ) {



var docElem = document.documentElement;

var bind = function() {};

function getIEEvent( obj ) {
  var event = window.event;
  // add event.target
  event.target = event.target || event.srcElement || obj;
  return event;
}

if ( docElem.addEventListener ) {
  bind = function( obj, type, fn ) {
    obj.addEventListener( type, fn, false );
  };
} else if ( docElem.attachEvent ) {
  bind = function( obj, type, fn ) {
    obj[ type + fn ] = fn.handleEvent ?
      function() {
        var event = getIEEvent( obj );
        fn.handleEvent.call( fn, event );
      } :
      function() {
        var event = getIEEvent( obj );
        fn.call( obj, event );
      };
    obj.attachEvent( "on" + type, obj[ type + fn ] );
  };
}

var unbind = function() {};

if ( docElem.removeEventListener ) {
  unbind = function( obj, type, fn ) {
    obj.removeEventListener( type, fn, false );
  };
} else if ( docElem.detachEvent ) {
  unbind = function( obj, type, fn ) {
    obj.detachEvent( "on" + type, obj[ type + fn ] );
    try {
      delete obj[ type + fn ];
    } catch ( err ) {
      // can't delete window object properties
      obj[ type + fn ] = undefined;
    }
  };
}

var eventie = {
  bind: bind,
  unbind: unbind
};

// transport
if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( 'eventie/eventie',eventie );
} else {
  // browser global
  window.eventie = eventie;
}

})( this );

/*!
 * imagesLoaded v3.1.8
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

( function( window, factory ) { 
  // universal module definition

  /*global define: false, module: false, require: false */

  if ( typeof define === 'function' && define.amd ) {
    // AMD
    define( [
      'eventEmitter/EventEmitter',
      'eventie/eventie'
    ], function( EventEmitter, eventie ) {
      return factory( window, EventEmitter, eventie );
    });
  } else if ( typeof exports === 'object' ) {
    // CommonJS
    module.exports = factory(
      window,
      require('wolfy87-eventemitter'),
      require('eventie')
    );
  } else {
    // browser global
    window.imagesLoaded = factory(
      window,
      window.EventEmitter,
      window.eventie
    );
  }

})( window,

// --------------------------  factory -------------------------- //

function factory( window, EventEmitter, eventie ) {



var $ = window.jQuery;
var console = window.console;
var hasConsole = typeof console !== 'undefined';

// -------------------------- helpers -------------------------- //

// extend objects
function extend( a, b ) {
  for ( var prop in b ) {
    a[ prop ] = b[ prop ];
  }
  return a;
}

var objToString = Object.prototype.toString;
function isArray( obj ) {
  return objToString.call( obj ) === '[object Array]';
}

// turn element or nodeList into an array
function makeArray( obj ) {
  var ary = [];
  if ( isArray( obj ) ) {
    // use object if already an array
    ary = obj;
  } else if ( typeof obj.length === 'number' ) {
    // convert nodeList to array
    for ( var i=0, len = obj.length; i < len; i++ ) {
      ary.push( obj[i] );
    }
  } else {
    // array of single index
    ary.push( obj );
  }
  return ary;
}

  // -------------------------- imagesLoaded -------------------------- //

  /**
   * @param {Array, Element, NodeList, String} elem
   * @param {Object or Function} options - if function, use as callback
   * @param {Function} onAlways - callback function
   */
  function ImagesLoaded( elem, options, onAlways ) {
    // coerce ImagesLoaded() without new, to be new ImagesLoaded()
    if ( !( this instanceof ImagesLoaded ) ) {
      return new ImagesLoaded( elem, options );
    }
    // use elem as selector string
    if ( typeof elem === 'string' ) {
      elem = document.querySelectorAll( elem );
    }

    this.elements = makeArray( elem );
    this.options = extend( {}, this.options );

    if ( typeof options === 'function' ) {
      onAlways = options;
    } else {
      extend( this.options, options );
    }

    if ( onAlways ) {
      this.on( 'always', onAlways );
    }

    this.getImages();

    if ( $ ) {
      // add jQuery Deferred object
      this.jqDeferred = new $.Deferred();
    }

    // HACK check async to allow time to bind listeners
    var _this = this;
    setTimeout( function() {
      _this.check();
    });
  }

  ImagesLoaded.prototype = new EventEmitter();

  ImagesLoaded.prototype.options = {};

  ImagesLoaded.prototype.getImages = function() {
    this.images = [];

    // filter & find items if we have an item selector
    for ( var i=0, len = this.elements.length; i < len; i++ ) {
      var elem = this.elements[i];
      // filter siblings
      if ( elem.nodeName === 'IMG' ) {
        this.addImage( elem );
      }
      // find children
      // no non-element nodes, #143
      var nodeType = elem.nodeType;
      if ( !nodeType || !( nodeType === 1 || nodeType === 9 || nodeType === 11 ) ) {
        continue;
      }
      var childElems = elem.querySelectorAll('img');
      // concat childElems to filterFound array
      for ( var j=0, jLen = childElems.length; j < jLen; j++ ) {
        var img = childElems[j];
        this.addImage( img );
      }
    }
  };

  /**
   * @param {Image} img
   */
  ImagesLoaded.prototype.addImage = function( img ) {
    var loadingImage = new LoadingImage( img );
    this.images.push( loadingImage );
  };

  ImagesLoaded.prototype.check = function() {
    var _this = this;
    var checkedCount = 0;
    var length = this.images.length;
    this.hasAnyBroken = false;
    // complete if no images
    if ( !length ) {
      this.complete();
      return;
    }

    function onConfirm( image, message ) {
      if ( _this.options.debug && hasConsole ) {
        console.log( 'confirm', image, message );
      }

      _this.progress( image );
      checkedCount++;
      if ( checkedCount === length ) {
        _this.complete();
      }
      return true; // bind once
    }

    for ( var i=0; i < length; i++ ) {
      var loadingImage = this.images[i];
      loadingImage.on( 'confirm', onConfirm );
      loadingImage.check();
    }
  };

  ImagesLoaded.prototype.progress = function( image ) {
    this.hasAnyBroken = this.hasAnyBroken || !image.isLoaded;
    // HACK - Chrome triggers event before object properties have changed. #83
    var _this = this;
    setTimeout( function() {
      _this.emit( 'progress', _this, image );
      if ( _this.jqDeferred && _this.jqDeferred.notify ) {
        _this.jqDeferred.notify( _this, image );
      }
    });
  };

  ImagesLoaded.prototype.complete = function() {
    var eventName = this.hasAnyBroken ? 'fail' : 'done';
    this.isComplete = true;
    var _this = this;
    // HACK - another setTimeout so that confirm happens after progress
    setTimeout( function() {
      _this.emit( eventName, _this );
      _this.emit( 'always', _this );
      if ( _this.jqDeferred ) {
        var jqMethod = _this.hasAnyBroken ? 'reject' : 'resolve';
        _this.jqDeferred[ jqMethod ]( _this );
      }
    });
  };

  // -------------------------- jquery -------------------------- //

  if ( $ ) {
    $.fn.imagesLoaded = function( options, callback ) {
      var instance = new ImagesLoaded( this, options, callback );
      return instance.jqDeferred.promise( $(this) );
    };
  }


  // --------------------------  -------------------------- //

  function LoadingImage( img ) {
    this.img = img;
  }

  LoadingImage.prototype = new EventEmitter();

  LoadingImage.prototype.check = function() {
    // first check cached any previous images that have same src
    var resource = cache[ this.img.src ] || new Resource( this.img.src );
    if ( resource.isConfirmed ) {
      this.confirm( resource.isLoaded, 'cached was confirmed' );
      return;
    }

    // If complete is true and browser supports natural sizes,
    // try to check for image status manually.
    if ( this.img.complete && this.img.naturalWidth !== undefined ) {
      // report based on naturalWidth
      this.confirm( this.img.naturalWidth !== 0, 'naturalWidth' );
      return;
    }

    // If none of the checks above matched, simulate loading on detached element.
    var _this = this;
    resource.on( 'confirm', function( resrc, message ) {
      _this.confirm( resrc.isLoaded, message );
      return true;
    });

    resource.check();
  };

  LoadingImage.prototype.confirm = function( isLoaded, message ) {
    this.isLoaded = isLoaded;
    this.emit( 'confirm', this, message );
  };

  // -------------------------- Resource -------------------------- //

  // Resource checks each src, only once
  // separate class from LoadingImage to prevent memory leaks. See #115

  var cache = {};

  function Resource( src ) {
    this.src = src;
    // add to cache
    cache[ src ] = this;
  }

  Resource.prototype = new EventEmitter();

  Resource.prototype.check = function() {
    // only trigger checking once
    if ( this.isChecked ) {
      return;
    }
    // simulate loading on detached element
    var proxyImage = new Image();
    eventie.bind( proxyImage, 'load', this );
    eventie.bind( proxyImage, 'error', this );
    proxyImage.src = this.src;
    // set flag
    this.isChecked = true;
  };

  // ----- events ----- //

  // trigger specified handler for event type
  Resource.prototype.handleEvent = function( event ) {
    var method = 'on' + event.type;
    if ( this[ method ] ) {
      this[ method ]( event );
    }
  };

  Resource.prototype.onload = function( event ) {
    this.confirm( true, 'onload' );
    this.unbindProxyEvents( event );
  };

  Resource.prototype.onerror = function( event ) {
    this.confirm( false, 'onerror' );
    this.unbindProxyEvents( event );
  };

  // ----- confirm ----- //

  Resource.prototype.confirm = function( isLoaded, message ) {
    this.isConfirmed = true;
    this.isLoaded = isLoaded;
    this.emit( 'confirm', this, message );
  };

  Resource.prototype.unbindProxyEvents = function( event ) {
    eventie.unbind( event.target, 'load', this );
    eventie.unbind( event.target, 'error', this );
  };

  // -----  ----- //

  return ImagesLoaded;

});
(function(f) {
    if (typeof exports === "object" && typeof module !== "undefined") {
        module.exports = f()
    } else if (typeof define === "function" && define.amd) {
        define([], f)
    } else {
        var g;
        if (typeof window !== "undefined") {
            g = window
        } else if (typeof global !== "undefined") {
            g = global
        } else if (typeof self !== "undefined") {
            g = self
        } else {
            g = this
        }
        g.Share = f()
    }
})(function() {
    var define, module, exports;

    function getStyles(config) {
        return "" + config.selector + " .social.bottom," + config.selector + " .social.top{-webkit-transform-origin:0 0;-moz-transform-origin:0 0;-o-transform-origin:0 0}" + config.selector + "{width:92px;height:20px;-webkit-touch-callout:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}" + config.selector + " [class*=entypo-]:before{font-family:entypo,sans-serif}" + config.selector + " label{font-size:16px;cursor:pointer;margin:0;padding:5px 10px;border-radius:5px;background:#a29baa;color:#333;transition:all .3s ease}" + config.selector + " label:hover{opacity:.8}" + config.selector + " label span{text-transform:uppercase;font-size:.9em;font-family:Lato,sans-serif;font-weight:700;-webkit-font-smoothing:antialiased;padding-left:6px}" + config.selector + " .social{opacity:0;transition:all .4s ease;margin-left:-15px;visibility:hidden}" + config.selector + " .social.top{-ms-transform-origin:0 0;transform-origin:0 0;margin-top:-80px}" + config.selector + " .social.bottom{-ms-transform-origin:0 0;transform-origin:0 0;margin-top:5px}" + config.selector + " .social.middle.left," + config.selector + " .social.middle.right{-ms-transform-origin:5% 50%;transform-origin:5% 50%;-webkit-transform-origin:5% 50%;-moz-transform-origin:5% 50%;-o-transform-origin:5% 50%}" + config.selector + " .social.middle{margin-top:-34px}" + config.selector + " .social.middle.right{margin-left:105px}" + config.selector + " .social.networks-1.center," + config.selector + " .social.networks-1.left," + config.selector + " .social.right{margin-left:14px}" + config.selector + " .social.load{transition:none!important}" + config.selector + " .social.networks-1{width:60px}" + config.selector + " .social.networks-1.middle.left{margin-left:-70px}" + config.selector + " .social.networks-1 ul{width:60px}" + config.selector + " .social.networks-2," + config.selector + " .social.networks-2 ul{width:120px}" + config.selector + " .social.networks-2.center{margin-left:-13px}" + config.selector + " .social.networks-2.left{margin-left:-44px}" + config.selector + " .social.networks-2.middle.left{margin-left:-130px}" + config.selector + " .social.networks-3," + config.selector + " .social.networks-3 ul{width:180px}" + config.selector + " .social.networks-3.center{margin-left:-45px}" + config.selector + " .social.networks-3.left{margin-left:-102px}" + config.selector + " .social.networks-3.middle.left{margin-left:-190px}" + config.selector + " .social.networks-4," + config.selector + " .social.networks-4 ul{width:240px}" + config.selector + " .social.networks-4.center{margin-left:-75px}" + config.selector + " .social.networks-4.left{margin-left:162px}" + config.selector + " .social.networks-4.middle.left{margin-left:-250px}" + config.selector + " .social.networks-5," + config.selector + " .social.networks-5 ul{width:300px}" + config.selector + " .social.networks-5.center{margin-left: -65px}" + config.selector + " .social.networks-5.left{margin-left:-225px}" + config.selector + " .social.networks-5.middle.left{margin-left:-320px}" + config.selector + " .social.active{opacity:1;transition:all .4s ease;visibility:visible}" + config.selector + " .social.active.top{-webkit-transform:scale(1)translateY(-10px);-moz-transform:scale(1)translateY(-10px);-o-transform:scale(1)translateY(-10px);-ms-transform:scale(1)translateY(-10px);transform:scale(1)translateY(-10px)}" + config.selector + " .social.active.bottom{-webkit-transform:scale(1)translateY(15px);-moz-transform:scale(1)translateY(15px);-o-transform:scale(1)translateY(15px);-ms-transform:scale(1)translateY(15px);transform:scale(1)translateY(15px)}" + config.selector + " .social.active.middle.right{-webkit-transform:scale(1)translateX(10px);-moz-transform:scale(1)translateX(10px);-o-transform:scale(1)translateX(10px);-ms-transform:scale(1)translateX(10px);transform:scale(1)translateX(10px)}" + config.selector + " .social.active.middle.left{-webkit-transform:scale(1)translateX(-10px);-moz-transform:scale(1)translateX(-10px);-o-transform:scale(1)translateX(-10px);-ms-transform:scale(1)translateX(-10px);transform:scale(1)translateX(-10px)}" + config.selector + " .social ul{position:relative;left:0;right:0;height:46px;color:#fff;margin:auto;padding:0;list-style:none}" + config.selector + " .social ul li{font-size:20px;cursor:pointer;width:60px;margin:0;padding:12px 0;text-align:center;float:left;display:none;height:22px;position:relative;z-index:2;-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;transition:all .3s ease}" + config.selector + " .social ul li:hover{color:rgba(0,0,0,.5)}" + config.selector + " .social li[class*=facebook]{background:#3b5998;display:" + config.networks.facebook.display + "}" + config.selector + " .social li[class*=twitter]{background:#6cdfea;display:" + config.networks.twitter.display + "}" + config.selector + " .social li[class*=google]{background:#e34429;display:" + config.networks.google_plus.display + "}" + config.selector + " .social li[class*=pinterest]{background:#c5282f;display:" + config.networks.pinterest.display + "}" + config.selector + " .social li[class*=email]{background:#42c5b0;display:" + config.networks.email.display + "}"
    };
    var ShareUtils;

    if ((!("classList" in document.documentElement)) && Object.defineProperty && typeof HTMLElement !== "undefined") {
        Object.defineProperty(HTMLElement.prototype, "classList", {
            get: function() {
                var ret, self, update;
                update = function(fn) {
                    return function(value) {
                        var classes, index;
                        classes = self.className.split(/\s+/);
                        index = classes.indexOf(value);
                        fn(classes, index, value);
                        self.className = classes.join(" ");
                    };
                };
                self = this;
                ret = {
                    add: update(function(classes, index, value) {
                        ~index || classes.push(value);
                    }),
                    remove: update(function(classes, index) {
                        ~index && classes.splice(index, 1);
                    }),
                    toggle: update(function(classes, index, value) {
                        if (~index) {
                            classes.splice(index, 1);
                        } else {
                            classes.push(value);
                        }
                    }),
                    contains: function(value) {
                        return !!~self.className.split(/\s+/).indexOf(value);
                    },
                    item: function(i) {
                        return self.className.split(/\s+/)[i] || null;
                    }
                };
                Object.defineProperty(ret, "length", {
                    get: function() {
                        return self.className.split(/\s+/).length;
                    }
                });
                return ret;
            }
        });
    }

    String.prototype.to_rfc3986 = function() {
        var tmp;
        tmp = encodeURIComponent(this);
        return tmp.replace(/[!'()*]/g, function(c) {
            return "%" + c.charCodeAt(0).toString(16);
        });
    };

    ShareUtils = (function() {
        function ShareUtils() {}

        ShareUtils.prototype.extend = function(to, from, overwrite) {
            var hasProp, prop;
            for (prop in from) {
                hasProp = to[prop] !== undefined;
                if (hasProp && typeof from[prop] === "object") {
                    this.extend(to[prop], from[prop], overwrite);
                } else {
                    if (overwrite || !hasProp) {
                        to[prop] = from[prop];
                    }
                }
            }
        };

        ShareUtils.prototype.hide = function(el) {
            return el.style.display = "none";
        };

        ShareUtils.prototype.show = function(el) {
            return el.style.display = "block";
        };

        ShareUtils.prototype.has_class = function(el, class_name) {
            return el.classList.contains(class_name);
        };

        ShareUtils.prototype.add_class = function(el, class_name) {
            return el.classList.add(class_name);
        };

        ShareUtils.prototype.remove_class = function(el, class_name) {
            return el.classList.remove(class_name);
        };

        ShareUtils.prototype.is_encoded = function(str) {
            str = str.to_rfc3986();
            return decodeURIComponent(str) !== str;
        };

        ShareUtils.prototype.encode = function(str) {
            if (typeof str === "undefined" || this.is_encoded(str)) {
                return str;
            } else {
                return str.to_rfc3986();
            }
        };

        ShareUtils.prototype.popup = function(url, params) {
            var k, popup, qs, v;
            if (params == null) {
                params = {};
            }
            popup = {
                width: 500,
                height: 350
            };
            popup.top = (screen.height / 2) - (popup.height / 2);
            popup.left = (screen.width / 2) - (popup.width / 2);
            qs = ((function() {
                var results;
                results = [];
                for (k in params) {
                    v = params[k];
                    results.push(k + "=" + (this.encode(v)));
                }
                return results;
            }).call(this)).join('&');
            if (qs) {
                qs = "?" + qs;
            }
            return window.open(url + qs, 'targetWindow', "toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,left=" + popup.left + ",top=" + popup.top + ",width=" + popup.width + ",height=" + popup.height);
        };

        return ShareUtils;

    })();
    var Share,
        extend = function(child, parent) {
            for (var key in parent) {
                if (hasProp.call(parent, key)) child[key] = parent[key];
            }

            function ctor() {
                this.constructor = child;
            }
            ctor.prototype = parent.prototype;
            child.prototype = new ctor();
            child.__super__ = parent.prototype;
            return child;
        },
        hasProp = {}.hasOwnProperty;

    Share = (function(superClass) {
        extend(Share, superClass);

        function Share(element1, options) {
            this.element = element1;
            this.el = {
                head: document.getElementsByTagName('head')[0],
                body: document.getElementsByTagName('body')[0]
            };
            this.config = {
                enabled_networks: 0,
                protocol: ['http', 'https'].indexOf(window.location.href.split(':')[0]) === -1 ? 'https://' : '//',
                url: window.location.href,
                caption: null,
                title: this.default_title(),
                image: this.default_image(),
                description: this.default_description(),
                ui: {
                    flyout: 'top center',
                    button_text: 'Share',
                    button_font: true,
                    icon_font: true
                },
                networks: {
                    google_plus: {
                        enabled: true,
                        url: null
                    },
                    twitter: {
                        enabled: true,
                        url: null,
                        description: null
                    },
                    facebook: {
                        enabled: true,
                        load_sdk: true,
                        url: null,
                        app_id: null,
                        title: null,
                        caption: null,
                        description: null,
                        image: null
                    },
                    pinterest: {
                        enabled: true,
                        url: null,
                        image: null,
                        description: null
                    },
                    email: {
                        enabled: true,
                        title: null,
                        description: null
                    }
                }
            };
            this.setup(this.element, options);
            return this;
        }

        Share.prototype.setup = function(element, opts) {
            var i, index, instance, instances, len;
            instances = document.querySelectorAll(element);
            this.extend(this.config, opts, true);
            this.set_global_configuration();
            this.normalize_network_configuration();
            if (this.config.ui.icon_font) {
                //this.inject_icons();
            }
            if (this.config.ui.button_font) {
                //this.inject_fonts();
            }
            if (this.config.networks.facebook.enabled && this.config.networks.facebook.load_sdk) {
                this.inject_facebook_sdk();
            }
            for (index = i = 0, len = instances.length; i < len; index = ++i) {
                instance = instances[index];
                this.setup_instance(element, index);
            }
        };

        Share.prototype.setup_instance = function(element, index) {
            var _this, button, i, instance, label, len, network, networks, results;
            instance = document.querySelectorAll(element)[index];
            this.hide(instance);
            this.add_class(instance, "sharer-" + index);
            instance = document.querySelectorAll(element)[index];
            this.inject_css(instance);
            this.inject_html(instance);
            this.show(instance);
            label = instance.getElementsByTagName("i")[0];
            button = instance.getElementsByClassName("social")[0];
            networks = instance.getElementsByTagName('li');
            this.add_class(button, "networks-" + this.config.enabled_networks);
            label.addEventListener("click", (function(_this) {
                return function() {
                    return _this.event_toggle(button);
                };
            })(this));
            _this = this;
            results = [];
            for (index = i = 0, len = networks.length; i < len; index = ++i) {
                network = networks[index];
                results.push(network.addEventListener("click", function() {
                    _this.event_network(instance, this);
                    return _this.event_close(button);
                }));
            }
            return results;
        };

        Share.prototype.event_toggle = function(button) {
            if (this.has_class(button, "active")) {
                return this.event_close(button);
            } else {
                return this.event_open(button);
            }
        };

        Share.prototype.event_open = function(button) {
            if (this.has_class(button, "load")) {
                this.remove_class(button, "load");
            }
            return this.add_class(button, "active");
        };

        Share.prototype.event_close = function(button) {
            return this.remove_class(button, "active");
        };

        Share.prototype.event_network = function(instance, network) {
            var name;
            name = network.getAttribute("data-network");
            this.hook("before", name, instance);
            this["network_" + name]();
            return this.hook("after", name, instance);
        };

        Share.prototype.open = function() {
            return this["public"]("open");
        };

        Share.prototype.close = function() {
            return this["public"]("close");
        };

        Share.prototype.toggle = function() {
            return this["public"]("toggle");
        };

        Share.prototype["public"] = function(action) {
            var button, i, index, instance, len, ref, results;
            ref = document.querySelectorAll(this.element);
            results = [];
            for (index = i = 0, len = ref.length; i < len; index = ++i) {
                instance = ref[index];
                button = instance.getElementsByClassName("social")[0];
                results.push(this["event_" + action](button));
            }
            return results;
        };

        Share.prototype.network_facebook = function() {
            if (this.config.networks.facebook.load_sdk) {
                if (!window.FB) {
                    return console.error("The Facebook JS SDK hasn't loaded yet.");
                }
                return FB.ui({
                    method: 'feed',
                    name: this.config.networks.facebook.title,
                    link: this.config.networks.facebook.url,
                    picture: this.config.networks.facebook.image,
                    caption: this.config.networks.facebook.caption,
                    description: this.config.networks.facebook.description
                });
            } else {
                return this.popup('https://www.facebook.com/sharer/sharer.php', {
                    u: this.config.networks.facebook.url
                });
            }
        };

        Share.prototype.network_twitter = function() {
            return this.popup('https://twitter.com/intent/tweet', {
                text: this.config.networks.twitter.description,
                url: this.config.networks.twitter.url
            });
        };

        Share.prototype.network_google_plus = function() {
            return this.popup('https://plus.google.com/share', {
                url: this.config.networks.google_plus.url
            });
        };

        Share.prototype.network_pinterest = function() {
            return this.popup('https://www.pinterest.com/pin/create/button', {
                url: this.config.networks.pinterest.url,
                media: this.config.networks.pinterest.image,
                description: this.config.networks.pinterest.description
            });
        };

        Share.prototype.network_email = function() {
            return this.popup('mailto:', {
                subject: this.config.networks.email.title,
                body: this.config.networks.email.description
            });
        };

        Share.prototype.inject_stylesheet = function(url) {
            var link;
            if (!this.el.head.querySelector("link[href=\"" + url + "\"]")) {
                link = document.createElement("link");
                link.setAttribute("rel", "stylesheet");
                link.setAttribute("href", url);
                return this.el.head.appendChild(link);
            }
        };

        Share.prototype.inject_css = function(instance) {
            var css, meta, selector, style;
            selector = "." + (instance.getAttribute('class').split(" ").join("."));
            if (!this.el.head.querySelector("meta[name='sharer" + selector + "']")) {
                this.config.selector = selector;
                css = getStyles(this.config);
                style = document.createElement("style");
                style.type = "text/css";
                if (style.styleSheet) {
                    style.styleSheet.cssText = css;
                } else {
                    style.appendChild(document.createTextNode(css));
                }
                this.el.head.appendChild(style);
                delete this.config.selector;
                meta = document.createElement("meta");
                meta.setAttribute("name", "sharer" + selector);
                return this.el.head.appendChild(meta);
            }
        };

        Share.prototype.inject_html = function(instance) {
            return instance.innerHTML = "<i class='f-1-5x icon-share tr entypo-export'></i><div class='social load " + this.config.ui.flyout + "'><ul><li class='icon-twitter' data-network='twitter'></li><li class='icon-facebook' data-network='facebook'></li><li class='icon-google' data-network='google_plus'></li><li class='icon-email' data-network='email'></li><li class='icon-pinterest' data-network='pinterest'></li></ul></div>";
        };

        Share.prototype.inject_facebook_sdk = function() {
            var fb_root, script;
            if (!window.FB && this.config.networks.facebook.app_id && !this.el.body.querySelector('#fb-root')) {
                script = document.createElement("script");
                script.text = "window.fbAsyncInit=function(){FB.init({appId:'" + this.config.networks.facebook.app_id + "',status:true,xfbml:true})};(function(e,t,n){var r,i=e.getElementsByTagName(t)[0];if(e.getElementById(n)){return}r=e.createElement(t);r.id=n;r.src='" + this.config.protocol + "connect.facebook.net/en_US/all.js';i.parentNode.insertBefore(r,i)})(document,'script','facebook-jssdk')";
                fb_root = document.createElement("div");
                fb_root.id = "fb-root";
                this.el.body.appendChild(fb_root);
                return this.el.body.appendChild(script);
            }
        };

        Share.prototype.hook = function(type, network, instance) {
            var fn, opts;
            fn = this.config.networks[network][type];
            if (typeof fn === "function") {
                opts = fn.call(this.config.networks[network], instance);
                if (opts !== void 0) {
                    opts = this.normalize_filter_config_updates(opts);
                    this.extend(this.config.networks[network], opts, true);
                    this.normalize_network_configuration();
                }
            }
        };

        Share.prototype.default_title = function() {
            var content;
            if (content = document.querySelector('meta[property="og:title"]') || document.querySelector('meta[name="twitter:title"]')) {
                return content.getAttribute('content');
            } else if (content = document.querySelector('title')) {
                return content.innerText;
            }
        };

        Share.prototype.default_image = function() {
            var content;
            if (content = document.querySelector('meta[property="og:image"]') || document.querySelector('meta[name="twitter:image"]')) {
                return content.getAttribute('content');
            }
        };

        Share.prototype.default_description = function() {
            var content;
            if (content = document.querySelector('meta[property="og:description"]') || document.querySelector('meta[name="twitter:description"]') || document.querySelector('meta[name="description"]')) {
                return content.getAttribute('content');
            } else {
                return '';
            }
        };

        Share.prototype.set_global_configuration = function() {
            var display, network, option, options, ref, results;
            ref = this.config.networks;
            results = [];
            for (network in ref) {
                options = ref[network];
                for (option in options) {
                    if (this.config.networks[network][option] == null) {
                        this.config.networks[network][option] = this.config[option];
                    }
                }
                if (this.config.networks[network].enabled) {
                    display = 'block';
                    this.config.enabled_networks += 1;
                } else {
                    display = 'none';
                }
                results.push(this.config.networks[network].display = display);
            }
            return results;
        };

        Share.prototype.normalize_network_configuration = function() {
            if (!this.config.networks.facebook.app_id) {
                this.config.networks.facebook.load_sdk = false;
            }
            if (!this.is_encoded(this.config.networks.twitter.description)) {
                this.config.networks.twitter.description = encodeURIComponent(this.config.networks.twitter.description);
            }
            if (typeof this.config.networks.facebook.app_id === 'number') {
                return this.config.networks.facebook.app_id = this.config.networks.facebook.app_id.toString();
            }
        };

        Share.prototype.normalize_filter_config_updates = function(opts) {
            if (this.config.networks.facebook.app_id !== opts.app_id) {
                console.warn("You are unable to change the Facebook app_id after the button has been initialized. Please update your Facebook filters accordingly.");
                delete opts.app_id;
            }
            if (this.config.networks.facebook.load_sdk !== opts.load_sdk) {
                console.warn("You are unable to change the Facebook load_sdk option after the button has been initialized. Please update your Facebook filters accordingly.");
                delete opts.app_id;
            }
            return opts;
        };

        return Share;

    })(ShareUtils);
    return Share;
});
/**
 * xss-filters - v1.2.2
 * Yahoo! Inc. Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
!function(a,b){function c(a,b,c){return d.yubl(b((c||d.yufull)(a)))}b.xssFilters=a,a._getPrivFilters=function(){function a(a){return a=a.split(x,2),2===a.length&&a[0]?a[0]:null}function b(a,b){return"undefined"==typeof a?"undefined":null===a?"null":b.apply(a.toString(),[].splice.call(arguments,2))}function c(a,c,d,e){c=c||q,d=d||p;var f,h=[].splice.call(arguments,4);return b(a,function(){return f=this.replace(l,"�").replace(d,function(a,b,d,e){return b?(b=Number(b[0]<="9"?b:"0"+b),128===b?"€":130===b?"‚":131===b?"ƒ":132===b?"„":133===b?"…":134===b?"†":135===b?"‡":136===b?"ˆ":137===b?"‰":138===b?"Š":139===b?"‹":140===b?"Œ":142===b?"Ž":145===b?"‘":146===b?"’":147===b?"“":148===b?"”":149===b?"•":150===b?"–":151===b?"—":152===b?"˜":153===b?"™":154===b?"š":155===b?"›":156===b?"œ":158===b?"ž":159===b?"Ÿ":b>=55296&&57343>=b||13===b?"�":g.frCoPt(b)):c[d||e]||a}),e?e.apply(f,h):f})}function d(a){return"\\"+a.charCodeAt(0).toString(16).toLowerCase()+" "}function e(a,b){return c(a,null,null,function(){return this.replace(b,d)})}function f(b,e){return c(b,null,null,function(){var b=g.yufull(this),c=a(b);return b=c&&w[c.toLowerCase()]?"##"+b:b,e?b.replace(e,d):b})}var g,h=/</g,i=/"/g,j=/'/g,k=/&/g,l=/\x00/g,m=/(?:^(?:["'`]|\x00+$|$)|[\x09-\x0D >])/g,n=/[&<>"'`]/g,o=/(?:\x00|^-*!?>|--!?>|--?!?$|\]>|\]$)/g,p=/&(?:#([xX][0-9A-Fa-f]+|\d+);?|(Tab|NewLine|colon|semi|lpar|rpar|apos|sol|comma|excl|ast|midast|ensp|emsp|thinsp);|(nbsp|amp|AMP|lt|LT|gt|GT|quot|QUOT);?)/g,q={Tab:"	",NewLine:"\n",colon:":",semi:";",lpar:"(",rpar:")",apos:"'",sol:"/",comma:",",excl:"!",ast:"*",midast:"*",ensp:" ",emsp:" ",thinsp:" ",nbsp:" ",amp:"&",lt:"<",gt:">",quot:'"',QUOT:'"'},r=/[^%#+\-\w\.]/g,s=/[\x01-\x1F\x7F\\"]/g,t=/[\x01-\x1F\x7F\\']/g,u=/['\(\)]/g,v=/\/\/%5[Bb]([A-Fa-f0-9:]+)%5[Dd]/,w={javascript:1,data:1,vbscript:1,mhtml:1},x=/(?::|&#[xX]0*3[aA];?|&#0*58;?|&colon;)/,y=/(?:^[\x00-\x20]+|[\t\n\r\x00]+)/g,z={Tab:"	",NewLine:"\n"},A=String.prototype.replace,B=String.fromCodePoint||function(a){return 0===arguments.length?"":65535>=a?String.fromCharCode(a):(a-=65536,String.fromCharCode((a>>10)+55296,a%1024+56320))};return g={frCoPt:function(a){return void 0===a||null===a?"":!isFinite(a=Number(a))||0>=a||a>1114111||a>=1&&8>=a||a>=14&&31>=a||a>=127&&159>=a||a>=64976&&65007>=a||11===a||65535===(65535&a)||65534===(65535&a)?"�":B(a)},d:c,yup:function(b){return b=a(b.replace(l,"")),b?c(b,z,null,function(){return this.replace(y,"").toLowerCase()}):null},y:function(a){return b(a,A,n,function(a){return"&"===a?"&amp;":"<"===a?"&lt;":">"===a?"&gt;":'"'===a?"&quot;":"'"===a?"&#39;":"&#96;"})},ya:function(a){return b(a,A,k,"&amp;")},yd:function(a){return b(a,A,h,"&lt;")},yc:function(a){return b(a,A,o,function(a){return"\x00"===a?"�":"--!"===a||"--"===a||"-"===a||"]"===a?a+" ":a.slice(0,-1)+" >"})},yavd:function(a){return b(a,A,i,"&quot;")},yavs:function(a){return b(a,A,j,"&#39;")},yavu:function(a){return b(a,A,m,function(a){return"	"===a?"&#9;":"\n"===a?"&#10;":""===a?"&#11;":"\f"===a?"&#12;":"\r"===a?"&#13;":" "===a?"&#32;":">"===a?"&gt;":'"'===a?"&quot;":"'"===a?"&#39;":"`"===a?"&#96;":"�"})},yu:encodeURI,yuc:encodeURIComponent,yubl:function(a){return w[g.yup(a)]?"x-"+a:a},yufull:function(a){return g.yu(a).replace(v,function(a,b){return"//["+b+"]"})},yublf:function(a){return g.yubl(g.yufull(a))},yceu:function(a){return e(a,r)},yced:function(a){return e(a,s)},yces:function(a){return e(a,t)},yceuu:function(a){return f(a,u)},yceud:function(a){return f(a)},yceus:function(a){return f(a,j)}}};var d=a._privFilters=a._getPrivFilters();a.inHTMLData=d.yd,a.inHTMLComment=d.yc,a.inSingleQuotedAttr=d.yavs,a.inDoubleQuotedAttr=d.yavd,a.inUnQuotedAttr=d.yavu,a.uriInSingleQuotedAttr=function(a){return c(a,d.yavs)},a.uriInDoubleQuotedAttr=function(a){return c(a,d.yavd)},a.uriInUnQuotedAttr=function(a){return c(a,d.yavu)},a.uriInHTMLData=d.yufull,a.uriInHTMLComment=function(a){return d.yc(d.yufull(a))},a.uriPathInSingleQuotedAttr=function(a){return c(a,d.yavs,d.yu)},a.uriPathInDoubleQuotedAttr=function(a){return c(a,d.yavd,d.yu)},a.uriPathInUnQuotedAttr=function(a){return c(a,d.yavu,d.yu)},a.uriPathInHTMLData=d.yu,a.uriPathInHTMLComment=function(a){return d.yc(d.yu(a))},a.uriQueryInSingleQuotedAttr=a.uriPathInSingleQuotedAttr,a.uriQueryInDoubleQuotedAttr=a.uriPathInDoubleQuotedAttr,a.uriQueryInUnQuotedAttr=a.uriPathInUnQuotedAttr,a.uriQueryInHTMLData=a.uriPathInHTMLData,a.uriQueryInHTMLComment=a.uriPathInHTMLComment,a.uriComponentInSingleQuotedAttr=function(a){return d.yavs(d.yuc(a))},a.uriComponentInDoubleQuotedAttr=function(a){return d.yavd(d.yuc(a))},a.uriComponentInUnQuotedAttr=function(a){return d.yavu(d.yuc(a))},a.uriComponentInHTMLData=d.yuc,a.uriComponentInHTMLComment=function(a){return d.yc(d.yuc(a))},a.uriFragmentInSingleQuotedAttr=function(a){return d.yubl(d.yavs(d.yuc(a)))},a.uriFragmentInDoubleQuotedAttr=function(a){return d.yubl(d.yavd(d.yuc(a)))},a.uriFragmentInUnQuotedAttr=function(a){return d.yubl(d.yavu(d.yuc(a)))},a.uriFragmentInHTMLData=a.uriComponentInHTMLData,a.uriFragmentInHTMLComment=a.uriComponentInHTMLComment}({},function(){return this}());
'use strict';


// defining 
window.app = window.app === undefined ? {} : window.app;

// setting up commonly used vars
app.vent = $({});
app.$document = $(document);
app.$window = $(window);
app.$body = $('body');
app.pagename = $('#panel').data('page-name');
//app.currentLocation = {full_address: '', country: '', lat: '', lng: ''};
//app.searchedLocation = {full_address: '', country: '', lat: '', lng: ''};


/*setting location 
*/
/*  var geocoder;
  
  var options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
  };

  function success(pos) {
    var crd = pos.coords;
    var lat = crd.latitude;
    var lng = crd.longitude;
    codeLatLng(lat, lng);
    app.currentLocation.lat = lat;
    app.currentLocation.lng = lng;

  };

  function error(err) {
  };

  navigator.geolocation.getCurrentPosition(success, error, options);

  function initialize() {
     geocoder = new google.maps.Geocoder();
   }

  function codeLatLng(lat, lng) {

    var latlng = new google.maps.LatLng(lat, lng);
    geocoder.geocode({'latLng': latlng}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
         //find country name
          for (var i=0; i<results[0].address_components.length; i++) {
            for (var b=0;b<results[0].address_components[i].types.length;b++) {

             //there are different types that might hold a city admin_area_lvl_1 usually does in come cases looking for sublocality type will be more appropriate
              if (results[0].address_components[i].types[b] == "political") {
                 //this is the object you are looking for
                city= results[0].address_components[i];
                break;
              }
            }
          }
         //city data
          app.currentLocation.country = city.long_name;
          app.currentLocation.full_address = results[1].formatted_address; 

        } else {
          console.log('no results for location');
        }
      } else {
        console.log("Geocoder failed due to: " + status);
      }
    });
  }

   initialize();

*/




// ovverriding navigator for cross browser stuff
navigator.getUserMedia = navigator.getUserMedia ||
                        navigator.webkitGetUserMedia ||
                        navigator.mozGetUserMedia ||
                        navigator.msGetUserMedia;

// defining BEHAVIORS - methods in browser/behaviors
app.behaviors = app.behaviors === undefined ? {} :  app.behaviors;

// defining COMPONENTS - methods in browser/components
app.components = app.components === undefined ? {} : app.components;

// defining UTILITIES - methods in browser/utils
app.utils = app.utils === undefined ? {} : app.utils;

// app in memory cache
app.cache = {};

app.requestArgs = {};

// use this instead of $.ajax
// performs some utility functions too
app.utils.ajax = function (method, url, params) {
  params = params === undefined ? {} : params;
  params.method = method;
  params.url = url;

  NProgress.start();
  app.utils.internet();

  return $.ajax(params).always(function (argOne, status, argThree) {

     NProgress.done();

    if (status === 'success') {
      var data = argOne;
      var xhr = argThree;
      var err = undefined;
    } else if (status === 'error') {
      var data = undefined;
      var xhr = argOne;
      var err = argThree;
    }

    // handle authentication modal
    if (xhr.status === 401) {

      if (url === '/modal/review') {
        params.modalId = "#reviewModal";
      }
      app.utils.requestSerializer(method, url, params);
      app.utils.loadModal('#authModal', '/modal/auth');
    }

    // handle behavior for changing nav automatically
    if (method === 'GET' && data && data.nav && typeof(data.nav) === 'string') {
      $('#nav').html(data.nav);
    }

    if (method === 'GET' && data && data.panel && typeof(data.panel) === 'string') {
      $('#panel').html(data.panel)
    }
  });
};

// adding utility methods to app.utils.ajax
['GET', 'PUT', 'POST', 'DELETE'].forEach(function (method) {
  app.utils.ajax[method.toLowerCase()] = function (url, params) {
    return app.utils.ajax(method, url, params);
  };
});

// get current page url
app.utils.currentUrl = function (withSearch) {
    var urlParts = [location.protocol, '//', location.host, location.pathname];
    if (withSearch === true) {
        return urlParts.concat([location.search]).join('');
    } else {
        return urlParts.join('');
    }
};

// get website domain
app.utils.domain = function () {
    return [location.protocol, '//', location.host].join('');
};

app.utils.site = function (path) {
    return [location.protocol, '//', location.host, '/', path].join('');
};

app.utils.runningVideos = [];

app.utils.preloaderHtml = function () {
  return (
    '<div class="row text-center">'+
      '<div class="div col-sm-12">'+
        '<div class="preloader-wrapper small active">'+
              '<div class="spinner-layer spinner-blue">'+
                '<div class="circle-clipper left">'+
                  '<div class="circle"></div>'+
                '</div>'+
                '<div class="gap-patch">'+
                  '<div class="circle"></div>'+
                '</div>'+
                '<div class="circle-clipper right">'+
                  '<div class="circle"></div>'+
                '</div>'+
              '</div>'+

              '<div class="spinner-layer spinner-red">'+
                '<div class="circle-clipper left">'+
                  '<div class="circle"></div>'+
                '</div>'+
                '<div class="gap-patch">'+
                  '<div class="circle"></div>'+
               ' </div>'+
                '<div class="circle-clipper right">'+
                  '<div class="circle"></div>'+
                '</div>'+
              '</div>'+

              '<div class="spinner-layer spinner-yellow">'+
                '<div class="circle-clipper left">'+
                  '<div class="circle"></div>'+
                '</div>'+
                '<div class="gap-patch">'+
                  '<div class="circle"></div>'+
                '</div>'+
                '<div class="circle-clipper right">'+
                  '<div class="circle"></div>'+
                '</div>'+
              '</div>'+

              '<div class="spinner-layer spinner-green">'+
                '<div class="circle-clipper left">'+
                  '<div class="circle"></div>'+
                '</div>'+
                '<div class="gap-patch">'+
                  '<div class="circle"></div>'+
                '</div>'+
                '<div class="circle-clipper right">'+
                  '<div class="circle"></div>'+
                '</div>'+
              '</div>'+
            '</div>'+
    '</div>'
  );
};

// setting up commonly used functions
app.utils.$elInViewport = function ($el) {
    var el = $el.get(0);

    var top = el.offsetTop;
    var left = el.offsetLeft;
    var width = el.offsetWidth;
    var height = el.offsetHeight;
    while (el.offsetParent) {
        el = el.offsetParent;
        top += el.offsetTop;
        left += el.offsetLeft;
    }
    //console.log('top'+top+'left'+left+'width'+width+'height'+height);
    //console.log('wtop'+window.pageYOffset+'wleft'+window.pageXOffset+'Wwidth'+window.innerWidth+'wheight'+window.innerHeight);
    return (
        top >= window.pageYOffset &&
        left >= window.pageXOffset &&
        (top + height) <= (window.pageYOffset + window.innerHeight) &&
        (left + width) <= (window.pageXOffset + window.innerWidth)
    );
};

// check if $el was removed
app.utils.$elRemoved = function (domNodeRemovedEvent, $el) {
    var $evTarget = $(domNodeRemovedEvent.target);

    return $evTarget.get(0) === $el.get(0) || $.contains($evTarget.get(0), $el.get(0));
};

app.utils.loadingBtn = function (id, d) {
    var ID = $('#' + id);
    var org = ID.text();
    var orgVal = ID.val();
    ID.val("Processing...");
    ID.text("Processing...");
    ID.addClass('loading disabled');
    //var ref=this;
    if (d != 0) {
        setTimeout(function () {
            ID.removeClass('loading disabled');
            ID.text(org);
            //ID.val(orgVal);
        }, d * 1000);
    }
};

app.utils.loadingBtnStop = function (id, value, result) {
    var org = value;
    var ID = $('#' + id);
    ID.removeClass('loading').val(org);
    if (result == 'success') {
        app.utils.notify('Your question was asked successfully', 'success', 2);
    } else {
        app.utils.notify('{{error code}} Error message from server', 'error', 2);
    }
};

app.utils.notify = function (text, type, duration) {

    $('#alert-box').fadeIn().html('<div class="text-center alert alert-' + type +'">' + text + ' <a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a></div>').css({
      'z-index': 1040,
      position: 'fixed',
      top: 50 + 'px',
      width: 100 + '%'});

    //Types are: danger, success, warning, info  (default classes of bootstrap)
    if (duration != 0) {
        setTimeout(function () {
            $('#alert-box').fadeOut().html('loading <a href="#" class="close">&times;</a>');
        }, duration * 1000);
    }
    /*$(document).on('close.alert', function (event) {
        $('#alert-hook').html('<div data-alert id="alert-box" class="alert-box-wrapper alert-box alert radius" style="display:none;"> Loading... <a href="#" class="close">&times;</a> </div>');
    });*/
};

app.utils.notifyLogin = function (text, type, duration) {


    $('#alert-hook2').fadeIn();
    $('#alert-box2').fadeIn().addClass(type).html(text + '<a href="#" class="close">&times;</a>');

    // Types are: alert, success, warning, info
    if (duration != 0) {
        setTimeout(function () {
            $('.alert-box').removeClass(type).fadeOut().html('loading <a href="#" class="close">&times;</a>');
        }, duration * 1000);
    }
    $(document).on('close.alert', function (event) {
        $('#alert-hook2').html('<div data-alert id="alert-box" class=" alert-box alert radius" style="display:none;"> Loading... <a href="#" class="close">&times;</a> </div>');
    });
};


app.utils.internet = function () {
    //console.log('connectivty being monitored');
    window.addEventListener("offline", function (e) {
        app.utils.notify('internet connectivty lost. Please check your connection.', 'warning', 0);
    }, false);

    window.addEventListener("online", function (e) {
        app.utils.notify('internet connectivty restored', 'success', 3);
    }, false);
};

app.utils.redirectTo = function (path) {
    window.location.href = app.utils.domain() + path;
};

app.utils.reloadNavAndPanel = function () {
    app.utils.ajax.get(app.utils.currentUrl(true), {
        data: {
            partials: ['nav', 'panel']
        }
    }).then(function (data) {
        var el = document.createElement('div');
        el.innerHTML = data;
        var $el = $(el);
        app.$body.find('#nav').html($el.find('#nav').html());
        app.$body.find('#panel').html($el.find('#panel').html());

        // app.$body.find('#nav').html(data.nav);
        // app.$body.find('#panel').html(data.panel);
    });
};

app.utils.reloadPanel = function () {
    NProgress.start();
    app.utils.ajax.get(app.utils.currentUrl(true), {
        data: {
            partials: ['panel']
        }
    }).then(function (data) {
        NProgress.done();
        app.$body.find('#panel').empty().html(data.panel);
    });
};
app.utils.reloadNavOnly = function () {
    NProgress.start();
    app.utils.ajax.get(app.utils.currentUrl(true), {
        data: {
            partials: ['nav']
        }
    }).then(function (data) {
        NProgress.done();
        app.$body.find('#nav').html(data.nav);
    });
};

app.utils.btnStateChange = function (button, message, disabled) {
    var $button = button;
    var imgHtml = '<span class="has-spinner inBtnState">' +
        '<span class="spinner "><i class="icon-spin icon-refresh"></i></span></span>'


    if (disabled) {
        $button.addClass('fullbtn');
        $button.html(imgHtml);
        var $inBtnState = $button.find('.inBtnState');
        $inBtnState.html(message);

        $button.addClass('disabled');
    } else {
        $button.removeClass('fullbtn');
        $button.removeClass('disabled');
        $button.html(message);
    }

};

app.utils.btnUpvoteState = function (button, message, disabled) {
    var $button = button;
    var imgHtml = '<img src="/img/preloader.gif" class="left"/>' +
        '<div class="inBtnState">' +
        '</div>';


    if (disabled) {
        $button.addClass('fullbtn');
        $button.html(imgHtml);
        var $inBtnState = $button.find('.inBtnState');
        $inBtnState.html(message);

        $button.addClass('disabled');
    } else {
        $button.removeClass('fullbtn');
        $button.removeClass('disabled');
        $button.html(message);
    }

};

app.utils.requestSerializer = function (method, url, params) {
    app.requestArgs.method = method;
    app.requestArgs.url = url;
    app.requestArgs.params = params;
}

app.utils.requestDeserializer = function (args) {
    if (args.params) {
        app.utils.loadModal(args.params.modalId, args.url);
        args.params = {};
    } else {
        app.utils.ajax(args.method, args.url, args.params);
        app.utils.reloadNavAndPanel();
    }
}


app.utils.getFormData = function ($form) {
    var formData = {};
    var $inputEl = $form.find(":input").not("[type='submit']").not("[type='reset']");
    var $input = $inputEl;
    $input.each(function () {
        var thisInput = $(this);
        if (thisInput.attr("type") == "radio") {
            thisInput = thisInput.not(":not(:checked)");
        }
        var value = thisInput.val();
        formData[thisInput.attr("name")] = value ^ 0 === value ? parseInt(value) : value;
        // I can't decide whether to use data and value, name and value, or id and value or other combinations to take input data
    });
    delete formData['undefined'];
    return formData;
};


app.utils.goToByScroll = function (el) {
    $('body').animate({
            scrollTop: el.offsetTop
        },
        'slow');
};


/*app.utils.gallery = function(urls) {

    var pswpElement = document.querySelectorAll('.pswp')[0];

    // build items array
    var items = [];

    _.forEach(urls, function(url){
        items.push({
            src: 'sitecom/unsafe/fit-in/800x600/' + url.replace(/^https:\/\//i, 'http://'),
            w: 2400,
            h: 1800
        })
    });

    // define options (if needed)
    var options = {
        // optionName: 'option value'
        // for example:
        index: 0, // start at first slide
        showAnimationDuration : 333,
        closeOnScroll: false
    };

    // Initializes and opens PhotoSwipe

    var gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options);
    gallery.init();
}*/


app.utils.expandTextarea = function ($textarea) {
/*  var $element = $textarea.get(0);
  var height;*/
  var initHeight;

  $textarea.on('click', function(e){
    initHeight = $textarea.outerHeight();

    // Textarea Auto Resize
    var hiddenDiv = $('.hiddendiv').first();
    if (!hiddenDiv.length) {
      hiddenDiv = $('<div class="hiddendiv common"></div>');
      $('body').append(hiddenDiv);
    }
    var text_area_selector =  $textarea; //'.materialize-textarea';

    function textareaAutoResize($textarea) {
      // Set font properties of hiddenDiv

      var fontFamily = $textarea.css('font-family');
      var fontSize = $textarea.css('font-size');

      if (fontSize) { hiddenDiv.css('font-size', fontSize); }
      if (fontFamily) { hiddenDiv.css('font-family', fontFamily); }

      if ($textarea.attr('wrap') === "off") {
        hiddenDiv.css('overflow-wrap', "normal")
                 .css('white-space', "pre");
      }




      hiddenDiv.text($textarea.val() + '\n');
      var content = hiddenDiv.html().replace(/\n/g, '<br>');
      hiddenDiv.html(content);


      // When textarea is hidden, width goes crazy.
      // Approximate with half of window size

      if ($textarea.is(':visible')) {
        hiddenDiv.css('width', $textarea.width());
      }
      else {
        hiddenDiv.css('width', $(window).width()/2);
      }

      $textarea.css({height: hiddenDiv.height(), overflow: 'hidden'});
    }

    $(text_area_selector).each(function () {
      var $textarea = $(this);
      if ($textarea.val().length) {
        textareaAutoResize($textarea);
      }
    });

    $textarea.on('keyup keydown autoresize', text_area_selector, function () {
      if ($textarea.get(0).scrollHeight > initHeight) {
        textareaAutoResize($(this));

      };
    });



  });

 /* $textarea.on('keyup', function(e) {
      //$element.style.overflow = 'hidden';
      //$element.style.height = $element.scrollHeight + 'px';
      if (e.keyCode == 13) {
        height = $textarea.outerHeight() + 20;
      } else {
        height = $element.scrollHeight;

          var textLines = $(this).html().trim().split(/\r*\n/).length;
          var textHeight = (textLines*17);
          if (textHeight > initHeight) {
            height = textHeight + 5;
          } else {
            height = initHeight;
          };
      }
      $textarea.css({overflow: 'hidden', height: height + 'px'});
  });*/



}


app.utils.scrollLock = function(arr){
  _.forEach(arr, function(el){
      var $el = $(el);
      var $div = $el.parent();

      var divHeight = $div.outerHeight();
      var width = $div.parent().width();
      var top = $div.parent().offset().top;
      var left = $div.offset().left;
      var totalHeight = top + divHeight;
      var diffHeight = totalHeight - app.$window.height();
      var cssTop = divHeight < app.$window.height() ? 50 : (top - diffHeight);

      if (app.$window.scrollTop() > top ) {
        if (!($div.hasClass('stop-scroll'))) {
          $div.addClass('stop-scroll').css({top: cssTop, left: left, width: width});
        }
      }else {
        $div.removeClass('stop-scroll');
      };
    });

    }

app.utils.getPartial = function (url, partial, $parent) {
      var data = {
        partials: [partial],
      }
      $parent.html(app.utils.preloaderHtml());
      app.utils.ajax.get(url, {
        data
      }).then(function (data) {
        var el = document.createElement('div');
        el.innerHTML = data[partial];
        if ($(el).html().trim() !=  '') {
          if ($parent) {
            $parent.html($(el).html());
            //console.log($(el).html(), $parent);
          } else {
            //app.$body.find('#panel').html($(el).find('#panel').html());
          }
        } else {
          toastr.error('server error 500', 'try refreshing page !');
        };
      }, function (err) {
          toastr.error('loading failed', 'oops !');
      });
  };

  app.utils.SmoothlyMenu = function () {
      if (!$('body').hasClass('mini-navbar') || $('body').hasClass('body-small')) {
          // Hide menu in order to smoothly turn on when maximize menu
          $('#side-menu').hide();
          // For smoothly turn on menu
          setTimeout(
              function () {
                  $('#side-menu').fadeIn(500);
              }, 100);
      } else if ($('body').hasClass('fixed-sidebar')) {
          $('#side-menu').hide();
          setTimeout(
              function () {
                  $('#side-menu').fadeIn(500);
              }, 300);
      } else {
          // Remove all inline style from jquery fadeIn function to reset menu state
          $('#side-menu').removeAttr('style');
      }
  };

  app.utils.scrollToDiv = function ($div) {
    app.$body.animate({
      scrollTop: $div.offset().top
    }, 2000);
  };

// app.utils.graph = function($graph){
// 					//
// 	        // setTimeout(function() {
// 	        //     toastr.options = {
// 	        //         closeButton: true,
// 	        //         progressBar: true,
// 	        //         showMethod: 'slideDown',
// 	        //         timeOut: 4000
// 	        //     };
// 	        //     toastr.success('The Ressponsive Theme', 'Welcome to Dashboard');
// 					//
// 	        // }, 1300);
//
//
// 	        var data1 = [
// 	            [0,4],[1,8],[2,5],[3,10],[4,4],[5,16],[6,5],[7,11],[8,6],[9,11],[10,30],[11,10],[12,13],[13,4],[14,3],[15,3],[16,6]
// 	        ];
// 	        var data2 = [
// 	            [0,1],[1,0],[2,2],[3,0],[4,1],[5,3],[6,1],[7,5],[8,2],[9,3],[10,2],[11,1],[12,0],[13,2],[14,8],[15,0],[16,0]
// 	        ];
// 	        $("#flot-dashboard-chart").length && $.plot($("#flot-dashboard-chart"), [
// 	            data1, data2
// 	        ],
// 	                {
// 	                    series: {
// 	                        lines: {
// 	                            show: false,
// 	                            fill: true
// 	                        },
// 	                        splines: {
// 	                            show: true,
// 	                            tension: 0.4,
// 	                            lineWidth: 1,
// 	                            fill: 0.4
// 	                        },
// 	                        points: {
// 	                            radius: 0,
// 	                            show: true
// 	                        },
// 	                        shadowSize: 2
// 	                    },
// 	                    grid: {
// 	                        hoverable: true,
// 	                        clickable: true,
// 	                        tickColor: "#d5d5d5",
// 	                        borderWidth: 1,
// 	                        color: '#d5d5d5'
// 	                    },
// 	                    colors: ["#1ab394", "#464f88"],
// 	                    xaxis:{
// 	                    },
// 	                    yaxis: {
// 	                        ticks: 4
// 	                    },
// 	                    tooltip: false
// 	                }
// 	        );
//
// 	        var doughnutData = [
// 	            {
// 	                value: 300,
// 	                color: "#a3e1d4",
// 	                highlight: "#1ab394",
// 	                label: "App"
// 	            },
// 	            {
// 	                value: 50,
// 	                color: "#dedede",
// 	                highlight: "#1ab394",
// 	                label: "Software"
// 	            },
// 	            {
// 	                value: 100,
// 	                color: "#b5b8cf",
// 	                highlight: "#1ab394",
// 	                label: "Laptop"
// 	            }
// 	        ];
//
// 	        var doughnutOptions = {
// 	            segmentShowStroke: true,
// 	            segmentStrokeColor: "#fff",
// 	            segmentStrokeWidth: 2,
// 	            percentageInnerCutout: 45, // This is 0 for Pie charts
// 	            animationSteps: 100,
// 	            animationEasing: "easeOutBounce",
// 	            animateRotate: true,
// 	            animateScale: false
// 	        };
//
// 	       /* var ctx = document.getElementById("doughnutChart").getContext("2d");
// 	        var DoughnutChart = new Chart(ctx).Doughnut(doughnutData, doughnutOptions);
//
// 	        var polarData = [
// 	            {
// 	                value: 300,
// 	                color: "#a3e1d4",
// 	                highlight: "#1ab394",
// 	                label: "App"
// 	            },
// 	            {
// 	                value: 140,
// 	                color: "#dedede",
// 	                highlight: "#1ab394",
// 	                label: "Software"
// 	            },
// 	            {
// 	                value: 200,
// 	                color: "#b5b8cf",
// 	                highlight: "#1ab394",
// 	                label: "Laptop"
// 	            }
// 	        ];*/
//
// 	        var polarOptions = {
// 	            scaleShowLabelBackdrop: true,
// 	            scaleBackdropColor: "rgba(255,255,255,0.75)",
// 	            scaleBeginAtZero: true,
// 	            scaleBackdropPaddingY: 1,
// 	            scaleBackdropPaddingX: 1,
// 	            scaleShowLine: true,
// 	            segmentShowStroke: true,
// 	            segmentStrokeColor: "#fff",
// 	            segmentStrokeWidth: 2,
// 	            animationSteps: 100,
// 	            animationEasing: "easeOutBounce",
// 	            animateRotate: true,
// 	            animateScale: false
// 	        };
// 	   /*     var ctx = document.getElementById("polarChart").getContext("2d");
// 	        var Polarchart = new Chart(ctx).PolarArea(polarData, polarOptions);*/
//
//
// };

// modal bg-z-index
app.utils.modalBgZIndex = 1050;

// load a particular modal via its selector
// optionally provide html via a url
// and run an optional callback on completion
app.utils.loadModal = function (selector, url, callback, stacked) {
  // modals stack by default, ie. more than one modals can open at a time
  var stacked = stacked === false ? false : true;

  var modalLoader = function () {
    callback = typeof(callback) === 'function' ? callback : function () { };

    // if selector provided is an instance of jquery, then that is our modal
    // otherwise we try to find the modal using jquery
    var $modal = selector instanceof $ ? selector : $(selector);
    // if the modal provided is not one single modal, do nothing
    if ($modal.length !== 1) return;

    // attach and animate modal bg if it is not loaded already
    var $modalBg = $('div.modal-backdrop');
    if ($modalBg.length === 0) {
      //$modalBg = $($.parseHTML('<div class="modal-backdrop" style="display: none;"></div>'));
      app.$body.append($modalBg);
      $modalBg.css({zIndex: app.utils.modalBgZIndex}).fadeIn(200);
    }

    var openModal = function () {
      // get modalIndex
      var modalIndex = $('div.modal.open').length + 1;

      // hook in the modal closer
      $modal.modal('show');
      //$modal.find('i.icon-close').on('click', function () { app.utils.unloadModal($modal); });
      $modal.addClass('open');

      // open the modal
      /*$modal.css('top', '50px');*/
      $modal.animate(
        {
          opacity: 1
        }, 
        {
          complete: function () {
            app.vent.trigger('modal.opened', $modal);
            callback();
          }
        }
      );
    };

    if (url === undefined || url === null) {
      openModal();
    } else {
      app.utils.ajax.get(url).then(function (html) {
        $modal.html(html);
        openModal();        
      });
    }

    // close modal on clicking modal bg
    $modalBg.on('click', app.utils.unloadOpenModals);
  };

  // if the loadModal call is not stacked, then unloadOpenModals before
  // loading our target modal. Otherwise just load our modal
  if (! stacked) {
    app.utils.unloadOpenModals(modalLoader);
  } else {
    modalLoader();
  }
};

// unload $modal
app.utils.unloadModal = function ($modal, callback) {
  callback = typeof(callback) === 'function' ? callback : function () { };

  if ($modal.length > 0) {
    $modal.animate(
      {},
      {
        done: function () {
          $modal.removeClass('open');
          $modal.modal('hide');
          var $openModals = $('div.modal.open');
          if ($openModals.length === 0) {
            var $modalBg = $('div.modal-backdrop');
            $modalBg.fadeOut(200, function () {
              $modalBg.remove();
            });
          }
          app.vent.trigger('modal.closed', $modal[0]);
          callback();
        }
      }
    );
  } else {
    callback();
  }
};

// unload already opened modal and call a callback
app.utils.unloadOpenModals = function (callback) {
  callback = typeof(callback) === 'function' ? callback : function () { };

  var $modals = $('div.modal.open');

  app.utils.unloadModal($modals, callback);
}

// close any open modal escape key press event
app.$document.on('keyup', function (ev) {
  if (ev.keyCode === 27) {
    app.utils.unloadOpenModals();
  }
});
app.behaviors.global = function () {

  /**
   * top level search box
   */
  var headerHeight = $('.navbar').outerHeight();
  var marNegSearch = 200; //parseInt($('.search-box-banner').css('top'));
  var calc = headerHeight + marNegSearch;
  var scrollTop = app.$window.scrollTop();
      if (scrollTop > 200 || app.pagename == 'profile') {
        $('.search-box-nav').show();
        //$('.search-box-banner').removeClass('search');
        $('.mobile-brand-logo').hide();
      }


  app.$document.ready(function(){
    app.pagename = $('#panel').data('page-name');
    if (app.pagename === 'homepage') {
      app.utils.scrollLock($('.scroll-lock'));
    };


  });

  app.$window.on("scroll", function(e) {
    var scrollTop = app.$window.scrollTop();
        if (scrollTop > 200 || app.pagename == 'profile' /*calc/2*/) {
            $('.search-box-nav').show();
            //$('.search-box-banner').removeClass('search');
            $('.mobile-brand-logo').hide();


        } else {
            $('.search-box-nav').hide();
            //$('.search-box-banner').addClass('search');
            $('.mobile-brand-logo').show();

        }

    if (app.pagename === 'homepage') {
      app.utils.scrollLock($('.scroll-lock'));
    };


  });

  var navbarHeight = $('.navbar').height();

$(window).scroll(function() {
  var navbarColor = "62,195,246";//color attr for rgba
  var smallLogoHeight = $('.small-logo').height();
  var bigLogoHeight = $('.big-logo').height();


  var smallLogoEndPos = 0;
  var smallSpeed = (smallLogoHeight / bigLogoHeight);

  var ySmall = ($(window).scrollTop() * smallSpeed);

  var smallPadding = navbarHeight - ySmall;
  if (smallPadding > navbarHeight) { smallPadding = navbarHeight; }
  if (smallPadding < smallLogoEndPos) { smallPadding = smallLogoEndPos; }
  if (smallPadding < 0) { smallPadding = 0; }

  $('.small-logo-container ').css({ "padding-top": smallPadding});

  var navOpacity = ySmall / smallLogoHeight;
  if  (navOpacity > 1) { navOpacity = 1; }
  if (navOpacity < 0 ) { navOpacity = 0; }
  var navBackColor = 'rgba(' + navbarColor + ',' + navOpacity + ')';
  $('.navbar').css({"background-color": navBackColor});

  var shadowOpacity = navOpacity * 0.4;
  if ( ySmall > 1) {
    $('.navbar').css({"box-shadow": "0 2px 3px rgba(0,0,0," + shadowOpacity + ")"});
  } else {
    $('.navbar').css({"box-shadow": "none"});
  }



});


};

$(function(){
  app.behaviors.global();
});

app.behaviors.initAutocomplete = function () {
    var placeSearch, autocomplete;
    var searchBox = $('.search input')[0];
    var searchBtn = $('.search button')[0];
    
    $(searchBox).on('click', function (ev){
        var $parent = $(this).parent();
        if ($parent.hasClass('has-error')) {
            $(this).attr('placeholder', 'Search Place or Address');
            $parent.removeClass('has-error');
        };
    });

/*    $(searchBtn).on('click',  function (ev) {
        ev.preventDefault();
        getSearchResult();
    });*/
    
    autocomplete = new google.maps.places.Autocomplete(
        /** @type {!HTMLInputElement} */
        (searchBox), {
            types: ['geocode']
        });


    var getSearchResult = function () {
        var place = autocomplete.getPlace();
        app.utils.ajax.get('/', {
                    data: {
                        lat: place.geometry.location.lat(),
                        lon: place.geometry.location.lng(),
                        partials: ['reviewHolder']
                    },
                })
                .then(function (data) {
                        var el = document.createElement('div');
                        el.innerHTML = data.reviewHolder;
                        var $feedDiv = $(el).find('.feed');
                        
                        if ($.trim($feedDiv.html()) == '') {
                            $(searchBox).val('');
                            $(searchBox).attr('placeholder', 'Sorry No Results available for your selected location');
                            $(searchBox).parent().addClass('has-error');
                        } else {
                            $('.review-holder').slideUp('fast');
                            $('.review-holder').find('.feed').empty().append($feedDiv.html());
                            $('.review-holder').slideDown('slow');
                        }
                        //app.utils.btnStateChange($searchBtn, "Search", false);
                    },
                    function (err) {
                        console.log(err);
                    });
    };

    // When the user selects an address from the dropdown, populate the address
    // fields in the form.
    autocomplete.addListener('place_changed', getSearchResult);
};


/*$(function(){
  app.behaviors.initAutocomplete();
});*/    
app.components.fourOfourHandler = function($loginBtn) {


  $loginBtn.on('click', function (ev) {
    app.utils.loadModal('#authModal', '/modal/auth');
  });
};
app.components.assetForm = function ($formDiv) {
  var $assetForm = $formDiv.find('form');
  //var $addWidgetsBtn = $pan.find('.add-widgets-btn');
  //var $goalForm = $('#goal-form');
  //var $assetForm = $('#asset-form');

  $assetForm.on('submit', function (ev) {
    ev.preventDefault();
    var $this = $(this);
    console.log('submit start');
    console.log(app.utils.getFormData($this));




    var formData = {
      //username: $username.val(),
      //full_name: $userFullName.val(),
      //email: $userEmail.val(),
      //password: $userPassword.val(),
      //details: {}
      //
      // "id": 17,
      // "name": "loan",
      // "product_category_id": 8,
      // "meta": null,
      // "value": 30000,
      // "type": "liability",
      };

    //formData.details = app.utils.getFormData($detailsForm);



    formData = app.utils.getFormData($this);
    var url = '/addasset';//$this.data('url');

    //console.log('for details: ', formData);
    app.utils.ajax.post(url  , {
      data: {
          name: formData.name,
          asset_category: $formDiv.data('category'),
          type: $formDiv.data('type'),
          value: formData.value,
          meta: formData.meta,
      }
    })
    .then(function (data) {
      console.log(data);
      var $tabContent = app.$body.find('#tab-content')
      app.utils.getPartial('/profile', 'assetsPan', $tabContent)
      app.utils.getPartial('/profile', 'userProfileCard', $('#profile-card-container'))

      //$('a[href^=' + '#assets' + ']').click();
      toastr.success('Success !!', 'success', 5);

      //authSuccess();
      //app.utils.reloadNavAndPanel();

    },
    function (res) {
      toastr.error('oops', JSON.stringify(res.status));

    });


        return false;

  });




//step form

var $stepNextBtn = $formDiv.find('.step-next-btn');
var $stepNext = '';
var $stepPre = $stepNextBtn.prev() ;
console.log($stepNextBtn);
console.log($stepPre);

$stepNextBtn.on('click', function (ev) {
  ev.preventDefault();
  var $this = $(this);
  var $steps = $this.closest('.step').siblings('.step').show();
  var $steps = $this.closest('.step').hide();

})



} // pan

app.components.authModal = function ($modal) {

  var authMessage = function (text, type, duration) {

    $('#authModalMessage').fadeIn().addClass(type).html(text + '<a href="#" class="auth close">&times;</a>');
    
    //Types are: alert, success, warning, info 
    if (duration != 0) {
      setTimeout(function () {
        $('#authModalMessage').removeClass(type).fadeOut().html('loading <a href="#" class="auth close">&times;</a>');
      }, duration * 1000);
    }

  }
  
  var authSuccess = function (windowName) {
    app.utils.unloadModal($modal.parent());
    app.utils.notify('Success !!', 'success', 5);
    var page = app.$body.data('source');
    app.utils.requestDeserializer(app.requestArgs);
    app.requestArgs = {};
    if (page === 'askPopup') {
      mixpanel.track(
        "Login Successful",
        {
          "Source": app.$body.data('source'),
          "User": app.$body.data('profile'),
          "Method": windowName
        }
      );
    }
    // (function listenForPings() {
    //   var openerDomain = 'http://flatabout.com';
    //   if (app.$body.data('from')) {
    //     openerDomain = app.$body.data('from');
    //   }
    //   console.log(openerDomain,'od');
    //   console.log(app.$body.data('from'));
    //   console.log("child active");
    //   if (window.addEventListener) {
    //     window.addEventListener('message', onPingMessage, false);
    //   } else if (window.attachEvent) {
    //     window.attachEvent('message', onPingMessage, false);
    //   }

    //   function onPingMessage(event) {
    //     if (event.origin == openerDomain)
    //       event.source.postMessage(app.$body.data('profile'), event.origin);
    //   }
    // })();

    console.log(app.$body.data('from'));
    if(app.$body.data('from')){
       app.utils.redirect(app.$body.data('from')+'?username='+app.$body.data('from'));
       return;
    }
    if (app.utils.currentUrl() === app.utils.domain() + '/') {
      app.utils.redirectTo('/discover');
    } else {
      app.utils.reloadNavAndPanel();
    }

    //addTrackingScripts();
  };

  (function initializeOpenUniquePopUp() {
    //set this to domain name
    var openedDomain = app.utils.domain(); //'http://Flatabout.com'
    var trackedWindows = {};
    window.openUniquePopUp = function (path, windowName, specs) {
      trackedWindows[windowName] = false;
      var popUp = window.open(null, windowName, specs);
      popUp.postMessage('ping', openedDomain);
      setTimeout(checkIfOpen, 1000);
      setInterval(checkIfPinged, 1000);

      function checkIfOpen() {
        if (!trackedWindows[windowName]) {
          window.open(openedDomain + path, windowName, specs);
          popUp.postMessage('ping', openedDomain);
        }
      }

      function checkIfPinged() {
        popUp.postMessage('ping', openedDomain);
      }
    };

    if (window.addEventListener) {
      window.addEventListener('message', onPingBackMessage, false);

    } else if (window.attachEvent) {
      window.attachEvent('message', onPingBackMessage, false);
    }

    function onPingBackMessage(event) {
      //if (event.origin == openedDomain) {
        var winst = event.source;
        winst.close();
        authSuccess(event.data);
        trackedWindows[event.data] = true;
      //}
    };
  })();
  
  var $loginTrg = $modal.find('#loginTrg');
  var $signupTrg = $modal.find('#signUpTrg');
  var $loginForm = $modal.find('#loginForm');
  var $signupForm = $modal.find('#signupForm');
  var $loginDisplay = $modal.find('#loginDisplay');
  var $signupDisplay = $modal.find('#signupDisplay');
  var $hideIfForm = $modal.find('.hide-if-form');
  var $showIfForm = $modal.find('.show-if-form');
  var $socialBtn = $modal.find('#socialBtn');
  var $loginBtn = $loginForm.find('#login-btn');
  var $registerBtn = $signupForm.find('#register-btn');
  var $fb = $socialBtn.find('.fb');
  var $twt = $socialBtn.find('.twt');
  var $ggl = $socialBtn.find('.ggl');
  var $backBtn = $modal.find('.frankly-back');
  var backBtnHtml = '<div class="scolor2 s cs">Back</div>';
  var $forgotPasswordBtn = $modal.find('.forgot-password');
  var $authModal = $modal.find('.authModalClass');
  var $forgotPasswordDisplay = $modal.find('.forgotPasswordDisplay');
  var $sendMailButton = $modal.find('.sendEmailButton');
  var $forgotPasswordEmailInput = $modal.find('.forgotPasswordEmailInput');
  var $backBtnForgotPassword = $modal.find('.back-button-forgot-password');
  var $normalBackDiv = $modal.find('.normal-back');
  var $forgotPasswordBackDiv = $modal.find('.forgot-password-back');
  var $invalidEmailUsernameMessage = $modal.find('.invalidEmailUsernameMessage');
    
  var addErrorMessage = function(field,errorSpan){
      errorSpan.slideDown('slow');
      //on keydown remove the message
      field.keydown(function(){
      errorSpan.slideUp('slow');
    });
  };

  $loginBtn.on('click', function (ev) {

    // ev.preventDefault();
    app.utils.btnStateChange($loginBtn, "Signing In", true);

    var formData = {
      username: $loginForm.find('#email').val(),
      password: $loginForm.find('#password').val()
    };
        
     var re = /^[ A-Za-z0-9]*$/i;
     var validUsername = re.test($loginForm.find('#email').val());   

     var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
     var validEmail = re.test($loginForm.find('#email').val());

     if(!validUsername&&!validEmail){
        app.utils.btnStateChange($loginBtn, "Sign In", false);
        addErrorMessage($loginForm.find("#email"),$invalidEmailUsernameMessage)
        return;
     }

  
    if (!$loginForm[0].checkValidity()) {
      app.utils.btnStateChange($loginBtn,"Sign In",false);
      return;
    }
    
    

    app.utils.ajax.post('/auth/local', {
      data: formData
    }).then(
      function (data) {
        mixpanel.identify(data.user.id);
        authSuccess('native');
      },
      function (res) {
        app.utils.btnStateChange($loginBtn, "Sign In", false);
        authMessage('Something went wrong', 'error', 10);
      }
    )
  });

  $registerBtn.on('click', function (ev) {
    // ev.preventDefault();

    app.utils.btnStateChange($registerBtn, "Signing Up", true);

    var formData = {
      username: $signupForm.find('#email').val(),
      password: $signupForm.find('#password').val(),
      fullName: $signupForm.find('#name').val()
    };
    var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
    var validEmail = re.test($signupForm.find('#email').val());

    if (!$signupForm[0].checkValidity()) {
      app.utils.btnStateChange($registerBtn,"Create New Account",false);
      return;
    }

    if (!validEmail) {
      app.utils.notifyLogin('Please fill valid email address', 'error', 5);
      app.utils.btnStateChange($registerBtn,"Create New Account",false);
      return;
    }
    app.utils.btnStateChange($registerBtn,"Signing Up",true);
    app.utils.ajax.post('/auth/register', {
      data: formData
    }).then(
      function (data) {
        if (app.$body.data('source') === 'askPopup') {
          mixpanel.track(
            "Signup Completed",
            {
              "Source": app.$body.data('source'),
              "User": app.$body.data('profile')
            }
          );
        }
        mixpanel.identify(data.user.id);
        authSuccess();
      },
      function (res) {
        app.utils.btnStateChange($registerBtn, "Create New Account", false);
        authMessage('Something went wrong', 'error', 10);
      }
    )
  });

  $forgotPasswordBtn.on('click', function (ev) {
    ev.preventDefault();
    $loginDisplay.slideUp();
    $normalBackDiv.delay(100).slideUp();
    $forgotPasswordBackDiv.delay(400).slideDown();
    $backBtnForgotPassword.delay(400).slideDown();
    $forgotPasswordDisplay.delay(400).slideDown();    
  });

  $sendMailButton.on('click', function (ev) { 
    var formData = {
      username: $forgotPasswordEmailInput.val().trim()
    };
    app.utils.ajax.post('/auth/reset-password', {
      data: formData
    }).then(
      function (data) {
        app.utils.unloadOpenModals();
        app.utils.notify('Password reset request sent. You\'ll receive an email shortly', 'success', 4).delay(200);

      },
      function (res) {
        authMessage('Something went wrong. Please try again later', 'error', 2);
      }
    );
    // }
  });

  $signupTrg.on('click', function (ev) {
    $backBtn.fadeIn();
    $socialBtn.slideUp();
    $showIfForm.css({
      display: 'block'
    });
    $hideIfForm.css({
      display: 'none'
    });
    $signupDisplay.delay(400).slideDown();
  });

  $loginTrg.on('click', function (ev) {

    $backBtn.fadeIn();
    $socialBtn.slideUp();
    $showIfForm.css({
      display: 'block'
    });
    $hideIfForm.css({
      display: 'none'
    });
    $loginDisplay.delay(400).slideDown();
  });

  $backBtnForgotPassword.on('click', function (ev) {
    $forgotPasswordDisplay.slideUp();
    $forgotPasswordBackDiv.slideUp();
    $normalBackDiv.delay(400).slideDown();
    $loginDisplay.delay(400).slideDown();
  });


  $backBtn.on('click', function (ev) {
    $backBtn.fadeOut();
    $forgotPasswordDisplay.slideUp();
    $loginDisplay.slideUp();
    $signupDisplay.slideUp();
    $socialBtn.delay(400).slideDown();
    $hideIfForm.delay(400).slideDown();
    $showIfForm.css({
      display: 'none'
    });
  });

  var w = 700;
  var h = 480;
  var left = (screen.width / 2) - (w / 2);
  var top = (screen.height / 2) - (h / 2);
  
  $fb.on('click', function (ev) {
    //window.openUniquePopUp('/auth/facebook', 'twitter', 'width=' + w + ',height=' + h + ',top=' + top + ',left=' + left);
    //url = '/auth/facebook';       
    openWin('facebook'); 
  });
  $twt.on('click', function (ev) {
    //window.openUniquePopUp('/auth/twitter', 'twitter', 'width=' + w + ',height=' + h + ',top=' + top + ',left=' + left);
    //url = '/auth/twitter';
    openWin('twitter');
  });
  $ggl.on('click', function (ev) {
    //window.openUniquePopUp('/auth/google', 'twitter', 'width=' + w + ',height=' + h + ',top=' + top + ',left=' + left);
    openWin('google');
  });


  function openWin(name){
    var loginPopup=window.open('/auth/' + name, name + 'LoginPopup', 'width=' + 700 + ',height=' + 480 + ',top=' + top + ',left=' + left);
    var interval = setInterval(function () {
      console.log(loginPopup.location.pathname);
      if(loginPopup.location.pathname == '/auth/success') {
        clearInterval(interval);
        loginPopup.close();
        authSuccess();
      }
    }, 4000);
    // Add this event listener; the function will be called when the window closes
    loginPopup.onbeforeunload = function(){

    console.log('before load');
    authSuccess();    

    }; 
    
    loginPopup.focus();
  }


};
app.components.authModalSuccess = function ($modal) {
  // window.close();
  (function listenForPings() {
    var openerDomain = app.utils.domain();
    console.log("child active");
    console.log(openerDomain);
    
    if (window.addEventListener) {
      window.addEventListener('message', onPingMessage, false);
    } else if (window.attachEvent) {
      window.attachEvent('message', onPingMessage, false);
    }

    function onPingMessage(event) {
      console.log('ping message sending back');
      if (event.origin == openerDomain)
        event.source.postMessage(event.data, event.origin);
    }
  })();
};
app.components.filePicker = function ($filePicker) {
  var $uploadForm  = $filePicker.find('.upload-picker');
  var $uploadInput = $uploadForm.find('#uploadInput');
  var $uploadBtn   = $filePicker.find('#uploadBtn');
  var formData = new FormData();
  $uploadBtn.on('click', function(ev) {
      ev.preventDefault();
      var files = $uploadInput.prop('files');
      _.forEach(files, function(file) {
        formData.append('file', file);
      });
      app.utils.ajax.post('/upload',  {
        data: formData,
        processData : false,
        contentType : false,
        mimeType    : false,
      }).then(function (data) {
          $uploadInput.val();
          app.$body.find('#parsedForm').html(data);
      });
  }); 
};
app.components.flotBarChart = function ($graph) {

	app.$document.ready(function(){
		app.utils.graph($graph);

  });

	
}

app.components.goalDetailsPanel = function($goalDetailId) {
  var $graphClose = $goalDetailId.find('#icon-close');
  var $graphContainer = $goalDetailId.find('#container');
  var $graphContainer2 = $goalDetailId.find('#container2');
  var $graphContainer3 = $goalDetailId.find('#container3');
  var $legendsHolder = $goalDetailId.find('#legend-list');
  var $barChart = $goalDetailId.find('#bar-chart');
  var $pieChart = $goalDetailId.find('#pie-chart');

  $graphClose.on('click', function(ev) {
    ev.preventDefault();
    app.$body.find('#graphView').slideUp("slow");
  });
  if (true) {
    var loadBarChart = function() {
      $graphContainer3.highcharts({
        chart: {
          type: 'column'
        },
        title: {
          text: 'Net Worth Growth Since 2012 to May, 2016'
        },
        subtitle: {
          text: 'Click the columns to view asset history.'
        },
        xAxis: {
          type: 'category'
        },
        yAxis: {
          title: {
            text: 'Total percent growth'
          }

        },
        legend: {
          enabled: false
        },
        plotOptions: {
          series: {
            borderWidth: 0,
            dataLabels: {
              enabled: true,
              format: '{point.y:.1f}%'
            }
          }
        },

        tooltip: {
          headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
          pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y:.2f}%</b> of total<br/>'
        },

        series: [{
          name: 'Assets',
          colorByPoint: true,
          data: [{
            name: 'Equity Funds',
            y: 56.33,
            drilldown: 'Equity Funds'
          }, {
            name: 'Direct Equity',
            y: 24.03,
            drilldown: 'Direct Equity'
          }, {
            name: 'Bank Accounts',
            y: 10.38,
            drilldown: 'Bank Accounts'
          }, {
            name: 'Gold',
            y: 4.77,
            drilldown: 'Gold'
          }, {
            name: 'Provident Fund',
            y: 0.91,
            drilldown: 'Provident Fund'
          }, {
            name: 'Property',
            y: 0.2,
            drilldown: null
          }]
        }],
        drilldown: {
          series: [{
            name: 'Equity Funds',
            id: 'Equity Funds',
            data: [
              [
                'Q 4',
                24.13
              ],
              [
                'Q 3',
                17.2
              ],
              [
                'Q 2',
                8.11
              ],
              [
                'Q 1',
                5.33
              ],
              [
                '2015',
                1.06
              ]
            ]
          }, {
            name: 'Direct Equity',
            id: 'Direct Equity',
            data: [
              [
                'Q 4',
                5
              ],
              [
                'Q 3',
                4.32
              ],
              [
                'Q 2',
                3.68
              ],
              [
                'Q 1',
                2.96
              ],
              [
                '2015/ Q4',
                2.53
              ],
              [
                '2015/ Q3',
                1.45
              ],
              [
                '2015/ Q2',
                1.24
              ],
              [
                '2015/ Q1',
                0.85
              ],
              [
                '2014/ Q4',
                0.6
              ],
              [
                '2014/ Q3',
                0.55
              ],
              [
                '2014/ Q2',
                0.38
              ],
              [
                '2014/ Q1',
                0.19
              ],
              [
                '2013',
                0.14
              ],
              [
                '2012',
                0.14
              ]
            ]
          }, {
            name: 'Bank Accounts',
            id: 'Bank Accounts',
            data: [
              [
                'Q 4',
                5
              ],
              [
                'Q 3',
                4.32
              ],
              [
                'Q 2',
                3.68
              ],
              [
                'Q 1',
                2.96
              ],
              [
                '2015/ Q4',
                2.53
              ],
              [
                '2015/ Q3',
                1.45
              ],
              [
                '2015/ Q2',
                1.24
              ],
              [
                '2015/ Q1',
                0.85
              ],
              [
                '2014/ Q4',
                0.6
              ],
              [
                '2014/ Q3',
                0.55
              ],
              [
                '2014/ Q2',
                0.38
              ],
              [
                '2014/ Q1',
                0.19
              ],
              [
                '2013',
                0.14
              ],
              [
                '2012',
                0.14
              ]
            ]
          }, {
            name: 'Gold',
            id: 'Gold',
            data: [
              [
                'v8.0',
                2.56
              ],
              [
                'v7.1',
                0.77
              ],
              [
                'v5.1',
                0.42
              ],
              [
                'v5.0',
                0.3
              ],
              [
                'v6.1',
                0.29
              ],
              [
                'v7.0',
                0.26
              ],
              [
                'v6.2',
                0.17
              ]
            ]
          }, {
            name: 'Provident Funds',
            id: 'Provident Funds',
            data: [
              [
                'v12.x',
                0.34
              ],
              [
                'v28',
                0.24
              ],
              [
                'v27',
                0.17
              ],
              [
                'v29',
                0.16
              ]
            ]
          }]
        }
      });
    };
    var loadPieChart = function(id, state) {
      $graphContainer.highcharts({
        chart: {
          type: 'pie',
          options3d: {
            enabled: true,
            alpha: 45,
            beta: 0
          }
        },
        title: {
          text: 'Current Allocation'
        },
        tooltip: {
          pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
        },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            depth: 35,
            dataLabels: {
              enabled: true,
              format: '{point.name}'
            }
          }
        },
        series: [{
          type: 'pie',
          name: 'Account share',
          data: [
            ['Bank Accounts', 40.0],
            ['Direct Equity', 23.8], {
              name: 'Equity Funds',
              y: 22.8,
              sliced: true,
              selected: true
            },
            ['Gold', 12.5],
            ['Provident Funds', 2.2],
            ['Others', 3.7]
          ]
        }]
      });
    };

    var loadPieChart2 = function(id, state) {
      $graphContainer2.highcharts({
        chart: {
          type: 'pie',
          options3d: {
            enabled: true,
            alpha: 45,
            beta: 0
          }
        },
        title: {
          text: 'Suggested Allocation'
        },
        tooltip: {
          pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
        },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            depth: 35,
            dataLabels: {
              enabled: true,
              format: '{point.name}'
            }
          }
        },
        series: [{
          type: 'pie',
          name: 'Net Worth',
          data: [
            ['Bank Accounts', 30.0],
            ['Direct Equity', 23.8], {
              name: 'Equity Funds',
              y: 32.8,
              sliced: true,
              selected: true
            },
            ['Gold', 12.5],
            ['Provident Funds', 2.2],
            ['Others', 3.7]
          ]
        }]
      });
    };

    var pieIntialiaze = function() {
      loadPieChart(0, 'Net Worth');
      loadPieChart2(0, 'Net Worth');
      loadBarChart();
    };

    pieIntialiaze();
  } else {
    $graphContainer.html("Graph not Available, please select values you want to map")
  }

};
// pan

app.components.goalForm = function ($formDiv) {
  var $goalForm = $formDiv.find('form');
  //var $addWidgetsBtn = $pan.find('.add-widgets-btn');
  //var $goalForm = $('#goal-form');
  //var $assetForm = $('#asset-form');

  $goalForm.on('submit', function (ev) {
          ev.preventDefault();
          var $this = $(this);
          console.log('submit start');
          console.log(app.utils.getFormData($this));




      var formData = {
        //username: $username.val(),
        //full_name: $userFullName.val(),
        //email: $userEmail.val(),
        //password: $userPassword.val(),
        //details: {}
      };

      //formData.details = app.utils.getFormData($detailsForm);



      formData = app.utils.getFormData($this);
      var url = '/addgoal';//$this.data('url');

      //console.log('for details: ', formData);
      app.utils.ajax.post(url  , {
        data: {
            name: formData.name,
            goal_category_id: formData.goal_category_id,
            ammount: formData.amount,
            duration: formData.target,
            meta: formData.meta,
        }
      })
      .then(function (data) {
        var $tabContent = app.$body.find('#tab-content');
        app.utils.getPartial('/profile', 'goalsPan', $tabContent);
        $('a[href^=' + '#goals' + ']').click();
        toastr.success('Success !!', 'success', 5);
      },
      function (res) {
        toastr.error('oops', JSON.stringify(res.status));
      });
          return false;
  });


//step form

var $stepNextBtn = $formDiv.find('.step-next-btn');
var $stepNext = '';
var $stepPre = $stepNextBtn.prev() ;
console.log($stepNextBtn);
console.log($stepPre);

$stepNextBtn.on('click', function (ev) {
  ev.preventDefault();
  var $this = $(this);
  var $steps = $this.closest('.step').siblings('.step').show();
  var $steps = $this.closest('.step').hide();

})



} // pan

app.components.listTable = function ($tableDiv) {
  var $table = $tableDiv.find('.list-table');
  var $row = $table.find('.table-row');
  var $detail = $tableDiv.find('#table-detail');
  var $detailPan = $tableDiv.find('.table-detail-pan');
  var $closeDetailBtn = $detailPan.find('.close-btn');
  var $fullScreenBtn = $detailPan.find('.full-screen-btn');

  $row.on('click', function (ev){
    ev.preventDefault();
    console.log('click row an go ');
    var $this = $(this);
    var table_detail_id = $this.data('id');
    var type = $this.data('type');
    var url = ['', type, table_detail_id].join('/');
    $fullScreenBtn.prop('href', url);
    $table.fadeOut();
    $detailPan.fadeIn();
    app.utils.getPartial(url, type + 'DetailsPan', $detail);
  });

  $closeDetailBtn.on('click', function(ev){
    ev.preventDefault();
    $table.fadeIn()
    $detailPan.fadeOut();
  });

  // $fullScreenBtn.on('click', function(ev){
  //   ev.preventDefault();
  //   var $this = $(this);
  // });


}

app.components.loginPage = function ($modal) {
  console.log('login now');
  var authSuccess = function (user) {
    app.utils.unloadModal($modal.parent());
    toastr.success('Success !!', 'success', 5);
    if (app.requestArgs) {
      app.utils.requestDeserializer(app.requestArgs);
    }

//    if ((app.utils.currentUrl() === app.utils.domain() + '/') || (app.utils.currentUrl() === app.utils.domain() + '/auth/login')) {
    if ((app.utils.currentUrl() !== app.utils.domain() + '/profile') ) {
         app.utils.redirectTo('/profile');
    } else {
      app.utils.reloadNavAndPanel();
    }
  };
  var $singninPanel = $modal.find('.sign-in');
  var $singnupPanel = $modal.find('.sign-up');
  var $loginForm = $singninPanel.find('#login-form');
  var $signupForm = $singnupPanel.find('#signup-form');
  var $detailsForm = $singnupPanel.find('.details-form');
  var $loginBtn = $loginForm.find('#loginBtn');
  var $gplusBtn = $loginForm.find('.gplus');
  var $fbBtn = $loginForm.find('.fb');
  var $userEmail = $signupForm.find('.user-email');
  var $username = $signupForm.find('.username');
  var $userFullName = $signupForm.find('.user-full-name');
  var $userPassword = $signupForm.find('.user-password');
  var $userConfirmPassword = $signupForm.find('.user-confirm-password');
  var $signupBtn = $signupForm.find('.signupBtn');
  var $signUpLink = $singninPanel.find('.signup-link');
  var $signupAlert = $singnupPanel.find('#signupalert');
  var $signinAlert = $singninPanel.find('#loginalert');
  var image_urls = [];

    $signUpLink.on('click', function (ev) {
    ev.preventDefault();
    $singninPanel.slideUp();
    $singnupPanel.slideDown();
  });


  $loginBtn.on('click', function (ev) {
    ev.preventDefault();
    app.utils.btnStateChange($loginBtn, "Signing In", true);

    var formData = {
      email: $loginForm.find('#email').val(),
      password: $loginForm.find('#password').val()
    };


    app.utils.ajax.post('/auth/local', {
      data: formData
    }).then(
      function (data) {
        authSuccess();
      },
      function (res) {
       // console.log(res.status);
        $signinAlert.show();
        app.utils.btnStateChange($loginBtn, "Login", false);

      }
    )
  });

  $signupBtn.on('click', function (ev) {
    ev.preventDefault();
    app.utils.btnStateChange($signupBtn, "Wait", true);


    if ($userPassword.val() == $userConfirmPassword.val())  {

      var formData = {
        username: $username.val(),
        full_name: $userFullName.val(),
        email: $userEmail.val(),
        password: $userPassword.val(),
        details: {}
      };

      formData.details = app.utils.getFormData($detailsForm);
      formData.details.image_urls = image_urls;
      //console.log('for details: ', formData);
      app.utils.ajax.post('/auth/register', {
        data: formData
      })
      .then(function (data) {
        authSuccess();
      },
      function (res) {
        $signupAlert.show();
        app.utils.btnStateChange($signupBtn, "Sign Up", false);
        $signupAlert.find('p').html("Sign Up failed");


      });
    } else {
        $signupAlert.show();
        $signupAlert.find('p').html("password didn't match");
        app.utils.btnStateChange($signupBtn, "Sign Up", false);

    };
  });


  var $uploadForm = $modal.find('.upload-picker');
  var $uploadInput = $uploadForm.find('#uploadInput');
  var $uploadBtn = $uploadForm.find('#uploadBtn');
  var photoData = new FormData();
  var handleFiles = function (files) {
    //console.log('handleFiles');
      //var files = $uploadInput.prop('files');
      _.forEach(files, function (file) {
          photoData.append('file', file);
          $uploadInput.parents('.img-upload-picker').find('.uploader-img-name').val(file.name);
      });
      //console.log('photo', photoData);
      app.utils.ajax.post('/upload', {
          data: photoData,
          processData: false,
          contentType: false,
          mimeType: false,
      }).then(function (data) {
         // console.log(data.uploadedFiles, data, 'data aaya');
          image_urls = _.map(data.uploadedFiles, function (obj) {
              var fileObj = {};
              fileObj[obj.key] = obj.url;
              return obj.url;
          });
          for (var i = 0; i < files.length; i++) {
              var file = files[i];
              var imageType = /^image\//;

              if (!imageType.test(file.type)) {
                  continue;
              }
              var img = document.createElement("img");
              img.classList.add("img-thumbnail");
              img.file = file;
              var div = $('<div/>', {
                  class: 'col-sm-12'
              });
              div.append(img);
              $modal.find('#image-preview').append(div); // Assuming that "preview" is the div output where the content will be displayed.
              var reader = new FileReader();
              reader.onload = (function (aImg) {
                  return function (e) {
                      aImg.src = e.target.result;
                  };
              })(img);
              reader.readAsDataURL(file);
          }
      });
  };
  $uploadInput.on('change', function (ev) {
    //console.log('upload change');
      ev.preventDefault();
      handleFiles($uploadInput.prop('files'));
  });


  (function initializeOpenUniquePopUp() {
    //set this to domain name
    var openedDomain = app.utils.domain();
    var trackedWindows = {};
    var wName, pingPopup, popUp;
    window.openUniquePopUp = function (path, windowName, specs) {
      trackedWindows[windowName] = false;
      popUp = window.open(null, windowName, specs);
      popUp.postMessage(wName, openedDomain);
      setTimeout(checkIfOpen, 1000);
      pingPopup = setInterval(checkIfPinged, 1000);
      wName = windowName;
      function checkIfOpen() {
        if (!trackedWindows[windowName]) {
          popUp = window.open(openedDomain + path, windowName, specs);
          popUp.postMessage(wName, openedDomain);
        }
      }

      function checkIfPinged() {
        popUp.postMessage(wName, openedDomain);
      }
    };

    if (window.addEventListener) {
      window.addEventListener('message', onPingBackMessage, false);

    } else if (window.attachEvent) {
      window.attachEvent('message', onPingBackMessage, false);
    }

    function onPingBackMessage(event) {
      if (event.origin == openedDomain && event.data === wName) {
        var winst = event.source;
        clearInterval(pingPopup);
        winst.close();
        authSuccess(event.data);
        trackedWindows[event.data] = true;
      }
    };
  })();

    /**
     * Social login
     */

    var w = 700;
    var h = 480;
    var left = (screen.width / 2) - (w / 2);
    var top = (screen.height / 2) - (h / 2);

    $fbBtn.on('click', function (ev) {
      window.openUniquePopUp('/auth/facebook', 'facebook', 'width=' + w + ',height=' + h + ',top=' + top + ',left=' + left);
    });

    $gplusBtn.on('click', function (ev) {
      window.openUniquePopUp('/auth/google', 'google', 'width=' + w + ',height=' + h + ',top=' + top + ',left=' + left);
    });
};

app.components.navController = function($nav) {
  var $signInModal = $nav.find('.signin-link');
  var $logOutBtn = $nav.find('.logout');
  var $dropDown = $nav.find('.dropdown-toggle');
  var $mobileMenuBtn = $nav.find('.mobile-menu-btn');
  var $mobileMenu = $nav.find('.mobile-menu');
  var $addReviewBtn = $nav.find('.add-review');
  var $sudoDiv = $nav.find('.sudo-div');
  var $meLocation = $nav.find('.me-location');
  var meLocation = $meLocation.data('location');
  $(function () {
    $dropDown.dropdown();
  });

    // Minimalize menu
  $('.navbar-minimalize').click(function () {
      $("body").toggleClass("mini-navbar");
      app.utils.SmoothlyMenu();
  });

  $signInModal.on('click', function (ev) {
    ev.preventDefault();
    app.utils.loadModal('#authModal', '/modal/auth');
  });

  $logOutBtn.on('click', function (ev) {
    ev.preventDefault();
    app.utils.ajax.post("/logout").then(function (){
      if (app.utils.currentUrl() === app.utils.domain() + '/profile') {
      app.utils.redirectTo('/');
      } else {
        app.utils.reloadNavAndPanel();
      }

      toastr.notify('Logged Out', 'success', 3);

    });
  });

  var slideMenu = function () {
    if ($mobileMenu.hasClass('slide-open')) {
      $mobileMenu.animate({left: '-100%'});
    } else {
      $mobileMenu.animate({left: '0px'});
    };
    $mobileMenu.toggleClass('slide-open');
    $sudoDiv.toggleClass('sudo-div-open');
  };

  $mobileMenuBtn.on('click', function (ev) {
    ev.preventDefault();
    slideMenu();
  });

  $sudoDiv.on('click', function (ev) {
    ev.preventDefault();
    slideMenu();
  });

  $sudoDiv.on('swipe', function (ev) {
    console.log(' swipe kiya re');
    ev.preventDefault();
    slideMenu();
  });


  //$mobileMenu.on('swipe', slideMenu());

  $addReviewBtn.on('click', function (ev) {
    ev.preventDefault();
    app.utils.loadModal('#reviewModal', '/modal/review');
  });

  setTimeout(function(){
    if (meLocation == '') {
      $meLocation.html(app.currentLocation.full_address);
    };
  }, 2000);

};

app.components.overviewPan = function ($pan) {
  var $addWidgetsBtn = $pan.find('.add-widgets-btn');
  var $tabContent = app.$body.find('#tab-content');


//authSuccess();
var $addWidgetSelect = $pan.find('.add-widgets-select');

$addWidgetSelect.on('change', function (ev){
  ev.preventDefault();
  //console.log('goal drop change');
  //
  // var $this = $(this);
  // var tabId = '#' + $this.val().replace(" ", "-").toLowerCase();
  // var $tab = $('a[href^=' + tabId + ']');
  // $tab.click();
  app.utils.getPartial('/profile', 'goalForm',  $tabContent);


})

var $panelLink = $pan.find('.panel-link');

$panelLink.on('click', function(ev){
  ev.preventDefault();
  var $this = $(this);
  $panelLink.parent().each(function() {
    $(this).removeClass('active');
  });
  $this.parent().addClass('active');
  var url = '/profile';  //$(this).data('url');
  var partial = $(this).data('partial');
  app.utils.getPartial(url, partial,  $tabContent);
})



} // pan

app.components.profileCard = function ($card) {
  var $addDetailsSelect = $card.find('.add-details-select');

  $addDetailsSelect.on('change', function (ev){
    ev.preventDefault();
    var $this = $(this);
    //var tabId = '#' + $this.val().replace(" ", "-").toLowerCase();
    //var $tab = $('a[data-partial=' + 'assetsPan' + ']');
    //$tab.click();
    var id = $this.val();
    var $tabContent = app.$body.find('#tab-content');
    app.utils.scrollToDiv($tabContent);
    app.utils.getPartial('/forms?type=assets&id=' + id , 'assetForm', $tabContent);

  })


}

app.components.profilePan = function ($pan) {
  var $addWidgetsBtn = $pan.find('.add-widgets-btn');
  var $tabContent = $pan.find('#tab-content');


// var $addWidgetSelect = $pan.find('.add-widgets-select');
//
// $addWidgetSelect.on('change', function (ev){
//   ev.preventDefault();
//   console.log('goal drop change');
//   app.utils.getPartial('/profile', 'goalForm',  $tabContent);
//
// })

var $panelLink = $pan.find('.panel-link');

$panelLink.on('click', function(ev){
  ev.preventDefault();
  var $this = $(this);
  $panelLink.parent().each(function() {
    $(this).removeClass('active');
  });
  $this.parent().addClass('active');
  var url = '/profile';  //$(this).data('url');
  var partial = $(this).data('partial');
  app.utils.getPartial(url, partial,  $tabContent);
})



} // pan

app.components.profilePanel = function ($panel) {
//   var $addWidgetsBtn = $panel.find('.add-widgets-btn');
//   var $form = $('form');
//
//
//   // $.fn.serializeObject = function(){
//   //
//   //     var self = this,
//   //         json = {},
//   //         push_counters = {},
//   //         patterns = {
//   //             "validate": /^[a-zA-Z][a-zA-Z0-9_]*(?:\[(?:\d*|[a-zA-Z0-9_]+)\])*$/,
//   //             "key":      /[a-zA-Z0-9_]+|(?=\[\])/g,
//   //             "push":     /^$/,
//   //             "fixed":    /^\d+$/,
//   //             "named":    /^[a-zA-Z0-9_]+$/
//   //         };
//   //
//   //
//   //     this.build = function(base, key, value){
//   //         base[key] = value;
//   //         return base;
//   //     };
//   //
//   //     this.push_counter = function(key){
//   //         if(push_counters[key] === undefined){
//   //             push_counters[key] = 0;
//   //         }
//   //         return push_counters[key]++;
//   //     };
//   //
//   //     $.each($(this).serializeArray(), function(){
//   //
//   //         // skip invalid keys
//   //         if(!patterns.validate.test(this.name)){
//   //             return;
//   //         }
//   //
//   //         var k,
//   //             keys = this.name.match(patterns.key),
//   //             merge = this.value,
//   //             reverse_key = this.name;
//   //
//   //         while((k = keys.pop()) !== undefined){
//   //
//   //             // adjust reverse_key
//   //             reverse_key = reverse_key.replace(new RegExp("\\[" + k + "\\]$"), '');
//   //
//   //             // push
//   //             if(k.match(patterns.push)){
//   //                 merge = self.build([], self.push_counter(reverse_key), merge);
//   //             }
//   //
//   //             // fixed
//   //             else if(k.match(patterns.fixed)){
//   //                 merge = self.build([], k, merge);
//   //             }
//   //
//   //             // named
//   //             else if(k.match(patterns.named)){
//   //                 merge = self.build({}, k, merge);
//   //             }
//   //         }
//   //
//   //         json = $.extend(true, json, merge);
//   //     });
//   //
//   //     return json;
//   // };
//   //
//
//
//   $form.on('submit', function (ev) {
//           ev.preventDefault();
//           var $this = $(this);
//           console.log('submit start');
//           console.log(app.utils.getFormData($this));
//
//
//
//
//       var formData = {
//         //username: $username.val(),
//         //full_name: $userFullName.val(),
//         //email: $userEmail.val(),
//         //password: $userPassword.val(),
//         //details: {}
//       };
//
//       //formData.details = app.utils.getFormData($detailsForm);
//
//
//
//       formData = app.utils.getFormData($this);
//       formData.userId = $this.data('user-id');
//       var url = $this.data('url');
//
//       //console.log('for details: ', formData);
//       app.utils.ajax.post(url  , {
//         data: formData
//       })
//       .then(function (data) {
//         toastr.success('Success !!', 'success', 5);
//
//         //authSuccess();
//         //app.utils.reloadNavAndPanel();
//
//       },
//       function (res) {
//         toastr.error('oops', JSON.stringify(res.status));
//
//       });
//
//
//           return false;
//
//   });
//
//
// // overview pan
//
// var $addWidgetSelect = $panel.find('.add-widgets-select');
//
// $addWidgetSelect.on('change', function (ev){
//   ev.preventDefault();
//   var $this = $(this);
//   var tabId = '#' + $this.val().replace(" ", "-").toLowerCase();
//   var $tab = $('a[href^=' + tabId + ']');
//   $tab.click();
// })
//
//
// //step form
//
// var $stepNextBtn = $panel.find('.step-next-btn');
// var $stepNext = '';
// var $stepPre = $stepNextBtn.prev() ;
// console.log($stepNextBtn);
// console.log($stepPre);
//
// $stepNextBtn.on('click', function (ev) {
//   ev.preventDefault();
//   var $this = $(this);
//   var $steps = $this.closest('.step').siblings('.step').show();
//   var $steps = $this.closest('.step').hide();
//
// })
//


} // panel

app.components.scrollTopBtn = function($btn) {
	$(window).on('scroll', function () {
		if ($(this).scrollTop() != 0) {
			$btn.fadeIn();
		} else {
			$btn.fadeOut();
		}
	}); 
	$btn.on('click', function (ev) {
		ev.preventDefault();
    	app.$body.animate({scrollTop: 0}, 1000);
	});		
	    
};
app.components.searchBox = function ($box) {
    var placeSearch, autocomplete;
    var searchBox = $('.search input')[0];
    var searchBtn = $('.search button')[0];
    var $searchInput = $box.find('.input-search');
    var $searchBtn = $box.find('.button-search');
    var $searchError = $box.find('.search-error');
    var $addReviewBtn = $searchError.find('.add-review-btn');
    var $closeErrorBtn = $searchError.find('.close-btn');
    autocomplete = new google.maps.places.Autocomplete(
        /** @type {!HTMLInputElement} */
        ($searchInput[0]), {
            types: ['geocode']
        });



    var getSearchResult = function () {
        app.utils.btnStateChange($searchBtn, "searching", true);
        var place = autocomplete.getPlace();
        app.searchedLocation.lat = place.geometry.location.lat();
        app.searchedLocation.lng = place.geometry.location.lng();

        if ($searchInput.val().length == 0) {
            app.utils.btnStateChange($searchBtn, "Search", false);
        } else {
            app.utils.ajax.get('/', {
                    data: {
                        lat: app.searchedLocation.lat,
                        lon: app.searchedLocation.lng,
                        rad: 5000,
                        partials: ['reviewHolder', 'ratingsHolder']
                    },
                })
                .then(function (data) {
                        var el = document.createElement('div');
                        var rel = document.createElement('div');
                        el.innerHTML = data.reviewHolder;
                        rel.innerHTML = data.ratingsHolder;
                        var $feedDiv = $(el).find('.feed');
                        var $rightPane = $(rel).find('.ratings-holder');

                        if ($.trim($feedDiv.html()) == '') {
                            $(searchBox).val('');
                            $(searchBox).attr('placeholder', 'Sorry No Results available for your selected location');
                            $(searchBox).parent().addClass('has-error');
                            $searchError.find('ul').show();
                        } else {
                            app.utils.goToByScroll($('.review-holder'));
                            $('.review-holder').slideUp('fast');
                            $('.review-holder').find('.feed').empty().append($feedDiv.html());
                            app.$body.find('.ratings-holder').empty().html($rightPane.html());
                            $('.review-holder').slideDown('slow');
                            $searchError.find('ul').hide();
                            $('.review-holder').find('.load-more').hide();

                        }
                        app.utils.btnStateChange($searchBtn, "Search", false);
                    },
                    function (err) {
                        console.log(err);
                    });
        }
    };
    autocomplete.addListener('place_changed', getSearchResult);


    $searchBtn.on('click', function (ev) {
        ev.preventDefault();
        if ($searchInput.val().length > 0) {
            getSearchResult();
        };
    });

    $closeErrorBtn.on('click', function (ev) {
        ev.preventDefault();
        $searchError.find('ul').hide();
    });

    $addReviewBtn.on('click', function (ev) {
        ev.preventDefault();
        app.utils.loadModal('#reviewModal', '/modal/review');
    });
};
app.components.sidebarLeft = function ($sidebar) {
	$sideMenu = $sidebar.find('#side-menu');

	$sideMenu.metisMenu({
    	toggle: true
  	});

	var $panelLink = $sidebar.find('.panel-link');

	$panelLink.on('click', function(ev){
		ev.preventDefault();
		var url = $(this).data('url');
		var partial = $(this).data('partial');
		app.utils.getPartial(url, partial, $('#panel'));
	})
}

app.components.table = function ($tableDiv) {
 var $table = $tableDiv.find('table');
 console.log('calling table function');

		console.log('calling table');
		$table.DataTable( );



}
