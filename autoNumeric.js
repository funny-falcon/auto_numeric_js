/**
 * autoNumeric.js
 * @author: Bob Knothe
 * @author: Sokolov Yura aka funny_falcon
 * @version: 1.6.3?
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
	
	function autoCode($this, options){ // function to update the defaults settings
		var io = $.extend({}, options);
		if ( $.metadata ) {
			io = $.extend(io, $this.metadata());/* consider declared metadata on input */
		}
		if ( io.mDec ) {
			io.mDec = isNaN(io.mDec * 1) ? $('#' + io.mDec).val() * 1 : io.mDec * 1;/* sets decimal places */
		}
		if ( typeof(io.vMin) === 'number' || typeof(io.vMax) === 'number' ) {
			var set_mNum = true;
			if ( typeof(io.vMin) !== 'number' ) {
				io.vMin = io.aNeg ? -io.vMax : 0;
			}
			if ( typeof(io.vMax) !== 'number' ) {
				if ( io.mNum ) {
					io.vMax = Math.pow( 10, io.mNum ) - Math.pow( 10, -io.mDec );
					set_mNum = false;
				} else {
					alert('If you set vMin then you should set vMax or mNum!'); 
				}
			}
			if ( io.vMin < 0 && !io.aNeg ) { io.aNeg = '-';}
			if ( set_mNum ) {
				var vmax = io.vMax.toString().split('.');
				var vmin = io.vMin.toString().split('.');
				io.mNum = Math.max(
						vmax[0].replace('-','').length,
						vmin[0].replace('-','').length
				);
				if ( !io.mDec && (vmax[1] || vmin[1]) ) {
					io.mDec = Math.max(
						(vMax[1] ? vMax[1] : '').length, 
						(vMin[1] ? vMin[1] : '').length);
				}
			}
		} else {
			io.vMax = Math.pow( 10, io.mNum ) - Math.pow( 10, -io.mDec );
			io.vMin = io.aNeg ? -io.vMax : 0;
		}
		io = $.extend({}, $.fn.autoNumeric.defaults, io);
		if ( io.altDec === null && io.mDec > 0 ) {
			if ( io.aDec == '.' && io.aSep != ',' ) {
				io.altDec = ',';
			} else if ( io.aDec == ',' && io.aSep != '.' ) {
				io.altDec = '.';
			}
		}
		return io;
	}
	
	function autoStrip(s, io, strip_zero){
		if ( io.aSign ) {
			while( s.indexOf( io.aSign ) > -1 ) {
				s = s.replace( io.aSign, '' );
			}
		}
		/* remove any uninterested characters */
		var allowed = io.aNeg + io.aNum + io.aDec;
		if ( io.altDec ) { allowed += io.altDec; }
		allowed = new RegExp('[^' + allowed + ']','gi');
		s = s.replace(allowed, '');
		if ( io.altDec ) { s = s.replace(io.altDec, io.aDec); }
		/* get only number string */
		var num_reg = new RegExp( (io.aNeg ? io.aNeg+'?' : '') + '\\d*' + (io.aDec ? '(?:\\'+io.aDec+'\\d*)?' : ''));
		var m = s.match(num_reg);
		s = m ? m[0] : '';
		/* strip zero if need */
		if ( strip_zero ) {
			var strip_reg = '^(' + (io.aNeg ? io.aNeg+'?' : '') + ')0*(\\d' +
				(strip_zero === 'leading' ? ')' : '|$)');
			strip_reg = new RegExp(strip_reg);
			s = s.replace( strip_reg, '$1$2');
		}
		return s;
	}
	
	function truncateDecimal( s, aDec, mDec, join ) {
		if ( aDec && mDec ) {
			var parts = s.split(aDec);
			/* truncate decimal part to satisfying length */
			/* cause we would round it anyway */
			if ( parts[1] && parts[1].length > mDec ) {
				parts[1] = parts[1].substring(0, mDec);
			}
			s = parts.join(join);
		}
		return s;
	}
	
	function autoCheck(s, io){
		s = autoStrip(s, io);
		s = truncateDecimal(s, io.aDec, io.mDec, '.');
		if ( io.aNeg && io.aNeg !== '-' ) {
			s = s.replace(io.aNeg, '-');
		}
		if ( !s.match(/\d/) ) { s += '0'; }
		var value = s * 1;
		return value >= io.vMin && value <= io.vMax;
	}
	
	var autoNumericHolder = function(that, options){
		this.options = options;
		this.that = that;
		this.$that = $(that);
		this.formatted = false;
		this.io = autoCode(this.$that, this.options);
		this.value = that.value;
	}
	
	$.extend(autoNumericHolder.prototype, {
		init: function(e){
			var that = this.that;
			var io = autoCode(this.$that, this.options);
			this.value = this.that.value;
			this.io = io;
			this.allowed = io.aNum + io.aDec + io.aNeg;
			if ( io.altDec ) { this.allowed += io.altDec; }
			this.cmdKey = e.metaKey;
			this.shiftKey = e.shiftKey;
			this.selection = getElementSelection(this.that);
			if ( e.type == 'keydown' || e.type == 'keyup' ) {
				this.kdCode = e.keyCode;
			}
			this.which = e.which;
			this.hasNeg = io.aNeg && that.value && that.value.charAt(0) == '-';
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
		normalizeParts: function(left, right) {
			var io = this.io;
			right = autoStrip(right, io);
			/* if right is not empty and first character is not aDec, we could strip all zeros */
			/* otherwise only leading */
			var strip = right.match(/^\d/) ? true : 'leading';
			left = autoStrip(left, io, strip);
			if ( (left === '' || left === io.aNeg) ) {
				if ( right > '' ) {
					right = right.replace(/^0*(\d)/,'$1');
				}
			}
			return [left, right];
		},
		getBeforeAfterStriped: function() {
			var value = this.value;
			var left = autoStrip(value.substring(0, this.selection.start), this.io);
			var right = autoStrip(value.substring(this.selection.end, value.length), this.io);
			return [left, right];
		},
		setValueParts: function(left, right) {
			var io = this.io;
			var parts = this.normalizeParts(left, right);
			left = parts[0]; right = parts[1];
			var new_value = left + right;
			var position = left.length;
			
			var checked = autoCheck(new_value, io);
			/* allow to delete chars after overflow pasting */
			if ( !checked && !autoCheck(this.value, io) ) {
				var old_value = autoStrip(this.value, io);
				checked = old_value.length > new_value.length;
			}
			
			if ( checked ) {
				new_value = truncateDecimal( new_value, io.aDec, io.mDec, io.aDec );
				if ( position > new_value.length ) {
					position = new_value.length;
				}
				this.value = new_value;
				this.setPosition(position, false);
			}
		},
		signPosition: function() {
			var aSign = this.io.aSign;
			if ( aSign ) {
				var aSignLen = aSign.length;
				if ( this.io.pSign == 'p' ) {
					return this.hasNeg ? [1, aSignLen + 1] : [0, aSignLen];
				} else {
					var valueLen = this.that.value.length;
					return [valueLen - aSignLen, valueLen] 
				}
			} else {
				return [1000, -1];
			}
		},
		/* if selection touches sign, expand it to cover whole sign */
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
		skipAllways: function(e) {
			var kdCode = this.kdCode, which = this.which, cmdKey = this.cmdKey;
			/* catch the ctrl up on ctrl-v */
			if ( kdCode == 17 && e.type == 'keyup' ) {
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
			/* if select all (a=65) or copy (c=67)*/
			if ( cmdKey && (kdCode == 65) ){ 
				return true;
			}
			/* if paste (v=86) or cut (x=88) */ 
			if ( cmdKey && (kdCode == 67 || kdCode == 86 || kdCode == 88) ) {
				/* replace or cut whole sign */
				if ( e.type == 'keydown' ) {
					this.expandSelectionOnSign(); 
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
		processAllways: function() {
			var that = this.that, 
				selection = this.selection,
				kdCode = this.kdCode;
			if ( kdCode == 8 || kdCode == 46 ) { /* process backspace or delete */
				if ( selection.length == 0 ) {
					var parts = this.getBeforeAfterStriped();
					if ( kdCode == 8 ) {
						parts[0] = parts[0].substring(0, parts[0].length-1);
					} else {
						parts[1] = parts[1].substring(1, parts[1].length);
					}
					this.setValueParts( parts[0], parts[1] );
				} else {
					this.expandSelectionOnSign(false);
					var parts = this.getBeforeAfterStriped();
					this.setValueParts( parts[0], parts[1] );
				}
				return true;
			}
			return false;
		},
		processKeypress: function() {
			var io = this.io;
			var that = this.that;
			var cCode = String.fromCharCode(this.which);
			var parts = this.getBeforeAfterStriped();
			var left = parts[0], right = parts[1];
			/* start rules when the decimal charactor key is pressed */
			if (cCode == io.aDec || (io.altDec && cCode == io.altDec) ){
				/* do not allow decimal character if no decimal part allowed */
				if ( io.mDec == 0 || !io.aDec ) { return true; } 
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
			if (cCode == '-') {
				if ( !io.aNeg ) { return true; } /* prevent minus if not allowed */
				/* carret is always after minus */
				if ( left == '' && right.indexOf(io.aNeg) > -1 ) {
					left = io.aNeg;
					right = right.substring(1, right.length);
				}
				/* change sign of number, remove part if should */
				if ( left.charAt(0) == io.aNeg ) {
					left = left.substring(1, left.length);
				} else {
					left = io.aNeg + left;
				}
				this.setValueParts(left, right);
				return true;
			}
			/* digits */
			if (cCode >= '0' && cCode <= '9') {
				/* if try to insert digit before minus */
				if ( io.aNeg && left == '' && right.indexOf(io.aNeg) > -1 ) {
					left = io.aNeg;
					right = right.substring(1, right.length);
				}
				this.setValueParts(left + cCode, right);
				return true;
			}
			/* prevent any other character */
			return true;
		},
		formatQuick: function() {
			var io = this.io;
			var parts = this.getBeforeAfterStriped();
			var value = autoGroup( this.value, this.io );
			var position = value.length;
			if ( value ) {
				var left_ar = parts[0].split('');
				for( i in left_ar ) {
					if ( left_ar[i] === '.' ) { left_ar[i] = '\\.'; }
				}
				var leftReg = new RegExp('^.*?'+ left_ar.join('.*?'));
				var newLeft = value.match(leftReg);
				if ( newLeft ) {
					position = newLeft[0].length;
					/* if we are just before prefix sign */
					if ( (position == 0 && value.charAt(0) != io.aNeg || 
						  position == 1 && value.charAt(0) == io.aNeg) &&
						  io.aSign && io.pSign == 'p' ) {
						/* place carret after prefix sign */
						position = this.io.aSign.length + (value.charAt(0) == '-' ? 1 : 0 );
					}
				} else if ( io.aSign && io.pSign == 's' ) {
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

			if ( holder.io.aForm ) {
				iv.autoNumericSet(iv.autoNumericGet(options), options);
			}
			
			iv.keydown(function(e){/* start keyDown event */
				holder.keyDown = true;
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
					holder.formatted = false
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
					holder.formatted = false
				}
			}).keyup(function(e){/* start keyup event routine */
				/* fix strange bug of double keyup */
				if ( !holder.keyDown ) { return false; }
				holder.keyDown = false;
				var formatted = holder.formatted;
				holder.init(e);
				if ( holder.skipAllways(e) ) {
					holder.kdCode = 0;
					return true;
				}
				holder.kdCode = 0;
				if ( this.value === '' ) {
					return true;
				}
				if ( !holder.formatted ) {
					holder.formatQuick();
				}
			}).bind('change focusout', function(){/* start change - thanks to Javier P. corrected the inline onChange event  added focusout version 1.55*/
				var io = holder.io, value = iv.val();
				if (value !== ''){
					value = autoStrip(value, io);
					if ( autoCheck(value, io) ) {
						if ( io.aDec ) { value = value.replace(io.aDec, '.'); }
						value = autoRound(value, io.mDec, io.mRound, io.aPad);
						if ( io.aDec ) { value = value.replace('.', io.aDec); }
						iv.val( autoGroup(value, io) );
					} else {
						iv.val('');
					}
				}		
			}) //.bind('paste', function(){setTimeout(function(){autoCheck(iv, holder.io);}, 0); });/* thanks to Josh of Digitalbush.com Opera does not fire paste event*/
		});
	};
	function autoGet(obj) {/* thanks to Anthony & Evan C */
		if (typeof(obj) == 'string') {
		  obj = obj.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
		  obj = '#' + obj.replace(/(:|\.)/g,'\\$1'); 
		}
		return $(obj);
	}

	function autoGroup(iv, io){/* private function that places the thousand separtor */
			if ( iv == '' || iv == io.aNeg ) { return ''; }
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
			iv = autoStrip( iv, io );
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
			if (iv.indexOf('-') !== -1 && io.aSign !== '' && io.pSign == 'p'){/* places the currency sign to the left (prefix) */
				iv = iv.replace('-', '');
				return '-' + io.aSign + iv;
			}
			else if (iv.indexOf('-') == -1  && io.aSign !== '' && io.pSign == 'p'){
				return io.aSign + iv;
			}
			if (iv.indexOf('-') !== -1 && io.aSign !== '' && io.pSign == 's'){/* places the currency sign to the right (suffix) */
				iv = iv.replace('-', '');
				return '-'+ iv + io.aSign;
			}
			else if (iv.indexOf('-') == -1  && io.aSign !== '' && io.pSign == 's'){
				return iv + io.aSign;
			}
			else {
				return iv;
			}
	}
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
	$.fn.autoNumeric.Strip = function(ii, options){/* public function that stripes the format and converts decimal seperator to a period */
		var io = autoCode(autoGet(ii), options);
		var iv = autoGet(ii).val();
		iv = iv.replace(io.aSign, '').replace('\u00A0','');
		var reg = new RegExp('[^'+'\\-'+io.aNum+io.aDec+']','gi');/* regular expreession constructor */
		iv = iv.replace(reg,'');/* deletes all characters that are not permitted in this field */
		var nSign = ''; 
		if (iv.charAt(0) == '-'){/* Checks if the iv (input Value)is a negative value */
			nSign = (iv * 1 === 0) ? '' : '-';/* determines if the value is zero - if zero no negative sign */
			iv = iv.replace('-', '');/*  removes the negative sign will be added back later if required */
		}
		iv = iv.replace(io.aDec, '.');
		if (iv * 1 > 0){
			while (iv.substr(0,1) == '0' && iv.length > 1) { 
				iv = iv.substr(1); 
			}
		}
		iv = (iv.lastIndexOf('.') === 0) ? ('0' + iv) : iv;
		iv = (iv * 1 === 0) ? '0' : iv;
		return nSign + iv;
	};
	$.fn.autoNumeric.Format = function(ii, iv, options){/* public function that recieves a numeric string and formats to the target input field */
		iv += '';/* to string */
		var io = autoCode(autoGet(ii), options);
		iv = autoRound(iv, io.mDec, io.mRound, io.aPad);
		var nNeg = 0;
		if (iv.indexOf('-') != -1 && io.aNeg === ''){/* deletes negative symbol */
			iv = '';
		}
		else if (iv.indexOf('-') != -1 && io.aNeg == '-'){
			nNeg = 1;
		}
		if (iv.indexOf('.') == -1 && iv.length > (io.mNum + nNeg)){/* check to see if the maximum & minimum values have been exceeded when no decimal point is present */
			iv = '';
		}
		else if (iv.indexOf('.') > (io.mNum + nNeg)){/* check to see if the maximum & minimum values have been exceeded when a decimal point is present */
			iv = '';
		}
		if (io.aDec != '.'){/* replaces the decimal point with the new sepatator */
			iv = iv.replace('.', io.aDec);
		}
		return autoGroup(iv, io);
	};
	$.fn.autoNumericGet = function(options){
		return $.fn.autoNumeric.Strip(this, options); 
	};
	$.fn.autoNumericSet = function(iv, options){
		return this.val($.fn.autoNumeric.Format(this, iv, options)); 
	};
	$.fn.autoNumeric.defaults = {/* plugin defaults */
		aNum: '0123456789',/*  allowed  numeric values */
		aNeg: '',/* allowed negative sign / character */
		aSep: ',',/* allowed thousand separator character */
		aDec: '.',/* allowed decimal separator character */
		altDec: null,/* allow to replace alternative dec */
		aSign: '',/* allowed currency symbol */
		pSign: 'p',/* placement of currency sign prefix or suffix */
		aForm: false,/* atomatically format value in form */
		mNum: 9,/* max number of numerical characters to the left of the decimal */
		mDec: 2,/* max number of decimal places */
		dGroup: 3,/* digital grouping for the thousand separator used in Format */
		mRound: 'S',/* method used for rounding */
		aPad: true/* true= always Pad decimals with zeros, false=does not pad with zeros. If the value is 1000, mDec=2 and aPad=true, the output will be 1000.00, if aPad=false the output will be 1000 (no decimals added) Special Thanks to Jonas Johansson */
	};
})(jQuery);
