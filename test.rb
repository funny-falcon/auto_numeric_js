# encoding: utf-8
require 'rubygems'
require 'haml'
require 'sinatra'
require "sinatra/reloader"

template :index do
<<-EOF
!!!
%html
	%head
		%script(type="text/javascript" src='jquery-1.4.3.js')
		%script(type="text/javascript" src='autoNumeric.js')
		:css
			#number {text-align: right}
			label {display: block}
		:javascript
			function log(str) {
				$('#log').append('<span>'+str+'</span><br/>');
			}
	%body
		%form(method="post")
			%p
				%label(for="meta") options for autoNumeric
				%textarea#meta(name="meta" cols=60 rows=4)&= meta
			%p
				%label(for="js") execute javascript
				%textarea#js(name="js" cols=60 rows=4)&= js
			%p
				%input#number(type="text" name="number" value=number)
			%button#apply apply
			%input(type="submit" value="reload")
		#log
			
		:javascript
			function applyMeta(){
				var meta = $('#meta').val();
				meta = eval("("+meta+")");
				$('#number').autoNumeric(meta);
				eval($('#js').val());
			}
			$('#apply').click(function(){
				var $number = $('#number');
				var val = $number.val();
				var hnumber = $number.parent().html();
				$number.parent().html(hnumber);
				$('#number').val(val)
				applyMeta();
				return false;
			});
			applyMeta();
		-#end
EOF
end

default_params = { :meta => "{aSep: ' ', aForm: true, mNum: 10, mDec: 0}", :number => 1000000, :js => '' }
get '/' do
  haml :index, :locals => default_params
end

post '/' do
  locals = default_params
  params.each{|k, v| locals[k.to_sym] = v}
  haml :index, :locals => locals
end

