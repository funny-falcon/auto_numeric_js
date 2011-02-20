/**
 * autoNumeric.js
 * @author: Bob Knothe
 * @author: Sokolov Yura aka funny_falcon
 * @version: 1.7.0
 *
 * Created by Robert J. Knothe on 2010-10-25. Please report any bug at http://www.decorplanit.com/plugin/
 * Created by Sokolov Yura on 2010-11-07. http://github.com/funny_falcon
 *
 * Copyright (c) 2010 Robert J. Knothe  http://www.decorplanit.com/plugin/
 * Copyright (c) 2010 Sokolov Yura aka funny_falcon
 *
 * The MIT License (http://www.opensource.org/licenses/mit-license.php)
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

(function($) {
	/**
	 * Cross browser routin for getting selected range/cursor position
	 */
	function getElementSelection(that) {
		var position = {};
		if ( that.selectionStart === undefined ) { /* IE Support to find the caret position */
			that.focus();
			var select = document.selection.createRange();
			position.length = select.text.length;
			select.moveStart('character', -that.value.length);
			position.end   = select.text.length;
			position.start = position.end - position.length;
		} else {
			position.start = that.selectionStart;
			position.end   = that.selectionEnd;
			position.length= position.end - position.start;
		}
		return position;
	}
	/**
	 * Cross browser routin for setting selected range/cursor position
	 */
	function setElementSelection(that, start, end){
		if ( that.selectionStart === undefined ) {
			that.focus();
			var r = that.createTextRange();
			r.collapse(true);
			r.moveEnd(  'character', end);
			r.moveStart('character', start);
			r.select();
		} else {
			that.selectionStart = start;
			that.selectionEnd = end;
		}
	}
	
	/**
	 * run callbacks in parameters if any
	 * any parameter could be a callback:
	 * - a function, which invoked with jQuery element, parameters and this parameter name
	 *   and returns parameter value 
	 * - a name of function, attached to $.autoNumeric, which called as previous
	 * - a css selector recognized by jQuery - value of input is taken as a parameter value
	 */
	function runCallbacks($this, io) {
		$.each(io, function(k, val) {
			if ( typeof(val) === 'function' ) {
				io[k] = val($this, io, k);
			} else if ( typeof(val) === 'string' ) {
				var kind = val.substr(0, 4);
				if ( kind == 'fun:' ) {
					var fun = $.autoNumeric[val.substr(4)];
					if ( typeof(fun) === 'function' ) {
						io[k] = $.autoNumeric[val.substr(4)]($this, io, k);
					} else {
						io[k] = null;
					}
				} else if ( kind == 'css:' ) {
					io[k] = $(val.substr(4)).val();
				}
			}
		});
	}

	function convertKeyToNumber(io, key) {
		if ( typeof(io[key]) === 'string' ) { io[key] *= 1; }
	}
	
	/**
	 * Preparing user defined options for further usage
	 * merge them with defaults appropriatly
	 */
	function autoCode($this, options){ // function to update the defaults settings
		var io = $.extend({}, $.fn.autoNumeric.defaults, options);
		if ( $.metadata ) {
			io = $.extend(io, $this.metadata());/* consider declared metadata on input */
		}
		
		runCallbacks($this, io);
		
		var vmax = io.vMax.toString().split('.');
		var vmin = (!io.vMin && io.vMin !== 0) ? [] : io.vMin.toString().split('.');
		
		convertKeyToNumber(io, 'vMax');
		convertKeyToNumber(io, 'vMin');
		convertKeyToNumber(io, 'mDec');

		io.aNeg = io.vMin < 0 ? '-' : '';

		/* set mDec, if not defained by user */
		if ( typeof(io.mDec) !== 'number' ) {
			io.mDec = Math.max(
				(vmax[1] ? vmax[1] : '').length, 
				(vmin[1] ? vmin[1] : '').length);
		}
		
		/* set alternative decimal separator key */
		if ( io.altDec === null && io.mDec > 0 ) {
			if ( io.aDec == '.' && io.aSep != ',' ) {
				io.altDec = ',';
			} else if ( io.aDec == ',' && io.aSep != '.' ) {
				io.altDec = '.';
			}
		}
		
		/* cache regexps for autoStrip */
		var aNegReg = io.aNeg ? '([-\\' + io.aNeg + ']?)' : '(-?)';
		io._aNegReg = aNegReg;
		io._skipFirst = new RegExp(
			aNegReg + '[^-' + (io.aNeg ? '\\' + io.aNeg : '' )
			        + '\\' + io.aDec + '\\d]'
			        + '.*?(\\d|\\' + io.aDec + '\\d)'
		);
		io._skipLast = new RegExp(
			'(\\d\\' + io.aDec + '?)[^\\' + io.aDec + '\\d]\\D*$'
		);
		var allowed = (io.aNeg ? io.aNeg : '-') + io.aNum + '\\' + io.aDec;
		if ( io.altDec && io.altDec != io.aSep ) { allowed += io.altDec; }
		io._allowed = new RegExp('[^' + allowed + ']','gi');
		io._numReg = new RegExp(
			aNegReg + '(?:\\' + io.aDec + '?(\\d+\\' + io.aDec + 
				'\\d+)|(\\d*(?:\\' + io.aDec + '\\d*)?))'
		);
		
		return io;
	}
	
	/**
	 * strip all unwanted characters and leave only a number
	 */
	function autoStrip(s, io, strip_zero){
		/* remove currency sign */
		if ( io.aSign ) {
			while( s.indexOf( io.aSign ) > -1 ) {
				s = s.replace( io.aSign, '' );
			}
		}
		/* first replace anything before digits */
		s = s.replace(io._skipFirst, '$1$2');
		/* then replace anything after digits */
		s = s.replace(io._skipLast, '$1');
		/* then remove any uninterested characters */
		s = s.replace(io._allowed, '');
		if ( io.altDec ) { s = s.replace(io.altDec, io.aDec); }
		/* get only number string */
		var m = s.match(io._numReg);
		s = m ? [m[1], m[2], m[3]].join('') : '';
		/* strip zero if need */
		if ( strip_zero ) {
			var strip_reg = '^' + io._aNegReg + '0*(\\d' +
				(strip_zero === 'leading' ? ')' : '|$)');
			strip_reg = new RegExp(strip_reg);
			s = s.replace( strip_reg, '$1$2');
		}
		return s;
	}
	
	/**
	 * truncate decimal part of a number
	 */
	function truncateDecimal( s, aDec, mDec ) {
		if ( aDec && mDec ) {
			var parts = s.split(aDec);
			/* truncate decimal part to satisfying length */
			/* cause we would round it anyway */
			if ( parts[1] && parts[1].length > mDec ) {
				if ( mDec > 0 ) {
					parts[1] = parts[1].substring(0, mDec);
					s = parts.join(aDec);
				} else {
					s = parts[0];
				}
			}
		}
		return s;
	}
	
	/**
	 * prepare number string to be converted to real number
	 */
	function fixNumber(s, aDec, aNeg) {
		if ( aDec && aDec !== '.' ) {
			s = s.replace(aDec, '.');
		}
		if ( aNeg && aNeg !== '-' ) {
			s = s.replace(aNeg, '-');
		}
		if ( !s.match(/\d/) ) { s += '0'; }
		return s;
	}
	
	/**
	 * prepare real number to be converted to our format
	 */
	function presentNumber(s, aDec, aNeg) {
		if ( aNeg && aNeg !== '-' ) {
			s = s.replace('-', aNeg);
		}
		if ( aDec && aDec !== '.' ) {
			s = s.replace('.', aDec);
		}
		return s;
	}
	
	/**
	 * checking that number satisfy format conditions
	 * and lays between io.vMin and io.vMax
	 */
	function autoCheck(s, io){
		s = autoStrip(s, io);
		s = truncateDecimal(s, io.aDec, io.mDec);
		s = fixNumber(s, io.aDec, io.aNeg);
		var value = s * 1;
		return value >= io.vMin && value <= io.vMax;
	}
	
	/**
	 * formatting our number
	 */
	function autoGroup(iv, io){/* private function that places the thousand separtor */
		iv = autoStrip( iv, io );
		if ( iv === '' || iv == io.aNeg ) {
			if ( io.wEmpty == 'zero' ) {
				return iv + '0';
			} else if ( io.wEmpty == 'sign' ) {
				return iv + io.aSign;
			} else {
				return iv;
			}
		}
		var digitalGroup = '';
		if (io.dGroup == 2){
			digitalGroup = /(\d)((\d)(\d{2}?)+)$/;
		}
		else if (io.dGroup == 4){
			digitalGroup = /(\d)((\d{4}?)+)$/;
		}
		else {
			digitalGroup = /(\d)((\d{3}?)+)$/;
		}
		var ivSplit = iv.split(io.aDec);/* splits the string at the decimal string */
		if ( io.altDec && ivSplit.length == 1 ) {
			ivSplit = iv.split(io.altDec);
		}
		var s = ivSplit[0];/* assigns the whole number to the a varibale (s) */
		if ( io.aSep ) {
			while(digitalGroup.test(s)){ 
				s = s.replace(digitalGroup, '$1'+io.aSep+'$2');/*  re-inserts the thousand sepparator via a regualer expression */
			}
		}
		if (io.mDec !== 0 && ivSplit.length > 1){
			if ( ivSplit[1].length > io.mDec ) {
				ivSplit[1] = ivSplit[1].substring(0, io.mDec);
			}
			iv = s + io.aDec + ivSplit[1];/* joins the whole number with the deciaml value */
		}
		else {
			iv = s;/* if whole numers only */
		}
		if ( io.aSign ) {
			var has_aNeg = iv.indexOf(io.aNeg) !== -1;
			iv = iv.replace(io.aNeg, '');
			iv = io.pSign == 'p' ? io.aSign + iv : iv + io.aSign;
			if ( has_aNeg ) { iv = io.aNeg + iv; }
		}
		return iv;
	}
	
	/**
	 * round number after setting by pasting or $().autoNumericSet()
	 */
	function autoRound(iv, mDec, mRound, aPad){/* private function for round the number - please note this handled as text - Javascript math function can return inaccurate values */
		iv = (iv === '') ? '0' : iv += ''; /* value to string */
		var ivRounded = '';
		var i = 0;
		var nSign = ''; 
		if (iv.charAt(0) == '-'){/* Checks if the iv (input Value)is a negative value */
			nSign = (iv * 1 === 0) ? '' : '-';/* determines if the value is zero - if zero no negative sign */
			iv = iv.replace('-', '');/* removes the negative sign will be added back later if required */
		}
		if ((iv * 1) > 0){/* trims leading zero's if needed */
			while (iv.substr(0,1) == '0' && iv.length > 1) { 
				iv = iv.substr(1);
			}
		}
		var dPos = iv.lastIndexOf('.');/* decimal postion as an integer */
		if (dPos === 0){/* prefix with a zero if the decimal point is the first character */
			iv = '0' + iv;
			dPos = 1;
		}
		if (dPos == -1 || dPos == iv.length - 1){/* Has an integer been passed in? */
			if (aPad && mDec > 0) {
				ivRounded = (dPos == -1) ? iv + '.' : iv;
				for(i = 0; i < mDec; i++){/* pads with zero */
						ivRounded += '0';
				}
				return nSign + ivRounded;
			}
			else {
				return nSign + iv;
			}
		}
		var cDec = (iv.length - 1) - dPos;/* checks decimal places to determine if rounding is required */
		if (cDec == mDec){
			return nSign + iv;/* If true return value no rounding required */
		}
		if (cDec < mDec && aPad){/* Do we already have less than the number of decimal places we want? */
			ivRounded = iv;/* If so, pad out with zeros */
			for(i = cDec; i < mDec; i++){
				ivRounded += '0';
			}
			return nSign + ivRounded;
		}
		var rLength = dPos + mDec;/* rounded length of the string after rounding  */
		var tRound = iv.charAt(rLength + 1) * 1;/* test round */
		var ivArray = [];/* new array*/
		for(i = 0; i <= rLength; i++){/* populate ivArray with each digit in rLength */
			ivArray[i] = iv.charAt(i);
		}
		var odd = (iv.charAt(rLength) == '.') ? (iv.charAt(rLength - 1) % 2) : (iv.charAt(rLength) % 2);
		if ((tRound > 4 && mRound === 'S') ||/* Round half up symetric */
			(tRound > 4 && mRound === 'A' && nSign === '') ||/* Round half up asymetric positive values */
			(tRound > 5 && mRound === 'A' && nSign == '-') ||/* Round half up asymetric negative values */
			(tRound > 5 && mRound === 's') ||/* Round half down symetric */
			(tRound > 5 && mRound === 'a' && nSign === '') ||/* Round half down asymetric positive values */
			(tRound > 4 && mRound === 'a' && nSign == '-') ||/* Round half down asymetric negative values */
			(tRound > 5 && mRound === 'B') ||/* Round half even "Banker's Rounding" */
			(tRound == 5 && mRound === 'B' && odd == 1) ||/* Round half even "Banker's Rounding" */
			(tRound > 0 && mRound === 'C' && nSign === '') ||/* Round to ceiling toward positive infinite */
			(tRound > 0 && mRound === 'F' && nSign == '-') ||/* Round to floor toward negative inifinte */
			(tRound > 0 && mRound === 'U')){/* round up away from zero  */
			for(i = (ivArray.length - 1); i >= 0; i--){/* Round up the last digit if required, and continue until no more 9's are found */
				if (ivArray[i] == '.'){
					continue;
				}
				ivArray[i]++;
				if (ivArray[i] < 10){/* if i does not equal 10 no more round up required */
					break;
				}
			}
		}
		for (i=0; i <= rLength; i++){/* Reconstruct the string, converting any 10's to 0's */
			if (ivArray[i] == '.' || ivArray[i] < 10 || i === 0){/* routine to reconstruct non '10' */
				ivRounded += ivArray[i];
			}
			else {/* converts 10's to 0 */
				ivRounded += '0';
			}
		}
		if (mDec === 0){/* If there are no decimal places, we don't need a decimal point */
			ivRounded = ivRounded.replace('.', '');
		}
		return nSign + ivRounded;/* return rounded value */
	}
	
	/**
	 * Holder object for field properties 
	 */
	function autoNumericHolder(that, options){
		this.options = options;
		this.that = that;
		this.$that = $(that);
		this.formatted = false;
		this.io = autoCode(this.$that, this.options);
		this.value = that.value;
	}
	
	$.extend(autoNumericHolder.prototype, {
		init: function(e){
			this.value = this.that.value;
			this.io = autoCode(this.$that, this.options);
			this.cmdKey = e.metaKey;
			this.shiftKey = e.shiftKey;
			this.selection = getElementSelection(this.that);
			/* keypress event overwrites meaningfull value of e.keyCode */
			if ( e.type == 'keydown' || e.type == 'keyup' ) {
				this.kdCode = e.keyCode;
			}
			this.which = e.which;
			this.processed = false;
			this.formatted = false;
		},
		
		setSelection: function(start, end, setReal) {
			start = Math.max(start, 0);
			end = Math.min(end, this.that.value.length);
			this.selection = { start: start, end: end, length: end - start };
			if ( setReal === undefined || setReal ) { setElementSelection( this.that, start, end ); }
		},
		setPosition: function(pos, setReal) {
			this.setSelection(pos, pos, setReal);
		},
		getBeforeAfter: function() {
			var value = this.value;
			var left = value.substring(0, this.selection.start);
			var right = value.substring(this.selection.end, value.length);
			return [left, right];
		},
		getBeforeAfterStriped: function() {
			var parts = this.getBeforeAfter();
			parts[0] = autoStrip(parts[0], this.io);
			parts[1] = autoStrip(parts[1], this.io);
			return parts;
		},
		/**
		 * strip parts from excess characters and leading zeroes
		 */
		normalizeParts: function(left, right) {
			var io = this.io;
			right = autoStrip(right, io);
			/* if right is not empty and first character is not aDec, */
			/* we could strip all zeros, otherwise only leading */
			var strip = right.match(/^\d/) ? true : 'leading';
			left = autoStrip(left, io, strip);
			/* strip leading zeros from right part if left part has no digits */
			if ( (left === '' || left === io.aNeg) ) {
				if ( right > '' ) {
					right = right.replace(/^0*(\d)/,'$1');
				}
			}
			var new_value = left + right;
			/* insert zero if has leading dot */
			if ( io.aDec ) {
				var m = new_value.match(new RegExp('^'+ io._aNegReg +'\\' + io.aDec)); 
				if ( m ) {
					left = left.replace(m[1], m[1]+'0');
					new_value = left + right;
				}
			}
			/* insert zero if number is empty and io.wEmpty == 'zero' */
			if ( io.wEmpty == 'zero' && (new_value == io.aNeg || new_value === '') ) {
				left += '0';
			}
			return [left, right];
		},
		/**
		 * set part of number to value keeping position of cursor
		 */
		setValueParts: function(left, right) {
			var io = this.io;
			var parts = this.normalizeParts(left, right);
			var new_value = parts.join('');
			var position = parts[0].length;
			
			if ( autoCheck(new_value, io) ) {
				new_value = truncateDecimal( new_value, io.aDec, io.mDec );
				if ( position > new_value.length ) {
					position = new_value.length;
				}
				this.value = new_value;
				this.setPosition(position, false);
				return true;
			}
			return false;
		},
		/**
		 * helper function for expandSelectionOnSign
		 * returns sign position of a formatted value
		 */
		signPosition: function() {
			var io = this.io, aSign = io.aSign, that=this.that;
			if ( aSign ) {
				var aSignLen = aSign.length;
				if ( io.pSign == 'p' ) {
					var hasNeg = io.aNeg && that.value && that.value.charAt(0) == io.aNeg;
					return hasNeg ? [1, aSignLen + 1] : [0, aSignLen];
				} else {
					var valueLen = that.value.length;
					return [valueLen - aSignLen, valueLen];
				}
			} else {
				return [1000, -1];
			}
		},
		/**
		 * expands selection to cover whole sign
		 * prevents partial deletion/copying/overwritting of a sign
		 */
		expandSelectionOnSign: function(setReal) {
			var sign_position = this.signPosition();
			var selection = this.selection;
			if ( selection.start < sign_position[1] && selection.end > sign_position[0] ) {
				/* if selection catches something except sign and catches only space from sign */
				if ( (selection.start < sign_position[0] || selection.end > sign_position[1]) &&
					 this.value.substring(
						Math.max(selection.start, sign_position[0]),
						Math.min(selection.end,   sign_position[1])
						).match(/^\s*$/)
					 ) {
					/* then select without empty space */
					if ( selection.start < sign_position[0] ) {
						this.setSelection( selection.start, sign_position[0], setReal );
					} else {
						this.setSelection( sign_position[1], selection.end, setReal );
					}
				} else {
					/* else select with whole sign */
					this.setSelection(
						Math.min(selection.start, sign_position[0]),
						Math.max(selection.end,   sign_position[1]),
						setReal
					);
				}
			}
		},
		/**
		 * try to strip pasted value to digits
		 */
		checkPaste: function() {
			if ( this.valuePartsBeforePaste !== undefined ) {
				var parts = this.getBeforeAfter();
				var oldParts = this.valuePartsBeforePaste;
				delete this.valuePartsBeforePaste;
				/* try to strip pasted value first */
				parts[0] = parts[0].substr(0, oldParts[0].length) +
				           autoStrip(parts[0].substr(oldParts[0].length), this.io);
				if ( !this.setValueParts(parts[0], parts[1]) ) {
					this.value = oldParts.join('');
					this.setPosition( oldParts[0].length, false );
				}
			}
		},
		/**
		 * process pasting, cursor moving and skipping of not interesting keys
		 * if returns true, futher processing is not performed
		 */
		skipAllways: function(e) {
			var kdCode = this.kdCode, which = this.which, cmdKey = this.cmdKey;
			/* catch the ctrl up on ctrl-v */
			if ( kdCode == 17 && e.type == 'keyup' && this.valuePartsBeforePaste !== undefined ) {
				this.checkPaste(); 
				return false;
			}
			/* codes are taken from http://www.cambiaresearch.com/c4/702b8cd1-e5b0-42e6-83ac-25f0306e3e25/Javascript-Char-Codes-Key-Codes.aspx */
			/* skip Fx keys, windows keys, other special keys */
			if ( kdCode >= 112 && kdCode <= 123 || kdCode >= 91 && kdCode <= 93 ||
				kdCode >= 9 && kdCode <= 31 || 
				kdCode < 8 && (which === 0 || which === kdCode) ||
				kdCode == 144 || kdCode == 145 || kdCode == 45) {
				return true;
			}
			/* if select all (a=65)*/
			if ( cmdKey && kdCode == 65 ){ 
				return true;
			}
			/* if copy (c=67) paste (v=86) or cut (x=88) */ 
			if ( cmdKey && (kdCode == 67 || kdCode == 86 || kdCode == 88) ) {
				/* replace or cut whole sign */
				if ( e.type == 'keydown' ) {
					this.expandSelectionOnSign(); 
				}
				/* try to prevent wrong paste */
				if ( kdCode == 86 ) {
					if ( e.type == 'keydown' || e.type == 'keypress' ) {
						if ( this.valuePartsBeforePaste === undefined ) {
							this.valuePartsBeforePaste = this.getBeforeAfter();
						}
					} else {
						this.checkPaste();
					}
				}
				return e.type == 'keydown' || e.type == 'keypress' || kdCode == 67;
			}
			if ( cmdKey ) {
				return true;
			}
			if ( kdCode == 37 || kdCode == 39 ) {
				/* jump over thousand separator */
				var aSep = this.io.aSep, start = this.selection.start, value = this.that.value;
				if ( e.type == 'keydown' && aSep && !this.shiftKey ) {
					if ( kdCode == 37 && value.charAt(start - 2) == aSep ) {
						this.setPosition(start - 1);
					} else if ( kdCode == 39 && value.charAt(start) == aSep ) {
						this.setPosition(start + 1);
					}
				}
				return true;
			}
			if ( kdCode >= 34 && kdCode <= 40 ) {
				return true;
			}
			return false;
		},
		/**
		 * process deletion of characters
		 * returns true if processing performed
		 */
		processAllways: function() {
			var parts;
			if ( this.kdCode == 8 || this.kdCode == 46 ) { /* process backspace or delete */
				if ( !this.selection.length ) {
					parts = this.getBeforeAfterStriped();
					if ( this.kdCode == 8 ) {
						parts[0] = parts[0].substring(0, parts[0].length-1);
					} else {
						parts[1] = parts[1].substring(1, parts[1].length);
					}
					this.setValueParts( parts[0], parts[1] );
				} else {
					this.expandSelectionOnSign(false);
					parts = this.getBeforeAfterStriped();
					this.setValueParts( parts[0], parts[1] );
				}
				return true;
			}
			return false;
		},
		/**
		 * process insertion of characters
		 * returns true if processing performed
		 */
		processKeypress: function() {
			var io = this.io;
			var cCode = String.fromCharCode(this.which);
			var parts = this.getBeforeAfterStriped();
			var left = parts[0], right = parts[1];
			/* start rules when the decimal charactor key is pressed */
			if (cCode == io.aDec || (io.altDec && cCode == io.altDec) ){
				/* do not allow decimal character if no decimal part allowed */
				if ( !io.mDec || !io.aDec ) { return true; } 
				/* do not allow decimal character before aNeg character */
				if ( io.aNeg && right.indexOf(io.aNeg) > -1 ) { return true; } 
				 /* do not allow decimal character if other decimal character present */
				if ( left.indexOf( io.aDec ) > -1 ) { return true; }
				if ( right.indexOf( io.aDec ) > 0 ) { return true; }
				if ( right.indexOf( io.aDec ) === 0 ) {
					right = right.substr(1);
				} 
				this.setValueParts(left + io.aDec, right);
				return true;
			}
			/* start rule on negative sign */
			if (cCode == '-' || cCode == '+') {
				if ( !io.aNeg ) { return true; } /* prevent minus if not allowed */
				/* carret is always after minus */
				if ( left === '' && right.indexOf(io.aNeg) > -1 ) {
					left = io.aNeg;
					right = right.substring(1, right.length);
				}
				/* change sign of number, remove part if should */
				if ( left.charAt(0) == io.aNeg ) {
					left = left.substring(1, left.length);
				} else {
					left = ( cCode == '-' ) ? io.aNeg + left : left;
				}
				this.setValueParts(left, right);
				return true;
			}
			/* digits */
			if (cCode >= '0' && cCode <= '9') {
				/* if try to insert digit before minus */
				if ( io.aNeg && left === '' && right.indexOf(io.aNeg) > -1 ) {
					left = io.aNeg;
					right = right.substring(1, right.length);
				}
				this.setValueParts(left + cCode, right);
				return true;
			}
			/* prevent any other character */
			return true;
		},
		/**
		 * formatting of just processed value with keeping of cursor position
		 */
		formatQuick: function() {
			var io = this.io;
			var parts = this.getBeforeAfterStriped();
			var value = autoGroup( this.value, this.io );
			var position = value.length;
			if ( value ) {
				/* prepare regexp which searches for cursor position 
				   from unformatted left part */
				var left_ar = parts[0].split('');
				for( var i in left_ar ) {
					if ( !left_ar[i].match('\\d') ) { left_ar[i] = '\\'+left_ar[i]; }
				}
				var leftReg = new RegExp('^.*?'+ left_ar.join('.*?'));
				/* search cursor position in formatted value */
				var newLeft = value.match(leftReg);
				if ( newLeft ) {
					position = newLeft[0].length;
					/* if we are just before sign which is in prefix position */
					if ( (position === 0 && value.charAt(0) != io.aNeg || 
						  position == 1 && value.charAt(0) == io.aNeg) &&
						  io.aSign && io.pSign == 'p' ) {
						/* place carret after prefix sign */
						position = this.io.aSign.length + (value.charAt(0) == '-' ? 1 : 0 );
					}
				} else if ( io.aSign && io.pSign == 's' ) {
					/* if we could not find a place for cursor and have a sign as a suffix */
					/* place carret before suffix currency sign */
					position -= io.aSign.length;
				}
			}
			this.that.value = value;
			this.setPosition( position );
			this.formatted = true;
		}
	});
	
	
	$.fn.autoNumeric = function(options) {
		return this.each(function() {/* iterate and reformat each matched element */
			var iv = $(this);/* check input value iv */
			var holder = new autoNumericHolder(this, options);

			if ( holder.io.aForm && (this.value || holder.io.wEmpty != 'empty') ) {
				iv.autoNumericSet(iv.autoNumericGet(options), options);
			}
			
			iv.keydown(function(e){/* start keyDown event */
				holder.init(e);
				if ( holder.skipAllways(e) ) {
					holder.processed = true;
					return true;
				}
				if ( holder.processAllways() ) {
					holder.processed = true;
					holder.formatQuick();
					e.preventDefault();
					return false;
				} else {
					holder.formatted = false;
				}
				return true;
			}).keypress(function(e){/* start keypress  event*/
				var processed = holder.processed;
				holder.init(e);
				if ( holder.skipAllways(e) ) {
					return true;
				}
				if ( processed ) {
					e.preventDefault();
					return false;
				}
				if ( holder.processAllways() || holder.processKeypress() ) {
					holder.formatQuick();
					e.preventDefault();
					return false;
				} else {
					holder.formatted = false;
				}
			}).keyup(function(e){/* start keyup event routine */
				holder.init(e);
				
				var skip = holder.skipAllways(e);
				holder.kdCode = 0;
				delete holder.valuePartsBeforePaste;
				
				if ( skip )              { return true; }
				if ( this.value === '' ) { return true; }
				
				if ( !holder.formatted ) {
					holder.formatQuick();
				}
			}).bind('change focusout', function(){/* start change - thanks to Javier P. corrected the inline onChange event  added focusout version 1.55*/
				var io = holder.io, value = iv.val();
				if (value !== ''){
					value = autoStrip(value, io);
					if ( autoCheck(value, io) ) {
						value = fixNumber(value, io.aDec, io.aNeg);
						value = autoRound(value, io.mDec, io.mRound, io.aPad);
						value = presentNumber(value, io.aDec, io.aNeg); 
					} else {
						value = '';
					}
				}
				iv.val( autoGroup(value, io) );
			});//.bind('paste', function(){setTimeout(function(){autoCheck(iv, holder.io);}, 0); });/* thanks to Josh of Digitalbush.com Opera does not fire paste event*/
		});
	};
	
	function autoGet(obj) {/* thanks to Anthony & Evan C */
		if (typeof(obj) == 'string') {
		  obj = obj.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
		  obj = '#' + obj.replace(/(:|\.)/g,'\\$1'); 
		}
		return $(obj);
	}
	
	$.autoNumeric = {};
	/**
	 * public function that stripes the format and converts decimal seperator to a period
	 */
	$.autoNumeric.Strip = function(ii, options){
		var io = autoCode(autoGet(ii), options);
		var iv = autoGet(ii).val();
		iv = autoStrip( iv, io);
		iv = fixNumber( iv, io.aDec, io.aNeg );
		if ( iv * 1 === 0 ) { iv = '0'; }
		return iv;
	};
	/**
	 * public function that recieves a numeric string and formats to the target input field
	 */
	$.autoNumeric.Format = function(ii, iv, options){
		iv += '';/* to string */
		var io = autoCode(autoGet(ii), options);
		iv = autoRound(iv, io.mDec, io.mRound, io.aPad);
		iv = presentNumber(iv, io.aDec, io.aNeg);
		if ( !autoCheck(iv, io) ) { iv = autoRound('', io.mDec, io.mRound, io.aPad); }
		return autoGroup(iv, io);
	};
	/**
	 * get a number (as a number) from a field
	 * $('input#my').autoNumericGet()
	 * $('input#my').autoNumericGet({aSign: '$', pSign: 'p'})
	 */
	$.fn.autoNumericGet = function(options){
		return $.fn.autoNumeric.Strip(this, options);
	};
	/**
	 * set a number to a field, formatting it appropriatly
	 * $('input#my').autoNumericSet(2.423)
	 * $('input#my').autoNumericSet(2.423, {aSign: '$', pSign: 'p'})
	 */
	$.fn.autoNumericSet = function(iv, options){
		return this.val($.fn.autoNumeric.Format(this, iv, options)); 
	};
	$.autoNumeric.defaults = {/* plugin defaults */
		aNum: '0123456789',/*  allowed  numeric values */
		aSep: ',',/* allowed thousand separator character */
		aDec: '.',/* allowed decimal separator character */
		altDec: null,/* allow to declare alternative decimal separator which is automatically replaced by aDec */
		aSign: '',/* allowed currency symbol */
		pSign: 'p',/* placement of currency sign prefix or suffix */
		aForm: false,/* atomatically format value in form */
		mDec: null,/* max number of decimal places */
		vMax: '999999999.99', /* maximum possible value (hint: use string if you want preserve trailing spaces) */
		vMin: '0.00', /* minimum possible value */
		wEmpty: 'empty', /* what display on empty string, could be 'empty', 'zero' or 'sign' */
		dGroup: 3,/* digital grouping for the thousand separator used in Format */
		mRound: 'S',/* method used for rounding */
		aPad: true/* true= always Pad decimals with zeros, false=does not pad with zeros. If the value is 1000, mDec=2 and aPad=true, the output will be 1000.00, if aPad=false the output will be 1000 (no decimals added) Special Thanks to Jonas Johansson */
	};
	/* deprecated way to access defaults and helper functions */
	$.fn.autoNumeric.defaults = $.autoNumeric.defaults;
	$.fn.autoNumeric.Strip = $.autoNumeric.Strip;
	$.fn.autoNumeric.Format = $.autoNumeric.Format;
})(jQuery);
