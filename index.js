( function () {
	var exports,
		mwHtml = typeof mw !== 'undefined' ? mw.html
			: require( 'mediawiki-html-construction-helper' ),
		registeredMessages = new Map(),
		slice = Array.prototype.slice;

	/**
	 * Format a string. Replace $1, $2 ... $N with positional arguments.
	 *
	 * Used by Message#parser().
	 *
	 * @since 1.25
	 * @param {string} formatString Format string
	 * @param {...Mixed} parameters Values for $N replacements
	 * @return {string} Formatted string
	 */
	function format( formatString ) {
		var parameters = slice.call( arguments, 1 );
		return formatString.replace( /\$(\d+)/g, function ( str, match ) {
			var index = parseInt( match, 10 ) - 1;
			return parameters[ index ] !== undefined ? parameters[ index ] : '$' + match;
		} );
	}
	/**
	 * Object constructor for messages.
	 *
	 * Similar to the Message class in MediaWiki PHP.
	 *
	 * Format defaults to 'text'.
	 *
	 *		 @example
	 *
	 *		 var obj, str;
	 *		 mw.messages.set( {
	 *				 'hello': 'Hello world',
	 *				 'hello-user': 'Hello, $1!',
	 *				 'welcome-user': 'Welcome back to $2, $1! Last visit by $1: $3'
	 *		 } );
	 *
	 *		 obj = new mw.Message( mw.messages, 'hello' );
	 *		 mw.log( obj.text() );
	 *		 // Hello world
	 *
	 *		 obj = new mw.Message( mw.messages, 'hello-user', [ 'John Doe' ] );
	 *		 mw.log( obj.text() );
	 *		 // Hello, John Doe!
	 *
	 *		 obj = new mw.Message( mw.messages, 'welcome-user', [ 'John Doe', 'Wikipedia', '2 hours ago' ] );
	 *		 mw.log( obj.text() );
	 *		 // Welcome back to Wikipedia, John Doe! Last visit by John Doe: 2 hours ago
	 *
	 *		 // Using mw.message shortcut
	 *		 obj = mw.message( 'hello-user', 'John Doe' );
	 *		 mw.log( obj.text() );
	 *		 // Hello, John Doe!
	 *
	 *		 // Using mw.msg shortcut
	 *		 str = mw.msg( 'hello-user', 'John Doe' );
	 *		 mw.log( str );
	 *		 // Hello, John Doe!
	 *
	 *		 // Different formats
	 *		 obj = new mw.Message( mw.messages, 'hello-user', [ 'John "Wiki" <3 Doe' ] );
	 *
	 *		 obj.format = 'text';
	 *		 str = obj.toString();
	 *		 // Same as:
	 *		 str = obj.text();
	 *
	 *		 mw.log( str );
	 *		 // Hello, John "Wiki" <3 Doe!
	 *
	 *		 mw.log( obj.escaped() );
	 *		 // Hello, John &quot;Wiki&quot; &lt;3 Doe!
	 *
	 * @class mw.Message
	 *
	 * @constructor
	 * @param {mw.Map} map Message store
	 * @param {string} key
	 * @param {Array} [parameters]
	 */
	function Message( map, key, parameters ) {
		this.format = 'text';
		this.map = map;
		this.key = key;
		this.parameters = parameters === undefined ? [] : slice.call( parameters );
		return this;
	}

	Message.prototype = {
		/**
		 * Get parsed contents of the message.
		 *
		 * The default parser does simple $N replacements and nothing else.
		 * This may be overridden to provide a more complex message parser.
		 * The primary override is in the mediawiki.jqueryMsg module.
		 *
		 * This function will not be called for nonexistent messages.
		 *
		 * @return {string} Parsed message
		 */
		parser: function () {
			return format.apply( null, [ this.map.get( this.key ) ].concat( this.parameters ) );
		},

		/**
		 * Add (does not replace) parameters for `$N` placeholder values.
		 *
		 * @param {Array} parameters
		 * @chainable
		 */
		params: function ( parameters ) {
			var i;
			for ( i = 0; i < parameters.length; i++ ) {
				this.parameters.push( parameters[ i ] );
			}
			return this;
		},

		/**
		 * Convert message object to its string form based on current format.
		 *
		 * @return {string} Message as a string in the current form, or `<key>` if key
		 *	does not exist.
		 */
		toString: function () {
			var text;

			if ( !this.exists() ) {
				// Use <key> as text if key does not exist
				if ( this.format === 'escaped' || this.format === 'parse' ) {
					// format 'escaped' and 'parse' need to have the brackets and key html escaped
					return mwHtml.escape( '<' + this.key + '>' );
				}
				return '<' + this.key + '>';
			}

			if ( this.format === 'plain' || this.format === 'text' || this.format === 'parse' ) {
				text = this.parser();
			}

			if ( this.format === 'escaped' ) {
				text = this.parser();
				text = mwHtml.escape( text );
			}

			return text;
		},

		/**
		 * Change format to 'parse' and convert message to string
		 *
		 * If jqueryMsg is loaded, this parses the message text from wikitext
		 * (where supported) to HTML
		 *
		 * Otherwise, it is equivalent to plain.
		 *
		 * @return {string} String form of parsed message
		 */
		parse: function () {
			this.format = 'parse';
			return this.toString();
		},

		/**
		 * Change format to 'plain' and convert message to string
		 *
		 * This substitutes parameters, but otherwise does not change the
		 * message text.
		 *
		 * @return {string} String form of plain message
		 */
		plain: function () {
			this.format = 'plain';
			return this.toString();
		},

		/**
		 * Change format to 'text' and convert message to string
		 *
		 * If jqueryMsg is loaded, {{-transformation is done where supported
		 * (such as {{plural:}}, {{gender:}}, {{int:}}).
		 *
		 * Otherwise, it is equivalent to plain
		 *
		 * @return {string} String form of text message
		 */
		text: function () {
			this.format = 'text';
			return this.toString();
		},

		/**
		 * Change the format to 'escaped' and convert message to string
		 *
		 * This is equivalent to using the 'text' format (see #text), then
		 * HTML-escaping the output.
		 *
		 * @return {string} String form of html escaped message
		 */
		escaped: function () {
			this.format = 'escaped';
			return this.toString();
		},

		/**
		 * Check if a message exists
		 *
		 * @see mw.Map#exists
		 * @return {boolean}
		 */
		exists: function () {
			return this.map.has( this.key );
		}
	};

	function message( key ) {
		var parameters = slice.call( arguments, 1 );
		return new Message( registeredMessages, key, parameters );
	}

	function msg() {
		return message.apply( registeredMessages, arguments ).toString();
	}

	exports = {
		Message: Message,
		load: function ( json ) {
			var i;
			for ( i in json ) {
				if ( json.hasOwnProperty( i ) ) {
					registeredMessages.set( i, json[i] );
				}
			}
		},
		/**
		 * Get a message object.
		 *
		 * Shortcut for `new mw.Message( mw.messages, key, parameters )`.
		 *
		 * @see mw.Message
		 * @param {string} key Key of message to get
		 * @param {...Mixed} parameters Values for $N replacements
		 * @return {mw.Message}
		 */
		message: message,
		/**
		 * Get a message string using the (default) 'text' format.
		 *
		 * Shortcut for `mw.message( key, parameters... ).text()`.
		 *
		 * @see mw.Message
		 * @param {string} key Key of message to get
		 * @param {...Mixed} parameters Values for $N replacements
		 * @return {string}
		 */
		msg: msg
	};
	if ( typeof module === 'undefined' ) {
		mw.Message = Message;
		mw.message = message;
		mw.msg = msg;
	} else {
		module.exports = exports;
	}

}());
