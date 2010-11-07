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
	
	function setCarretPosition(that, pos){
		setElementSelection(that, pos, pos);
	}
	
	function autoCode($this, options){ // function to update the defaults settings
		var opts = $.extend({}, options);
		if ( $.metadata ) {
			opts = $.extend(opts, $this.metadata());/* consider declared metadata on input */
		}
		if ( opts.mDec ) {
			opts.mDec = isNaN(opts.mDec * 1) ? $('#' + opts.mDec).val() * 1 : opts.mDec * 1;/* sets decimal places */
		}
		opts = $.extend({}, $.fn.autoNumeric.defaults, opts);
		if ( opts.altDec === null && opts.mDec > 0 ) {
			if ( opts.aDec == '.' && opts.aSep != ',' ) {
				opts.altDec = ',';
			} else if ( opts.aDec == ',' && opts.aSep != '.' ) {
				opts.altDec = '.';
			}
		}
		return opts;
	}
	
	var autoNumericHolder = function(that, options){
		this.options = options;
		this.that = that;
		this.$that = $(that);
		this.formatted = false;
		this.io = autoCode(this.$that, this.options);
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
			if ( e.type == 'keydown' || e.type == 'keyup' || e.which == 0 ) {
				this.kdCode = e.keyCode;
			} else {
				this.kdCode = 0;
			}
			this.which = e.which;
			this.hasNeg = io.aNeg && that.value && that.value.charAt(0) == '-';
			this.processed = false;
			this.prevent = false;
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
		getBeforeAfterStriped: function() {
			var value = this.value;
			var io = this.io;
			var allowed = io.aNum + io.aDec + io.aNeg;
			var reg = new RegExp('[^' + allowed + ']','gi'); /* remove any uninterested characters */
			var left = value.substring(0, this.selection.start).replace(io.aSign,'').replace(reg, '');
			var right = value.substring(this.selection.end, value.length).replace(io.aSign,'').replace(reg, '');
			return [left, right];
		},
		signPosition: function() {
			if ( this.io.aSign ) {
				if ( this.io.pSign == 'p' ) {
					return this.hasNeg ? [1, this.io.aSign.length + 1] : [0, this.io.aSign.length];
				} else {
					return [this.that.value.length - this.io.aSign.length, this.that.value.length] 
				}
			} else {
				return [1000, -1];
			}
		},
		/* if selection touches sign, expand it to cover whole sign */
		expandSelectionOnSign: function(setReal) {
			var sign_position = this.signPosition();
			if ( this.selection.start < sign_position[1] && this.selection.end > sign_position[0] ) {
				this.setSelection(
					Math.min(this.selection.start, sign_position[0]),
					Math.max(this.selection.end,   sign_position[1]),
					setReal
				);
			}
		},
		skipAllways: function(e) {
			/* codes are taken from http://www.cambiaresearch.com/c4/702b8cd1-e5b0-42e6-83ac-25f0306e3e25/Javascript-Char-Codes-Key-Codes.aspx */
			/* skip Fx keys, windows keys, other special keys */
			if ( this.kdCode >= 112 && this.kdCode <= 123 || this.kdCode >= 91 && this.kdCode <= 93 ||
				this.kdCode >= 9 && this.kdCode <= 31 || 
			 	this.kdCode < 8 && (this.which === 0 || this.which === this.kdCode) ||
			 	this.kdCode == 144 || this.kdCode == 145 || this.kdCode == 45) {
				return true;
			}
			/* if select all (a=65) or copy (c=67)*/
			if ( this.cmdKey && (this.which == 65 || this.which == 67) ){ 
				return true;
			}
			/* if paste (v=86) or cut (x=88) */ 
			if ( this.cmdKey && (this.which == 86 || this.which == 88) ) {
				/* replace or cut whole sign */
				this.expandSelectionOnSign(); 
				return true;
			}
			if ( this.cmdKey ) {
				return true;
			}
			if ( this.kdCode == 37 || this.kdCode == 39 ) {
				/* jump over thousand separator */
				if ( e.type == 'keydown' && this.io.aSep && !this.shiftKey ) {
					if ( this.kdCode == 37 && this.that.value.charAt(this.selection.start - 2) == this.io.aSep ) {
						this.setPosition(this.selection.start - 1);
					} else if ( this.kdCode == 39 && this.that.value.charAt(this.selection.start) == this.io.aSep ) {
						this.setPosition(this.selection.start + 1);
					}
				}
				return true;
			}
			if ( this.kdCode >= 34 && this.kdCode <= 40 ) {
				return true;
			}
		},
		processAllways: function() {
			var that = this.that;
			if ( this.kdCode == 8 || this.kdCode == 46 ) { /* process backspace or delete */
				if ( this.selection.length == 0 ) {
					var parts = this.getBeforeAfterStriped();
					if ( this.kdCode == 8 ) {
						parts[0] = parts[0].substring(0, parts[0].length-1);
					} else {
						parts[1] = parts[1].substring(1, parts[1].length);
					}
					this.value = parts[0] + parts[1];
					this.setPosition(parts[0].length, false);
				} else {
					this.expandSelectionOnSign(false);
					this.value = this.value.substring(0, this.selection.start) + 
					             this.value.substring(this.selection.end, this.value.length);
					this.setPosition(this.selection.start, false);
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
				if ( left.indexOf( io.aDec ) > -1 || right.indexOf( io.aDec ) > -1 ) { 
					return true; 
				}
				this.value = left + io.aDec + right;
				this.setPosition((left + io.aDec).length, false);
				return true;
			}
			/* start rule on negative sign */
			if (cCode == '-') {
				if ( !io.aNeg ) { return true; } /* prevent minus if not allowed */
				/* change sign of number, remove part if should */
				if ( left == '' && right.indexOf(io.aNeg) > -1 ) {
					left = io.aNeg;
					right = right.substring(1, right.length);
				}
				if ( left.charAt(0) == io.aNeg ) {
					left = left.substring(1, left.length);
					this.value = left + right;
					this.setPosition(left.length, false);
				} else {
					this.value = io.aNeg + left + right;
					this.setPosition((io.aNeg + left).length, false);
				}
				return true;
			}
			/* digits */
			if (cCode >= '0' && cCode <= '9') {
				/* if try to insert digit before minus */
				if ( io.aNeg && left == '' && right.indexOf(io.aNeg) > -1 ) {
					left = io.aNeg;
					right = right.substring(1, right.length);
				}
				var new_value = left + cCode + right;
				var position = (left + cCode).length;
				if ( io.mDec && io.aDec ) {
					var splited = new_value.replace(io.aNeg,'').split(io.aDec);
					left = splited[0];
					right = splited[1];
				} else {
					left = new_value.replace(io.aNeg,'');
					right = '';
				}
				if ( left.length <= io.mNum ) {
					this.value = new_value;
					this.setPosition(position, false);
					/* we allow to place superfluous decimal digits cause we would catch them
					   in a formatQuick and autoGroup */
				}
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
				var leftReg = new RegExp('^.*?'+ parts[0].split('').join('.*?'));
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
				holder.init(e);
				if ( holder.skipAllways(e) ) {
					return true;
				}
				if ( this.value === '' ) {
					return true;
				}
				if ( !holder.formatted ) {
					holder.formatQuick();
				}
			}).bind('change focusout', function(){/* start change - thanks to Javier P. corrected the inline onChange event  added focusout version 1.55*/
				if (iv.val() !== ''){
					autoCheck(iv, holder.io);
				}		
			}).bind('paste', function(){setTimeout(function(){autoCheck(iv, holder.io);}, 0); });/* thanks to Josh of Digitalbush.com Opera does not fire paste event*/
		});
	};
	function autoGet(obj) {/* thanks to Anthony & Evan C */
	    if (typeof(obj) == 'string') {
		  obj = obj.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
		  obj = '#' + obj.replace(/(:|\.)/g,'\\$1'); 
		}
		return $(obj);
	}

	function aDecIndex(value, io) { /* checks value on digit character */
		if (io.aSign.indexOf(io.aDec) != -1 && io.pSign == 's') { /* allow a dot in suffix sign */
			value = value.replace(io.aSign, '');
		}
		return value.indexOf(io.aDec);
	}
	function autoCount(str, start, end){/* private function that counts the numeric characters to the left and right of the decimal point */
		var chr = '';
		var numCount = 0; 
		for (j = start; j < end; j++){
			chr = str.charAt(j);
			if (chr >= '0' && chr <= '9'){
				numCount++;
			}
		}
		return numCount;
	}
	function autoGroup(iv, io){/* private function that places the thousand separtor */
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
			if ( io.aSign ) {
			  iv = iv.replace(io.aSign, ''); /* clears the currency */
			}
			iv = iv.replace("\u00A0",'');/* clears the currency or other symbols and space */
			if ( io.aSep ) {
			  iv = iv.split(io.aSep).join('');/* removes the thousand sepparator */
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
	function autoCheck(iv, io){/*  private function that change event and pasted values  */
		var val = iv.val();
		if ( val.length > 100 ) { /* maximum length of pasted value */
			iv.val('');
			return;
		}
		val = val.replace(io.aSign, '');
		if (io.altDec) {
		    val = val.replace(io.altDec, io.aDec);
		}
		var eNeg = '';
		if (io.aNeg == '-'){/* escape the negative sign */
			eNeg = '\\-';
		}
		var reg = new RegExp('[^'+eNeg+io.aNum+io.aDec+']','gi');/* regular expreession constructor to delete any characters not allowed for the input field. */
		var testPaste = val.replace(reg,'');/* deletes all characters that are not permitted in this field */
		if (testPaste.lastIndexOf('-') > 0 || testPaste.indexOf(io.aDec) != testPaste.lastIndexOf(io.aDec)){/* deletes input if the negitive sign is incorrectly placed or if the are multiple decimal characters */
			testPaste = '';
		} 
		var rePaste = '';
		var nNeg = 0;
		var nSign = '';
		var i = 0;
		var s = testPaste.split('');/* split the sting into an array */
		for (i=0; i<s.length; i++){/* for loop testing pasted value after non allowable characters have been deleted */
			if (i === 0 && s[i] == '-'){/* allows negative symbol to be added if it is the first character */
				nNeg = 1;
				nSign = '-';
				continue;
			}
			if (s[i] == io.aDec && s.length -1 == i){/* if the last charter is a decimal point it is dropped */
				break;
			}
			if (rePaste.length === 0 && s[i] == '0' && (s[i+1] >= 0 || s[i+1] <= 9)){/* controls leading zero */
				continue;
			}
			else {
				rePaste = rePaste + s[i];
			}

		}
		rePaste = nSign + rePaste;
		if (rePaste.indexOf(io.aDec) == -1 && rePaste.length > (io.mNum + nNeg)){/* checks to see if the maximum & minimum values have been exceeded when no decimal point is present */
			rePaste = '';
		}
		if (rePaste.indexOf(io.aDec) > (io.mNum + nNeg)){/* check to see if the maximum & minimum values have been exceeded when the decimal point is present */
			rePaste = '';
		}
		if (rePaste.indexOf(io.aDec) != -1 && (io.aDec != '.')){
			rePaste = rePaste.replace(io.aDec, '.');
		}
		rePaste = autoRound(rePaste, io.mDec, io.mRound, io.aPad);/* call round function */
		if (io.aDec != '.'){
			rePaste = rePaste.replace('.', io.aDec);/* replace the decimal point with the proper decimal separator */
		}
		if (rePaste !== ''){
			rePaste = autoGroup(rePaste, io);/* calls the group function adds digital grouping */
		}
		iv.val(rePaste);
		return false;
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
		wSign: false,/* allow to enter number placing cursor on sign */
		aForm: false,/* atomatically format value in form */
		mNum: 9,/* max number of numerical characters to the left of the decimal */
		mDec: 2,/* max number of decimal places */
		dGroup: 3,/* digital grouping for the thousand separator used in Format */
		mRound: 'S',/* method used for rounding */
		aPad: true/* true= always Pad decimals with zeros, false=does not pad with zeros. If the value is 1000, mDec=2 and aPad=true, the output will be 1000.00, if aPad=false the output will be 1000 (no decimals added) Special Thanks to Jonas Johansson */
	};
})(jQuery);
