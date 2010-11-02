/**
 * autoNumeric.js
 * @author: Bob Knothe
 * @version: 1.6.2
 *
 * Created by Robert J. Knothe on 2010-10-25. Please report any bug at http://www.decorplanit.com/plugin/
 *
 * Copyright (c) 2010 Robert J. Knothe  http://www.decorplanit.com/plugin/
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
	$.fn.autoNumeric = function(options) {
		var opts = $.extend({}, $.fn.autoNumeric.defaults, options);/* build main options before element iteration */
		return this.each(function() {/* iterate and reformat each matched element */
			var iv = $(this);/* check input value iv */
			var ii = this.id;/* input ID */
			var io = $.metadata ? $.extend({}, opts, iv.metadata()) : opts;/* build element specific options io = input options */
			io.mDec = isNaN(io.mDec * 1) ? $('#' + io.mDec).val() * 1 : io.mDec * 1;/* sets decimal places */
			var kdCode = '';/* Key down Code */
			var selectLength = 0;/* length of input selected */
			var caretPos = 0;/* caret poistion */
			var inLength = 0;/* length prior to keypress event */
			var charLeft = 0;/* number of characters to the left of the decimal point */
			var numLeft = 0;/* number of numeric characters to the left of the decimal point */
			var numRight = 0;/* number of numeric characters to the right of the decimal point */
			var cmdKey = false;/* MAC command ket pressed */
			$(this).keydown(function(e){/* start keyDown event */
				io = $.metadata ? $.extend({}, opts, iv.metadata()) : opts;/* build element specific options io = input options */
				io.mDec = isNaN(io.mDec * 1) ? $('#' + io.mDec).val() * 1 : io.mDec * 1;/* sets decimal places */
				cmdKey = false;
				if (!e){/* routine for key  codes on key down */
					e = window.event;
				}
				if (e.keyCode){/* IE support */
					kdCode = e.keyCode;
				}
				else if (e.which){/* FF & O support */
					kdCode = e.which;
				}
				if(e.metaKey){/* tests for Mac command key being pressed down thanks Bart B. for bring to my attention */
					cmdKey = true;
				}
				if (document.selection){/* IE Support to find the caret position */
					this.focus();
					var select = document.selection.createRange();
					selectLength = document.selection.createRange().text.length;
					select.moveStart('character', -this.value.length);
					caretPos = (select.text.length - selectLength) * 1;
				}
				else if (this.selectionStart || this.selectionStart == '0'){/* Firefox support  to find the caret position */
					selectLength = this.selectionEnd * 1 - this.selectionStart * 1;
					caretPos = this.selectionStart * 1;
				}/* end caret position routine */
				inLength = this.value.length;/* pass string length to keypress event for value left & right of the decimal position & keyUp event to set caret position */
			}).keypress(function(e){/* start keypress  event*/
				var allowed = io.aNum + io.aNeg + io.aDec;/* sets allowed input, number, negitive sign and decimal seperator */
				charLeft = (this.value.lastIndexOf(io.aDec) == -1) ? inLength : inLength - (inLength - this.value.lastIndexOf(io.aDec));/* characters to the left of the decimal point */
				numLeft = autoCount(this.value, 0, charLeft);/* the number of intergers to the left of the decimal point */
				if (this.value.lastIndexOf(io.aDec) != -1){
					numRight = autoCount(this.value, charLeft, inLength);/* the number of intergers to the right of the decimal point */
				}
				if ((e.ctrlKey || cmdKey) && (kdCode == 65 || kdCode == 67 || kdCode == 86 || kdCode == 88)){/* allows controll key & select all (v=65) Thanks Jonas Johansson, copy(c=67), past (v=86), cut (v=88)  */
					return true;
				}
				if (kdCode == 8 || kdCode == 9 || kdCode == 13 || kdCode == 35 || kdCode == 36 || kdCode == 37 || kdCode == 39 || kdCode == 46){/* allows the backspace (8), tab (9), enter 13, end (35), home(36), left(37) and right(39) arrows key  delete key (46) to function in some browsers (FF & O) - Thanks to Bart Bons on the return key */
					return true;
				}
				var kpCode = '';/* Key Press Code */
				if (!e){/* routine for key  codes on key down */
					e = window.event;
				}
				if (e.keyCode){/* IE */
					kpCode = e.keyCode;
				}
				else if (e.which){/* FF & O */
					kpCode = e.which;
				}
				var cCode = String.fromCharCode(kpCode);/* Character code*/
				if (allowed.indexOf(cCode) == -1){/* checks for allowed characters */
					e.preventDefault();
				}
				if (cCode == io.aDec){/* start rules when the decimal charactor key is pressed */
					if (selectLength == inLength && selectLength > 0){/* allows the selected input to be replaced with a number - Thanks Bart V. */
						return;
					}					
					if(caretPos <= this.value.lastIndexOf('-') || this.value.indexOf(io.aDec) != -1 || io.mDec === 0){/* prevents the decimal decimal character from being enetered left of the negitive symbol  */
						e.preventDefault();
					}
					if(caretPos <= this.value.lastIndexOf(io.aSep) && this.value.lastIndexOf(io.aSep) != -1 && io.aSep !== ''){/* prevents the decimal charactor from being entered to the left of a thousand separator */
						if(io.pSign == 's' && io.aSign.indexOf(' ') >= 0){/* rules when the curency symbol has a space character and is placed as a suffix and the thousand separator is also a space */
							var subStr = this.value.substring(0, this.value.length - io.aSign.length);
							var subStrPos = subStr.lastIndexOf(' ');
							if(caretPos > subStrPos && caretPos >= subStr.length - io.mDec){
								return;
							}
							else {
								e.preventDefault();
							}							
						}
						else {
							e.preventDefault();
						}	
					}
					if(io.aSign === '' && caretPos < this.value.length - io.mDec){/* decimal placement & accuracy with no currency symbol */
						e.preventDefault();
					}
					if(io.aSign !== '' && io.pSign == 'p' && (this.value.length - caretPos > io.mDec || caretPos < io.aSign.length)){/* decimal placement & accuracy with with currency symbol as prefix */
						e.preventDefault();
					}
					if(io.aSign !== '' && io.pSign == 's' && (caretPos > this.value.length - io.aSign.length || caretPos < this.value.length - (io.aSign.length + io.mDec))){/* decimal placement & accuracy with with currency symbol as suffix */
						e.preventDefault();					
					}					
				}/*  end rules when the decimal charactor key is pressed */
				if (kpCode == 45 && (caretPos > 0 || this.value.indexOf('-') != -1 || io.aNeg === '')){/* start rules when the negative key pressed */ 
					if (selectLength >= 1 && caretPos === 0){/* allows the selected input to be replaced with a number - Thanks Bart V.  */
						return;
					}
					else{
						e.preventDefault();
					}
				}/* end rules when the negative key pressed */
				if (kpCode >= 48 && kpCode <= 57){/* start rules for number key press */ 
					if (selectLength > 0){/* allows the selected input to be replaced with a number - Thanks Bart V. */
						return;
					}	
					if (caretPos < io.aSign.length && io.aSign !== '' && io.pSign == 'p' && inLength > 0){/* prevents numbers from being entered to the left of the currency sign when the currency symbol is on the left */
						e.preventDefault();
					}
					if (caretPos > this.value.length - io.aSign.length && io.aSign !== '' && io.pSign == 's' && this.value !== ''){/* prevents numbers from being entered to the right of the currency sign when the currency symbol is on the right */
						e.preventDefault();
					}
					if (caretPos == this.value.lastIndexOf('-')){/* prevents numbers from being entered to the left negative sign */
						e.preventDefault();
					}
					if (numLeft >= io.mNum && caretPos <= charLeft){/* checks for max numeric characters to the left of the decimal point */
						e.preventDefault();
					}
					if (this.value.indexOf(io.aDec) != -1 && caretPos >= charLeft + 1 && numRight >= io.mDec){/* checks for max numeric characters to the left and right of the decimal point */
						e.preventDefault();
					}					
				}/* end rules for number key press  */
			}).keyup(function(e){/* start keyup event routine */
				if (this.value === '') { /* Fix to let you delete what is in the textbox without it adding padded zeroes - bcull - 6 Sep 2010 */
					return;
				}
				if (io.aSep === '' || e.keyCode == 9 || e.keyCode == 20 || e.keyCode == 35 || e.keyCode == 36 || e.keyCode == 37 || e.keyCode == 39 || kdCode == 9 || kdCode == 13 || kdCode == 20 || kdCode == 35 || kdCode == 36 || kdCode == 37 || kdCode == 39){/* allows the tab(9), end(35), home(36) left(37) & right(39) arrows and when there is no thousand separator to bypass the autoGroup function  */
					return;/* key codes 35 & 36 Home and end keys fix thanks to JPM USA  */
				}
				/* if(kdCode == 110 && this.value.indexOf(io.aDec) == -1 && io.mDec > 0 && caretPos >= this.value.length - io.mDec && this.value.lastIndexOf(io.aSep) < caretPos && this.value.lastIndexOf('-') < caretPos){ //start modification for period key to enter a comma on numeric pad 
					$(this).val(this.value.substring(0, caretPos) + io.aDec + this.value.substring(inLength, caretPos));
				}*/
				$(autoId(ii)).val(autoGroup(this.value, io));/* adds the thousand sepparator */
				var outLength = this.value.length;	
				charLeft = (this.value.lastIndexOf(io.aDec) == -1) ? outLength : outLength - (outLength - this.value.lastIndexOf(io.aDec));
				numLeft = autoCount(this.value, 0, charLeft);/* the number of intergers to the left of the decimal point */
				if (numLeft > io.mNum){/* if max number of characters are exceeeded */
					$(autoId(ii)).val('');
				}	
				var setCaret = 0;/* start - determines the new caret position  */
				if (inLength < outLength){/* new caret position when a number or decimal character has been added */
					setCaret = (outLength == io.aSign.length + 1 && io.pSign == 's') ? 1 : caretPos + (outLength - inLength);
				}
				if (inLength > outLength){ /* new caret position when a number(s) or decimal character(s) has been deleted */
					if(selectLength === 0){
						if((inLength - 2) == outLength){/* when two caracters one numeric and one thosand seperator have been deleted */
							if(kdCode == 8){/* back space key pressed */
								setCaret = (caretPos - 2);
							}
							else if(kdCode == 46){/* delete key pressed */
								setCaret = caretPos;
							}
							else{
								setCaret = (caretPos - 1);
							}	
						}
						else{/* back space key pressed */
							setCaret = (kdCode == 8) ? caretPos - 1 : caretPos;
						}
					}
					if(selectLength > 0 && selectLength < inLength){/* when multiple characters but not all are deleted */
						setCaret = (outLength - (inLength - (caretPos + selectLength)));
					}
					if(selectLength == inLength){/* when multiple characters but not all are deleted */
						setCaret = (outLength == io.aSign.length + 1 && io.pSign == 's') ? 1 : 1 + io.aSign.length;
					}					
				} 
				if (inLength == outLength){/* new caret position when a and equal aount of characters have been added as the amount deleted */
					if(selectLength >= 0){
						setCaret = caretPos + selectLength;
					}
					if(this.value.charAt(caretPos - 1) == io.aSep && kdCode == 8){/* moves caret to the left when trying to delete thousand separartor via the backspace key */
						setCaret = (caretPos - 1);
					}
					else if(this.value.charAt(caretPos) == io.aSep && kdCode == 46){/* moves caret to the right when trying to delete thousand separartor via the delete key */
						setCaret = (caretPos + 1);
					}
				}/*  ends - determines the new caret position  */
				var iField = this;/* start - set caret position */
				iField.focus();
				if (document.selection) {
					var iRange = iField.createTextRange();
					iRange.collapse(true);
					iRange.moveStart("character", setCaret);
					iRange.moveEnd("character", 0);
					iRange.select();
				}
				else if (iField.selectionStart || iField.selectionStart == '0') {
					iField.selectionStart = setCaret;
					iField.selectionEnd = setCaret;
				}/* end - set caret position */ 
			}).bind('change focusout', function(){/* start change - thanks to Javier P. corrected the inline onChange event  added focusout version 1.55*/
				if ($(autoId(ii)).val() !== ''){
					autoCheck(iv, ii, io);
				}		
			}).bind('paste', function(){setTimeout(function(){autoCheck(iv, ii, io);}, 0); });/* thanks to Josh of Digitalbush.com Opera does not fire paste event*/
		});
	};
	function autoId(myid) {/* thanks to Anthony & Evan C */
		myid = myid.replace(/\[/g, "\\[").replace(/\]/g, "\\]"); 
		return '#' + myid.replace(/(:|\.)/g,'\\$1');
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
		if (io.aSep !== ''){
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
			for (k = 0; k < io.aSign.length; k++){/* clears the currency or other symbols and space */
				iv = iv.replace(io.aSign.charAt(k), '').replace("\u00A0",'');
			}
			iv = iv.split(io.aSep).join('');/* removes the thousand sepparator */
			var ivSplit = iv.split(io.aDec);/* splits the string at the decimal string */
			var s = ivSplit[0];/* assigns the whole number to the a varibale (s) */
			while(digitalGroup.test(s)){ 
				s = s.replace(digitalGroup, '$1'+io.aSep+'$2');/*  re-inserts the thousand sepparator via a regualer expression */
			}
			if (io.mDec !== 0 && ivSplit.length > 1){ 
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
	function autoCheck(iv, ii, io){/*  private function that change event and pasted values  */
		iv = iv.val();
		if (iv.length > 100){/* maximum length of pasted value */
			$(autoId(ii)).val('');
			return;
		}
		var eNeg = '';
		if (io.aNeg == '-'){/* escape the negative sign */
			eNeg = '\\-';
		}
		var reg = new RegExp('[^'+eNeg+io.aNum+io.aDec+']','gi');/* regular expreession constructor to delete any characters not allowed for the input field. */
		var testPaste = iv.replace(reg,'');/* deletes all characters that are not permitted in this field */
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
		if (rePaste !== '' && io.aSep !== ''){
			rePaste = autoGroup(rePaste, io);/* calls the group function adds digital grouping */
		}
		$(autoId(ii)).val(rePaste);
		return false;
	}
	$.fn.autoNumeric.Strip = function(ii, options){/* public function that stripes the format and converts decimal seperator to a period */
		var opts = $.extend({}, $.fn.autoNumeric.defaults, options);
		var io = $.metadata ? $.extend({}, opts, $(autoId(ii)).metadata()) : opts;
		io.mDec = isNaN(io.mDec * 1) ? $('#' + io.mDec).val() * 1 : io.mDec * 1;/* decimal places */
		var iv = $(autoId(ii)).val();
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
		var opts = $.extend({}, $.fn.autoNumeric.defaults, options);
		var io = $.metadata ? $.extend({}, opts, $(autoId(ii)).metadata()) : opts;
		io.mDec = isNaN(io.mDec * 1) ? $('#' + io.mDec).val() * 1 : io.mDec * 1;/* decimal places */
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
	$.fn.autoNumeric.defaults = {/* plugin defaults */
		aNum: '0123456789',/*  allowed  numeric values */
		aNeg: '',/* allowed negative sign / character */
		aSep: ',',/* allowed thousand separator character */
		aDec: '.',/* allowed decimal separator character */
		aSign: '',/* allowed currency symbol */
		pSign: 'p',/* placement of currency sign prefix or suffix */
		mNum: 9,/* max number of numerical characters to the left of the decimal */
		mDec: 2,/* max number of decimal places */
		dGroup: 3,/* digital grouping for the thousand separator used in Format */
		mRound: 'S',/* method used for rounding */
		aPad: true/* true= always Pad decimals with zeros, false=does not pad with zeros. If the value is 1000, mDec=2 and aPad=true, the output will be 1000.00, if aPad=false the output will be 1000 (no decimals added) Special Thanks to Jonas Johansson */
	};
})(jQuery);